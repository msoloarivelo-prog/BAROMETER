/*
 * Server mode: login, loading the workspace from the server (PostgreSQL)
 * and sending changes back.
 *
 * The app keeps working without a server: opened from a file (offline
 * build), from GitHub Pages or from any static host, /api/me does not answer
 * and the app stays in local mode (browser storage only).
 *
 * In server mode the browser keeps a cache of the workspace (separate from
 * the local-mode data) so work continues when the connection drops; changes
 * are sent when it is back. Each organisation carries a version number: if
 * someone else saved it in between, the server answers 409 and the two
 * copies are merged (assessments missing on either side are kept, the local
 * copy wins for the rest).
 */
(function (root) {
  'use strict';

  var CACHE_KEY = 'diag-server-cache:v1';
  var isNode = typeof module !== 'undefined' && module.exports;
  var Store = isNode ? require('./storage.js') : root.BarometerStorage;

  var Sync = {
    mode: 'local', // local | login | server
    user: null,
    offline: false,
    state: 'idle', // idle | pending | syncing | synced | offline | error
    lastError: null
  };

  var App = null;
  var versions = {};   // orgId -> server version
  var synced = {};     // orgId -> JSON of the last copy known to be on the server
  var settingsSynced = null;
  var timer = null;
  var retryTimer = null;
  var flushing = null;
  var again = false;
  var lastRefresh = 0;

  function ApiError(status, body) {
    this.status = status;
    this.body = body || {};
    this.message = (body && body.error) || 'http-' + status;
  }

  /** Calls the API. Rejects with ApiError (HTTP error) or TypeError (network). */
  function api(method, path, body, raw) {
    var opts = { method: method, credentials: 'same-origin', headers: { 'X-Requested-With': 'diag' } };
    if (body !== undefined) {
      if (raw) { opts.body = body; opts.headers['Content-Type'] = raw; }
      else { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
    }
    return fetch('api/' + path, opts).then(function (res) {
      var type = res.headers.get('content-type') || '';
      var parse = type.indexOf('json') >= 0 ? res.json() : Promise.resolve(null);
      return parse.then(function (data) {
        if (!res.ok) throw new ApiError(res.status, data);
        return data;
      });
    });
  }
  Sync.api = api;
  Sync.ApiError = ApiError;

  // ---------------------------------------------------------------- cache

  function readCache() {
    try { return JSON.parse(root.localStorage.getItem(CACHE_KEY)) || null; } catch (e) { return null; }
  }

  function writeCache() {
    if (Sync.mode !== 'server' || !App) return true;
    try {
      root.localStorage.setItem(CACHE_KEY, JSON.stringify({
        user: Sync.user, ws: App.ws, versions: versions, synced: synced, settingsSynced: settingsSynced
      }));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearCache() {
    try { root.localStorage.removeItem(CACHE_KEY); } catch (e) { /* ignored */ }
  }

  function fp(org) { return JSON.stringify(org); }

  function serverSettings(s) { return JSON.stringify({ indexMethod: s.indexMethod, weights: s.weights }); }

  /** An empty placeholder organisation that was never saved: not worth sending. */
  function isBlank(org) {
    if (versions[org.id] !== undefined && versions[org.id] !== null) return false;
    if (org.organization.name || org.organization.acronym || org.assessments.length !== 1) return false;
    var a = org.assessments[0];
    return !Object.keys(a.answers).length && !a.plan.activities.length;
  }

  function isDirty(org) { return synced[org.id] !== fp(org) && !isBlank(org); }

  Sync.pendingCount = function () {
    if (Sync.mode !== 'server' || !App) return 0;
    return App.ws.orgs.filter(isDirty).length + (canEditSettings() && serverSettings(App.ws.settings) !== settingsSynced ? 1 : 0);
  };

  function canEditSettings() { return Sync.user && Sync.user.role === 'facilitator'; }

  // ---------------------------------------------------------------- start

  /** Decides the mode: local (no server), login (server, signed out) or server. */
  function detect() {
    if (root.location.protocol === 'file:' || typeof fetch !== 'function') return Promise.resolve({ mode: 'local' });
    return fetch('api/me', { credentials: 'same-origin' }).then(function (res) {
      var type = res.headers.get('content-type') || '';
      if (type.indexOf('json') < 0) return { mode: 'local' };
      return res.json().then(function (data) {
        if (!data || !data.server) return { mode: 'local' };
        if (res.status === 200 && data.user) return { mode: 'server', user: data.user };
        return { mode: 'login' };
      });
    }, function () {
      var cache = readCache();
      return cache && cache.user ? { mode: 'server', user: cache.user, offline: true } : { mode: 'local' };
    });
  }

  /** Builds the workspace from the server copy and the local cache. */
  function buildWorkspace(remote, cache, lang) {
    var mine = cache && cache.user && cache.user.id === Sync.user.id ? cache : null;
    versions = {};
    synced = {};
    var cachedOrgs = {};
    if (mine) {
      mine.ws.orgs.forEach(function (o) { cachedOrgs[o.id] = o; });
    }
    var orgs = [];
    remote.orgs.forEach(function (r) {
      var local = cachedOrgs[r.id];
      var data;
      try { data = Store.normalizeOrg(r.data); } catch (e) { return; }
      var remoteFp = fp(data);
      if (local && mine.synced[r.id] !== fp(local)) {
        // Unsent local changes: keep them (they are sent next, merged on conflict).
        orgs.push(local);
        versions[r.id] = mine.versions[r.id];
        synced[r.id] = mine.synced[r.id];
      } else {
        orgs.push(data);
        versions[r.id] = r.version;
        synced[r.id] = remoteFp;
      }
      delete cachedOrgs[r.id];
    });
    // Organisations created offline and never sent.
    if (mine) {
      Object.keys(cachedOrgs).forEach(function (id) {
        if (mine.versions[id] === undefined || mine.versions[id] === null) orgs.push(cachedOrgs[id]);
      });
    }
    var settings = Store.normalizeSettings(remote.settings);
    settings.lang = lang;
    settingsSynced = serverSettings(settings);
    if (mine && mine.settingsSynced !== serverSettings(mine.ws.settings) && canEditSettings()) {
      settings.indexMethod = mine.ws.settings.indexMethod;
      settings.weights = mine.ws.settings.weights;
    }
    var ws = Store.newWorkspace();
    ws.settings = settings;
    if (orgs.length) ws.orgs = orgs;
    if (!ws.orgs.length) ws.orgs = [Store.newOrg('')];
    var active = mine && mine.ws.activeOrgId;
    ws.activeOrgId = ws.orgs.some(function (o) { return o.id === active; }) ? active : ws.orgs[0].id;
    return ws;
  }

  function loadServer(lang) {
    var cache = readCache();
    return api('GET', 'workspace').then(function (remote) {
      App.ws = buildWorkspace(remote, cache, lang);
      Sync.offline = false;
      writeCache();
      lastRefresh = Date.now();
    }, function (e) {
      if (e instanceof ApiError && e.status === 401) { Sync.mode = 'login'; return; }
      // Network problem: work from the cache.
      if (cache && cache.user && cache.user.id === Sync.user.id) {
        App.ws = Store.normalizeWorkspace(cache.ws);
        App.ws.settings.lang = lang;
        versions = cache.versions || {};
        synced = cache.synced || {};
        settingsSynced = cache.settingsSynced || null;
        Sync.offline = true;
        Sync.state = 'offline';
      } else {
        throw e;
      }
    });
  }

  var listening = false;

  /** Once signed in: sends pending changes and watches the connection. */
  function ready() {
    if (Sync.mode !== 'server') return;
    if (Sync.pendingCount()) Sync.schedule(200);
    if (listening) return;
    listening = true;
    root.addEventListener('online', function () { Sync.schedule(100); });
    root.addEventListener('beforeunload', function (e) {
      if (Sync.mode === 'server' && Sync.pendingCount()) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  Sync.start = function (app) {
    App = app;
    var lang = App.ws.settings.lang;
    return detect().then(function (d) {
      Sync.mode = d.mode;
      if (d.mode !== 'server') return;
      Sync.user = d.user;
      return loadServer(lang).then(ready);
    })['catch'](function (e) {
      Sync.mode = 'login';
      Sync.lastError = e;
    });
  };

  // ---------------------------------------------------------------- login / logout

  Sync.login = function (email, password) {
    var lang = App.ws.settings.lang;
    return api('POST', 'login', { email: email, password: password }).then(function (data) {
      Sync.user = data.user;
      Sync.mode = 'server';
      return loadServer(lang).then(ready);
    });
  };

  Sync.logout = function () {
    var done = function () {
      return api('POST', 'logout')['catch'](function () {}).then(function () {
        clearCache();
        Sync.mode = 'login';
        Sync.user = null;
      });
    };
    return Sync.flush().then(done, done);
  };

  // ---------------------------------------------------------------- sending changes

  Sync.schedule = function (delay) {
    if (Sync.mode !== 'server') return;
    writeCache();
    clearTimeout(timer);
    if (Sync.pendingCount()) setState('pending');
    timer = setTimeout(function () { Sync.flush(); }, delay === undefined ? 1200 : delay);
  };

  function byId(list) {
    var out = {};
    (list || []).forEach(function (x) { out[x.id] = x; });
    return out;
  }

  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  /**
   * Three-way merge of an organisation edited here (local) and elsewhere
   * (remote), from the last copy both had (base). What changed here since
   * base is kept (profile field by field, assessments one by one); everything
   * else comes from the remote copy. Without a base, nothing is lost:
   * assessments of both sides are kept, the local copy wins on the rest.
   */
  function merge(local, remote, base) {
    var out = JSON.parse(JSON.stringify(remote));
    if (!base) {
      out = JSON.parse(JSON.stringify(local));
      var have = byId(local.assessments);
      remote.assessments.forEach(function (a) { if (!have[a.id]) out.assessments.push(a); });
      return out;
    }
    Object.keys(local.organization).forEach(function (k) {
      if (local.organization[k] !== (base.organization || {})[k]) out.organization[k] = local.organization[k];
    });
    var L = byId(local.assessments);
    var B = byId(base.assessments);
    var R = byId(remote.assessments);
    var result = [];
    var seen = {};
    remote.assessments.forEach(function (r) {
      seen[r.id] = true;
      var l = L[r.id];
      if (!l) {
        // Deleted here: drop it unless it changed elsewhere since.
        if (B[r.id] && same(B[r.id], r)) return;
        result.push(r);
      } else {
        result.push(B[r.id] && same(B[r.id], l) ? r : l);
      }
    });
    local.assessments.forEach(function (l) {
      if (seen[l.id]) return;
      // Not on the server: new here (keep), or deleted elsewhere (keep only if changed here).
      if (!B[l.id] || !same(B[l.id], l)) result.push(l);
    });
    if (!result.length) result = local.assessments.slice();
    out.assessments = result;
    out.activeAssessmentId = result.some(function (a) { return a.id === local.activeAssessmentId; }) ? local.activeAssessmentId : result[result.length - 1].id;
    out.updatedAt = local.updatedAt > remote.updatedAt ? local.updatedAt : remote.updatedAt;
    return out;
  }
  Sync.merge = merge;

  function replaceOrg(org) {
    for (var i = 0; i < App.ws.orgs.length; i++) {
      if (App.ws.orgs[i].id === org.id) { App.ws.orgs[i] = org; return; }
    }
  }

  function pushOrg(org, attempt) {
    var body = fp(org);
    var base = versions[org.id] === undefined ? null : versions[org.id];
    return api('PUT', 'orgs/' + encodeURIComponent(org.id), { data: JSON.parse(body), baseVersion: base }).then(function (r) {
      versions[org.id] = r.version;
      synced[org.id] = body;
    }, function (e) {
      if (e instanceof ApiError && e.status === 409 && e.body && e.body.data && attempt < 3) {
        var current = App.ws.orgs.filter(function (o) { return o.id === org.id; })[0] || org;
        var base = null;
        try { base = synced[org.id] ? JSON.parse(synced[org.id]) : null; } catch (x) { base = null; }
        var remoteOrg = Store.normalizeOrg(e.body.data);
        var merged = Store.normalizeOrg(merge(current, remoteOrg, base));
        // The server copy becomes the new base.
        synced[org.id] = fp(remoteOrg);
        replaceOrg(merged);
        versions[org.id] = e.body.version;
        Sync.merged = true;
        return pushOrg(merged, attempt + 1);
      }
      throw e;
    });
  }

  function setState(state) {
    Sync.state = state;
    if (App && App.syncStatus) App.syncStatus();
  }

  /** Sends every changed organisation (and the settings). Resolves when done. */
  Sync.flush = function () {
    if (Sync.mode !== 'server') return Promise.resolve();
    if (flushing) { again = true; return flushing; }
    clearTimeout(timer);
    var orgs = App.ws.orgs.filter(isDirty);
    var sendSettings = canEditSettings() && serverSettings(App.ws.settings) !== settingsSynced;
    if (!orgs.length && !sendSettings) { setState(Sync.offline ? 'offline' : 'synced'); return Promise.resolve(); }
    setState('syncing');
    Sync.merged = false;
    var chain = Promise.resolve();
    orgs.forEach(function (org) { chain = chain.then(function () { return pushOrg(org, 0); }); });
    if (sendSettings) {
      var s = serverSettings(App.ws.settings);
      chain = chain.then(function () { return api('PUT', 'settings', JSON.parse(s)); }).then(function () { settingsSynced = s; });
    }
    flushing = chain.then(function () {
      Sync.offline = false;
      Sync.lastError = null;
      clearTimeout(retryTimer);
      writeCache();
      setState(Sync.pendingCount() ? 'pending' : 'synced');
      if (Sync.merged && App.renderHeader) App.renderHeader();
    }, function (e) {
      writeCache();
      Sync.lastError = e;
      if (e instanceof ApiError && e.status === 401) {
        Sync.mode = 'login';
        setState('error');
        if (App.render) App.render();
        return;
      }
      if (e instanceof ApiError) { setState('error'); return; }
      Sync.offline = true;
      setState('offline');
      clearTimeout(retryTimer);
      retryTimer = setTimeout(function () { Sync.flush(); }, 30000);
    }).then(function () {
      flushing = null;
      if (again) { again = false; return Sync.flush(); }
    });
    return flushing;
  };

  /** Gets changes made elsewhere (other users) for organisations without local changes. */
  Sync.refresh = function (force) {
    if (Sync.mode !== 'server' || flushing) return Promise.resolve(false);
    if (!force && Date.now() - lastRefresh < 30000) return Promise.resolve(false);
    lastRefresh = Date.now();
    return api('GET', 'workspace').then(function (remote) {
      var changed = false;
      var seen = {};
      remote.orgs.forEach(function (r) {
        seen[r.id] = true;
        var local = App.ws.orgs.filter(function (o) { return o.id === r.id; })[0];
        if (!local) {
          App.ws.orgs.push(Store.normalizeOrg(r.data));
          changed = true;
        } else if (versions[r.id] !== r.version && !isDirty(local)) {
          var fresh = Store.normalizeOrg(r.data);
          fresh.activeAssessmentId = fresh.assessments.some(function (a) { return a.id === local.activeAssessmentId; }) ? local.activeAssessmentId : fresh.activeAssessmentId;
          replaceOrg(fresh);
          changed = true;
        } else {
          return;
        }
        versions[r.id] = r.version;
        synced[r.id] = fp(App.ws.orgs.filter(function (o) { return o.id === r.id; })[0]);
      });
      // Deleted on the server (and not changed here since).
      App.ws.orgs = App.ws.orgs.filter(function (o) {
        var gone = !seen[o.id] && versions[o.id] !== undefined && versions[o.id] !== null && !isDirty(o);
        if (gone) { changed = true; delete versions[o.id]; delete synced[o.id]; }
        return !gone;
      });
      if (!App.ws.orgs.length) App.ws.orgs = [Store.newOrg('')];
      if (!App.ws.orgs.some(function (o) { return o.id === App.ws.activeOrgId; })) App.ws.activeOrgId = App.ws.orgs[0].id;
      var s = Store.normalizeSettings(remote.settings);
      if (serverSettings(App.ws.settings) === settingsSynced && serverSettings(s) !== settingsSynced) {
        App.ws.settings.indexMethod = s.indexMethod;
        App.ws.settings.weights = s.weights;
        settingsSynced = serverSettings(s);
        changed = true;
      }
      Sync.offline = false;
      writeCache();
      return changed;
    })['catch'](function () { return false; });
  };

  /** Deletes an organisation on the server (needs a connection). */
  Sync.deleteOrg = function (id) {
    if (versions[id] === undefined || versions[id] === null) return Promise.resolve();
    return api('DELETE', 'orgs/' + encodeURIComponent(id)).then(function () {
      delete versions[id];
      delete synced[id];
    });
  };

  /** Forgets local tracking for an organisation (after deleting it). */
  Sync.forget = function (id) { delete versions[id]; delete synced[id]; writeCache(); };

  Sync.saveCache = writeCache;

  if (isNode) module.exports = Sync;
  else root.BarometerSync = Sync;
})(this);
