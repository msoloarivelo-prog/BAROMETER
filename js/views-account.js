/*
 * Server mode only: login page, "My account" page (password change, sign
 * out) and account management in the Facilitator space.
 */
(function () {
  'use strict';

  var App = window.App;
  var Sync = App.Sync;
  var esc = App.esc;
  var t = App.t;
  var A = App.actions;

  if (!Sync) return;

  /** Random password without look-alike characters (0/O, 1/l/I). */
  App.generatePassword = function () {
    var chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var bytes = new Uint8Array(10);
    window.crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (b) { return chars[b % chars.length]; }).join('');
  };

  function errorText(e) {
    return App.sentence(e instanceof Sync.ApiError ? App.errMsg(e) : t('err.network'));
  }

  // ---------------------------------------------------------------- login

  App.views.login = function () {
    App.setView(
      '<section class="card login-card">' +
        '<h1>' + esc(t('login.title')) + '</h1>' +
        '<p class="muted">' + esc(t('login.intro')) + '</p>' +
        '<form data-submit="login" class="login-form" novalidate>' +
          '<label class="field"><span>' + esc(t('login.email')) + '</span><input type="email" name="email" autocomplete="username" required autofocus></label>' +
          '<label class="field"><span>' + esc(t('login.password')) + '</span><input type="password" name="password" autocomplete="current-password" required></label>' +
          '<p class="login-error" role="alert"></p>' +
          '<button class="btn primary" type="submit">' + esc(t('login.submit')) + '</button>' +
        '</form>' +
        '<p class="muted small">' + esc(t('login.help')) + '</p>' +
      '</section>');
    var first = App.viewEl.querySelector('input[name=email]');
    if (first) first.focus();
  };

  A.login = function (form) {
    var err = form.querySelector('.login-error');
    var btn = form.querySelector('button[type=submit]');
    var email = form.elements.email.value.trim();
    var password = form.elements.password.value;
    err.textContent = '';
    if (!email || !password) { err.textContent = t('login.err.missing'); return; }
    btn.disabled = true;
    Sync.login(email, password).then(function () {
      if (location.hash !== '#home') history.replaceState(null, '', '#home');
      App.afterLogin();
    }, function (e) {
      btn.disabled = false;
      if (e instanceof Sync.ApiError && e.status === 401) err.textContent = t('login.err.bad');
      else if (e instanceof Sync.ApiError && e.status === 429) err.textContent = t('login.err.many');
      else err.textContent = errorText(e);
      form.elements.password.value = '';
      form.elements.password.focus();
    });
  };

  A.logout = function () {
    if (Sync.pendingCount() && Sync.offline && !confirm(t('account.confirmLogoutPending'))) return;
    Sync.logout().then(function () {
      location.hash = '#home';
      location.reload();
    });
  };

  // ---------------------------------------------------------------- my account

  App.views.account = function () {
    var u = Sync.user;
    var org = u.orgId ? App.ws.orgs.filter(function (o) { return o.id === u.orgId; })[0] : null;
    App.setView(
      '<h1>' + esc(t('account.title')) + '</h1>' +
      '<section class="card"><dl class="account-facts">' +
        '<div><dt>' + esc(t('account.name')) + '</dt><dd>' + esc(u.name || '—') + '</dd></div>' +
        '<div><dt>' + esc(t('account.email')) + '</dt><dd>' + esc(u.email) + '</dd></div>' +
        '<div><dt>' + esc(t('account.role')) + '</dt><dd>' + esc(t('account.role.' + u.role)) + '</dd></div>' +
        (org ? '<div><dt>' + esc(t('account.org')) + '</dt><dd>' + esc(App.orgName(org)) + '</dd></div>' : '') +
      '</dl><div class="actions"><button class="btn" data-click="logout">' + esc(t('account.logout')) + '</button></div></section>' +
      '<section class="card"><h2>' + esc(t('account.password')) + '</h2>' +
        '<form data-submit="password-change" class="form-grid narrow" novalidate>' +
          '<label class="field"><span>' + esc(t('account.current')) + '</span><input type="password" name="current" autocomplete="current-password" required></label>' +
          '<label class="field"><span>' + esc(t('account.new')) + '</span><input type="password" name="next" autocomplete="new-password" minlength="8" required></label>' +
          '<label class="field"><span>' + esc(t('account.confirm')) + '</span><input type="password" name="confirm" autocomplete="new-password" minlength="8" required></label>' +
          '<p class="form-message" role="status"></p>' +
          '<div><button class="btn primary" type="submit">' + esc(t('account.save')) + '</button></div>' +
        '</form></section>');
  };

  A['password-change'] = function (form) {
    var msg = form.querySelector('.form-message');
    var f = form.elements;
    msg.className = 'form-message';
    if (f.next.value !== f.confirm.value) { msg.textContent = t('account.mismatch'); msg.classList.add('err'); return; }
    Sync.api('POST', 'password', { current: f.current.value, next: f.next.value }).then(function () {
      form.reset();
      msg.textContent = t('account.changed');
      msg.classList.add('ok');
    }, function (e) {
      msg.textContent = errorText(e);
      msg.classList.add('err');
    });
  };

  // ---------------------------------------------------------------- accounts (facilitator)

  function orgOptions(selected) {
    return '<option value="">' + esc(t('accounts.noOrg')) + '</option>' + App.ws.orgs.map(function (o) {
      return '<option value="' + esc(o.id) + '"' + (o.id === selected ? ' selected' : '') + '>' + esc(App.orgName(o)) + '</option>';
    }).join('');
  }

  /** Card shown in the Facilitator space (server mode). */
  App.accountsCard = function () {
    if (!App.serverMode() || Sync.user.role !== 'facilitator') return '';
    return '<section class="card no-print" id="accounts"><h2>' + esc(t('accounts.title')) + '</h2>' +
      '<p class="muted">' + esc(t('accounts.intro')) + '</p>' +
      '<div id="accounts-list"><p class="muted">' + esc(t('accounts.loading')) + '</p></div>' +
      '<h3>' + esc(t('accounts.new')) + '</h3>' +
      '<form data-submit="account-create" class="form-grid account-form" novalidate>' +
        '<label class="field"><span>' + esc(t('account.name')) + '</span><input type="text" name="name" autocomplete="off"></label>' +
        '<label class="field"><span>' + esc(t('account.email')) + '</span><input type="email" name="email" autocomplete="off" required></label>' +
        '<label class="field"><span>' + esc(t('account.role')) + '</span><select name="role" data-on="account-role">' +
          '<option value="org">' + esc(t('account.role.org')) + '</option>' +
          '<option value="facilitator">' + esc(t('account.role.facilitator')) + '</option></select></label>' +
        '<label class="field account-org"><span>' + esc(t('account.org')) + '</span><select name="orgId">' + orgOptions(App.ws.activeOrgId) + '</select></label>' +
        '<label class="field"><span>' + esc(t('accounts.initialPassword')) + '</span>' +
          '<span class="input-with-button"><input type="text" name="password" autocomplete="off" value="' + App.generatePassword() + '">' +
          '<button type="button" class="btn small" data-click="account-generate">' + esc(t('accounts.generate')) + '</button></span></label>' +
        '<p class="form-message" role="status"></p>' +
        '<div><button class="btn primary" type="submit">' + esc(t('accounts.create')) + '</button></div>' +
      '</form></section>';
  };

  /** Loads the account list into the card. */
  App.loadAccounts = function () {
    var slot = document.getElementById('accounts-list');
    if (!slot) return;
    Sync.api('GET', 'users').then(function (data) {
      var names = {};
      App.ws.orgs.forEach(function (o) { names[o.id] = App.orgName(o); });
      if (!document.body.contains(slot)) return;
      slot.innerHTML = !data.users.length ? '<p class="muted">' + esc(t('accounts.none')) + '</p>' :
        '<div class="table-wrap"><table class="table accounts"><thead><tr>' +
        '<th>' + esc(t('account.name')) + '</th><th>' + esc(t('account.email')) + '</th><th>' + esc(t('account.role')) + '</th>' +
        '<th>' + esc(t('account.org')) + '</th><th>' + esc(t('account.status')) + '</th><th>' + esc(t('account.lastLogin')) + '</th><th></th></tr></thead><tbody>' +
        data.users.map(function (u) {
          var self = u.id === Sync.user.id;
          return '<tr' + (u.active ? '' : ' class="inactive"') + '><td>' + esc(u.name || '—') + (self ? ' <span class="muted small">' + esc(t('accounts.you')) + '</span>' : '') + '</td>' +
            '<td>' + esc(u.email) + '</td><td>' + esc(t('account.role.' + u.role)) + '</td>' +
            '<td>' + esc(u.orgId ? (names[u.orgId] || u.orgId) : '—') + '</td>' +
            '<td>' + esc(t(u.active ? 'account.active' : 'account.disabled')) + '</td>' +
            '<td class="nowrap">' + esc(u.lastLogin ? App.dateStr(new Date(u.lastLogin)) : '—') + '</td>' +
            '<td class="row-actions">' +
              '<button class="btn small" data-click="account-reset" data-id="' + u.id + '" data-email="' + esc(u.email) + '">' + esc(t('accounts.reset')) + '</button> ' +
              (self ? '' :
                '<button class="btn small" data-click="account-toggle" data-id="' + u.id + '" data-active="' + (u.active ? '0' : '1') + '">' + esc(t(u.active ? 'accounts.disable' : 'accounts.enable')) + '</button> ' +
                '<button class="btn small ghost danger" data-click="account-delete" data-id="' + u.id + '" data-email="' + esc(u.email) + '" title="' + esc(t('delete')) + '">✕</button>') +
            '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }, function (e) {
      slot.innerHTML = '<p class="notice">' + esc(errorText(e)) + '</p>';
    });
  };

  A['account-role'] = function (el) {
    var form = el.form;
    form.querySelector('.account-org').hidden = el.value !== 'org';
  };

  A['account-generate'] = function (el) {
    el.closest('form').elements.password.value = App.generatePassword();
  };

  A['account-create'] = function (form) {
    var f = form.elements;
    var msg = form.querySelector('.form-message');
    msg.className = 'form-message';
    msg.textContent = '';
    var body = { name: f.name.value.trim(), email: f.email.value.trim(), role: f.role.value, orgId: f.role.value === 'org' ? f.orgId.value : null, password: f.password.value };
    // The organisation must be on the server before an account is linked to it.
    Sync.flush().then(function () { return Sync.api('POST', 'users', body); }).then(function (data) {
      alert(t('accounts.created', { email: data.user.email, password: body.password }));
      form.reset();
      f.password.value = App.generatePassword();
      form.querySelector('.account-org').hidden = false;
      App.loadAccounts();
    }, function (e) {
      msg.textContent = errorText(e);
      msg.classList.add('err');
    });
  };

  A['account-reset'] = function (el) {
    if (!confirm(t('accounts.confirmReset', { email: el.dataset.email }))) return;
    var password = App.generatePassword();
    Sync.api('PATCH', 'users/' + el.dataset.id, { password: password }).then(function () {
      alert(t('accounts.resetDone', { email: el.dataset.email, password: password }));
    }, function (e) { alert(errorText(e)); });
  };

  A['account-toggle'] = function (el) {
    Sync.api('PATCH', 'users/' + el.dataset.id, { active: el.dataset.active === '1' }).then(App.loadAccounts, function (e) { alert(errorText(e)); });
  };

  A['account-delete'] = function (el) {
    if (!confirm(t('accounts.confirmDelete', { email: el.dataset.email }))) return;
    Sync.api('DELETE', 'users/' + el.dataset.id).then(App.loadAccounts, function (e) { alert(errorText(e)); });
  };
})();
