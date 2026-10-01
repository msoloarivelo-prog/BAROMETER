/*
 * Evidence files (PDF) stored in the browser's IndexedDB.
 *
 * Assessments only keep metadata ({ id, name, size, uploadedAt } per
 * indicator in `assessment.evidenceFiles`); the PDF content lives in
 * IndexedDB, which allows much larger storage than localStorage.
 * Organisation exports and workspace backups embed the files (base64) so
 * they travel with the data to the facilitator.
 */
(function (root) {
  'use strict';

  var DB_NAME = 'barometre-files';
  var STORE = 'files';
  var MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file
  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!root.indexedDB) { reject(new Error('indexeddb-unavailable')); return; }
      var req = root.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE, { keyPath: 'id' }); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var store = t.objectStore(STORE);
        var result = fn(store);
        t.oncomplete = function () { resolve(result && result.result !== undefined ? result.result : result); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  function uid() { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  /** Checks that a File is a PDF (extension/type and "%PDF" signature) and not too large. */
  function validatePdf(file) {
    return new Promise(function (resolve, reject) {
      var looksPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
      if (!looksPdf) { reject(new Error('not-pdf')); return; }
      if (file.size > MAX_SIZE) { reject(new Error('too-large')); return; }
      var reader = new FileReader();
      reader.onload = function () {
        var sig = new Uint8Array(reader.result);
        if (String.fromCharCode(sig[0], sig[1], sig[2], sig[3]) !== '%PDF') reject(new Error('not-pdf'));
        else resolve();
      };
      reader.onerror = function () { reject(new Error('not-pdf')); };
      reader.readAsArrayBuffer(file.slice(0, 4));
    });
  }

  // Server mode: files are stored in the database through the API.
  var remote = null;

  function remoteFetch(method, path, body) {
    var opts = { method: method, credentials: 'same-origin', headers: { 'X-Requested-With': 'diag' } };
    if (body) { opts.body = body; opts.headers['Content-Type'] = 'application/pdf'; }
    return fetch('api/' + path, opts).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (d) { throw new Error((d && d.error) || 'store'); }, function () { throw new Error('store'); });
      }
      return res;
    });
  }

  function remoteUpload(file, orgId, id, name) {
    var q = 'files?org=' + encodeURIComponent(orgId) + '&name=' + encodeURIComponent(name || file.name || 'evidence.pdf') + (id ? '&id=' + encodeURIComponent(id) : '');
    return remoteFetch('POST', q, file).then(function (res) { return res.json(); });
  }

  /** Switches to server storage (called by the app in server mode). */
  function useServer(on) { remote = on ? {} : null; }

  /** Stores a PDF and returns its metadata. */
  function add(file, orgId) {
    if (remote) {
      return validatePdf(file).then(function () { return remoteUpload(file, orgId); });
    }
    return validatePdf(file).then(function () {
      var meta = { id: uid(), name: file.name, size: file.size, uploadedAt: new Date().toISOString() };
      var record = { id: meta.id, name: meta.name, size: meta.size, type: 'application/pdf', uploadedAt: meta.uploadedAt, data: file };
      return tx('readwrite', function (s) { s.put(record); }).then(function () { return meta; });
    });
  }

  function get(id) {
    if (remote) {
      return remoteFetch('GET', 'files/' + encodeURIComponent(id)).then(function (res) {
        var disp = res.headers.get('content-disposition') || '';
        var m = /filename\*=UTF-8''([^;]+)/i.exec(disp);
        var name = m ? decodeURIComponent(m[1]) : 'evidence.pdf';
        return res.blob().then(function (blob) { return { id: id, name: name, size: blob.size, data: blob }; });
      }, function (e) { if (e.message === 'not-found') return null; throw e; });
    }
    return tx('readonly', function (s) { return s.get(id); });
  }

  function remove(id) {
    if (remote) return remoteFetch('DELETE', 'files/' + encodeURIComponent(id));
    return tx('readwrite', function (s) { s['delete'](id); });
  }

  /**
   * Shows a stored PDF in an in-page viewer (works offline and from file://,
   * where opening blob URLs in a new tab is blocked) with a download button.
   */
  function view(id, labels) {
    return get(id).then(function (rec) {
      if (!rec) throw new Error('missing');
      var url = URL.createObjectURL(new Blob([rec.data], { type: 'application/pdf' }));
      var overlay = document.createElement('div');
      overlay.className = 'pdf-viewer';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      var bar = document.createElement('div');
      bar.className = 'pdf-viewer-bar';
      var title = document.createElement('strong');
      title.textContent = rec.name;
      var dl = document.createElement('a');
      dl.className = 'btn small';
      dl.href = url;
      dl.download = rec.name;
      dl.textContent = '⤓ ' + labels.download;
      var close = document.createElement('button');
      close.className = 'btn small';
      close.type = 'button';
      close.textContent = '✕ ' + labels.close;
      var frame = document.createElement('iframe');
      frame.src = url;
      frame.title = rec.name;
      bar.appendChild(title);
      bar.appendChild(dl);
      bar.appendChild(close);
      overlay.appendChild(bar);
      overlay.appendChild(frame);
      function done() {
        overlay.remove();
        URL.revokeObjectURL(url);
        document.removeEventListener('keydown', onKey);
      }
      function onKey(e) { if (e.key === 'Escape') done(); }
      close.addEventListener('click', done);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) done(); });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(overlay);
      close.focus();
    });
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result).split(',')[1] || ''); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(blob);
    });
  }

  function base64ToBlob(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: 'application/pdf' });
  }

  /** File ids referenced by organisations. */
  function idsOf(orgs) {
    var ids = [];
    orgs.forEach(function (o) {
      o.assessments.forEach(function (a) {
        Object.keys(a.evidenceFiles || {}).forEach(function (cid) {
          a.evidenceFiles[cid].forEach(function (f) { ids.push(f.id); });
        });
      });
    });
    return ids;
  }

  /** Embeds the referenced files (base64) for export. Missing files are skipped. */
  function exportFiles(orgs) {
    return Promise.all(idsOf(orgs).map(function (id) {
      return get(id).then(function (rec) {
        if (!rec) return null;
        return blobToBase64(rec.data).then(function (b64) {
          return { id: rec.id, name: rec.name, size: rec.size, uploadedAt: rec.uploadedAt, data: b64 };
        });
      })['catch'](function () { return null; });
    })).then(function (list) { return list.filter(Boolean); });
  }

  /** Organisation of each referenced file id. */
  function ownersOf(orgs) {
    var out = {};
    orgs.forEach(function (o) {
      o.assessments.forEach(function (a) {
        Object.keys(a.evidenceFiles || {}).forEach(function (cid) {
          a.evidenceFiles[cid].forEach(function (f) { out[f.id] = o.id; });
        });
      });
    });
    return out;
  }

  /**
   * Restores embedded files from an import. In server mode `orgs` (the
   * imported organisations) tells which organisation each file belongs to;
   * the organisations must already be on the server.
   */
  function importFiles(list, orgs) {
    if (!Array.isArray(list) || !list.length) return Promise.resolve(0);
    if (remote) {
      var owners = ownersOf(orgs || []);
      var chain = Promise.resolve(0);
      list.forEach(function (f) {
        if (!f || typeof f.id !== 'string' || typeof f.data !== 'string' || !owners[f.id]) return;
        chain = chain.then(function (n) {
          return remoteUpload(base64ToBlob(f.data), owners[f.id], f.id, f.name).then(function () { return n + 1; });
        });
      });
      return chain;
    }
    return tx('readwrite', function (s) {
      list.forEach(function (f) {
        if (!f || typeof f.id !== 'string' || typeof f.data !== 'string') return;
        s.put({ id: f.id, name: String(f.name || 'evidence.pdf'), size: Number(f.size) || 0, type: 'application/pdf', uploadedAt: f.uploadedAt || '', data: base64ToBlob(f.data) });
      });
    }).then(function () { return list.length; });
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  }

  root.BarometerFiles = {
    MAX_SIZE: MAX_SIZE,
    useServer: useServer,
    add: add,
    get: get,
    remove: remove,
    view: view,
    exportFiles: exportFiles,
    importFiles: importFiles,
    idsOf: idsOf,
    formatSize: formatSize
  };
})(this);
