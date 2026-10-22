/* ANALICA - Tahap 1: login, daftar, logout, sesi tetap aktif.
   Tampilan login mengikuti desain buatan pemilik (daun + kaca buram).
   Data transaksi BELUM disinkronkan ke Supabase (itu Tahap 3).
   Hanya memakai publishable key. JANGAN pernah taruh service_role/secret key di sini. */
(function () {
  var SUPABASE_URL = 'https://bhocumtlymattxqxhpik.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_JGeJ6Qd1nQg1f_89K05UBQ_WqXTPELh';

  /* Semua teks yang tampil ada di sini, gampang diganti. */
  var TXT = {
    tag: 'Catat. Kelola. Raih Tujuan.',
    inTitle: 'Welcome Back',
    inIntro: 'Continue your journey to better financial management.',
    upTitle: 'Create Account',
    upIntro: 'Start tracking your money in a few seconds.',
    emailLabel: 'EMAIL ADDRESS',
    emailPh: 'Enter your email',
    passLabel: 'PASSWORD',
    passPh: 'Enter your password',
    inBtn: 'Sign In',
    upBtn: 'Sign Up',
    toUp: "Don't have an account? <b>Sign Up</b>",
    toIn: 'Already have an account? <b>Sign In</b>',
    foot: 'Track. Manage. Grow.',
    note: 'Your money. Your journey.',
    logout: 'Keluar'
  };

  if (!window.supabase || !window.supabase.createClient) {
    console.error('ANALICA: library Supabase belum termuat.');
    return;
  }

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.sb = sb;
  window.analicaUser = null;

  /* ---------- Gaya (semua dibatasi di #authScreen supaya desain aplikasi lama tidak berubah) ---------- */
  var css = document.createElement('style');
  css.textContent = [
    '#authScreen{position:fixed;inset:0;z-index:1000;overflow:auto;display:flex;align-items:center;justify-content:center;padding:24px 18px;',
      'background-color:#15242b;background-image:linear-gradient(180deg,rgba(4,16,20,.10),rgba(4,16,20,.30)),url("icons/login-bg.jpg");background-position:center;background-size:cover;background-repeat:no-repeat}',
    '#authScreen[hidden]{display:none}',
    '#authScreen .auth-wrap{width:100%;max-width:310px;margin:auto}',
    '#authScreen .auth-brand-row{display:flex;flex-direction:column;align-items:center;gap:7px;margin:0 0 16px;text-align:center;color:#fff}',
    '#authScreen .auth-mark{width:50px;height:50px;display:flex;align-items:center;justify-content:center}',
    '#authScreen .auth-mark img{width:100%;height:100%;object-fit:contain;display:block}',
    '#authScreen .brand-name{font-family:Georgia,"Times New Roman",serif;font-size:25px;letter-spacing:6px;color:#fff;margin-left:6px}',
    '#authScreen .brand-tag{font-size:11px;letter-spacing:.3px;color:rgba(255,255,255,.9);margin-top:2px}',
    '#authScreen .auth-card{width:100%;padding:20px 17px 15px;border-radius:21px;background:rgba(12,25,29,.42);border:1px solid rgba(255,255,255,.48);box-shadow:0 12px 38px rgba(0,0,0,.16);-webkit-backdrop-filter:blur(15px);backdrop-filter:blur(15px);color:#fff}',
    '#authScreen h1{font-size:clamp(25px,7vw,30px);line-height:1.12;letter-spacing:-.5px;margin:0 0 7px;color:#fff;font-weight:650}',
    '#authScreen .auth-intro{font-size:12px;line-height:1.5;color:rgba(255,255,255,.88);margin:0 0 14px}',
    '#authScreen label{display:block;font-size:10px;font-weight:600;letter-spacing:.8px;color:#fff;margin:12px 0 6px}',
    '#authScreen input{width:100%;margin:0;padding:11px 12px;font:13px system-ui,-apple-system,sans-serif;border-radius:11px;color:#fff;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.52);outline:none;min-width:0}',
    '#authScreen input::placeholder{color:rgba(255,255,255,.7)}',
    '#authScreen input:focus{border-color:#d5e4bf;box-shadow:0 0 0 3px rgba(213,228,191,.15)}',
    '#authScreen button{width:100%;border:0;padding:11px 13px;margin-top:14px;font:700 13px system-ui,-apple-system,sans-serif;border-radius:999px;background:linear-gradient(110deg,#a5c58d,#4f8b70);color:#102018;cursor:pointer;display:flex;justify-content:center;align-items:center;gap:10px}',
    '#authScreen button:disabled{opacity:.6;cursor:default}',
    '#authScreen button:focus-visible{outline:2px solid #d5e4bf;outline-offset:2px}',
    '#authScreen button.secondary{padding:10px;margin-top:7px;font-size:11px;font-weight:500;background:rgba(0,0,0,.12);color:#fff;border:1px solid rgba(255,255,255,.45)}',
    '#authScreen button.secondary b{color:#dceecf}',
    '#authScreen .auth-message{font-size:12px;line-height:1.5;min-height:16px;margin:10px 0 0;color:#ffe0d8}',
    '#authScreen .auth-message.ok{color:#dceecf}',
    '#authScreen .auth-foot{margin-top:13px;padding-top:10px;border-top:1px solid rgba(255,255,255,.24);text-align:center;color:rgba(255,255,255,.78);font-size:9px;letter-spacing:.5px}',
    '#authScreen .auth-note{text-align:center;color:rgba(255,255,255,.88);font-size:10px;margin:10px 10px 0;line-height:1.6}',
    '@media(min-width:600px){#authScreen .auth-wrap{max-width:320px}#authScreen .auth-card{padding:22px 19px 16px}}',
    '#authOut{position:fixed;z-index:900;top:calc(10px + env(safe-area-inset-top,0px));right:12px;border:0;border-radius:999px;padding:8px 14px;font:600 13px system-ui,-apple-system,sans-serif;background:rgba(236,232,222,.92);color:#26332d;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15)}',
    '#authOut[hidden]{display:none}',
    '#authOut:focus-visible{outline:2px solid #26332d;outline-offset:2px}'
  ].join('\n');
  document.head.appendChild(css);

  var ov = document.createElement('div');
  ov.id = 'authScreen';
  ov.innerHTML =
    '<div class="auth-wrap">' +
      '<div class="auth-brand-row">' +
        '<div class="auth-mark"><img src="icons/login-logo.png" alt="Logo ANALICA"></div>' +
        '<div class="brand-name">ANALICA</div>' +
        '<div class="brand-tag">' + TXT.tag + '</div>' +
      '</div>' +
      '<section class="auth-card">' +
        '<h1 id="authTitle"></h1>' +
        '<p class="auth-intro" id="authIntro"></p>' +
        '<form id="authForm" novalidate>' +
          '<label for="authEmail">' + TXT.emailLabel + '</label>' +
          '<input id="authEmail" type="email" autocomplete="email" inputmode="email" placeholder="' + TXT.emailPh + '">' +
          '<label for="authPassword">' + TXT.passLabel + '</label>' +
          '<input id="authPassword" type="password" autocomplete="current-password" placeholder="' + TXT.passPh + '">' +
          '<button id="authGo" type="submit"></button>' +
          '<button id="authSwitch" type="button" class="secondary"></button>' +
          '<p id="authMessage" class="auth-message" role="status"></p>' +
        '</form>' +
        '<div class="auth-foot">' + TXT.foot + '</div>' +
      '</section>' +
      '<div class="auth-note">' + TXT.note + '</div>' +
    '</div>';
  document.body.appendChild(ov);

  var outBtn = document.createElement('button');
  outBtn.id = 'authOut';
  outBtn.type = 'button';
  outBtn.hidden = true;
  outBtn.textContent = TXT.logout;
  document.body.appendChild(outBtn);

  function $(id) { return document.getElementById(id); }
  var mode = 'in';
  var busy = false;

  function setMsg(text, ok) {
    var m = $('authMessage');
    m.textContent = text || '';
    m.className = 'auth-message' + (ok ? ' ok' : '');
  }

  function setMode(m) {
    mode = m;
    $('authTitle').textContent = m === 'in' ? TXT.inTitle : TXT.upTitle;
    $('authIntro').textContent = m === 'in' ? TXT.inIntro : TXT.upIntro;
    $('authGo').innerHTML = (m === 'in' ? TXT.inBtn : TXT.upBtn) + ' <span aria-hidden="true">→</span>';
    $('authSwitch').innerHTML = m === 'in' ? TXT.toUp : TXT.toIn;
    $('authPassword').autocomplete = m === 'in' ? 'current-password' : 'new-password';
    setMsg('');
  }

  function showLogin() {
    ov.hidden = false;
    outBtn.hidden = true;
    setMode(mode);
  }
  function showApp(user) {
    window.analicaUser = user;
    ov.hidden = true;
    outBtn.hidden = false;
    outBtn.title = user && user.email ? user.email : '';
    $('authPassword').value = '';
    setMsg('');
  }

  function translate(err) {
    var t = ((err && err.message) || '').toLowerCase();
    if (t.indexOf('invalid login') > -1) return 'Email atau password salah.';
    if (t.indexOf('not confirmed') > -1) return 'Email belum dikonfirmasi. Cek kotak masuk email kamu.';
    if (t.indexOf('already registered') > -1) return 'Email ini sudah terdaftar. Pilih Sign In.';
    if (t.indexOf('rate limit') > -1 || t.indexOf('too many') > -1) return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
    if (t.indexOf('fetch') > -1 || t.indexOf('network') > -1) return 'Tidak ada koneksi internet. Coba lagi.';
    return 'Gagal: ' + ((err && err.message) || 'terjadi kesalahan.');
  }

  $('authSwitch').addEventListener('click', function () { setMode(mode === 'in' ? 'up' : 'in'); });

  $('authForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var email = $('authEmail').value.trim();
    var pass = $('authPassword').value;
    if (!email || email.indexOf('@') < 1) { setMsg('Isi email dengan benar.'); return; }
    if (pass.length < 6) { setMsg('Password minimal 6 karakter.'); return; }

    busy = true;
    $('authGo').disabled = true;
    setMsg('Memproses…', true);

    var req = mode === 'in'
      ? sb.auth.signInWithPassword({ email: email, password: pass })
      : sb.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: location.origin + location.pathname } });

    req.then(function (res) {
      if (res.error) { setMsg(translate(res.error)); return; }
      if (mode === 'up' && !(res.data && res.data.session)) {
        setMsg('Akun dibuat. Cek email kamu untuk konfirmasi, lalu pilih Sign In.', true);
        return;
      }
      /* sukses: tampilan diganti oleh onAuthStateChange */
    }).catch(function (err) {
      setMsg(translate(err));
    }).then(function () {
      busy = false;
      $('authGo').disabled = false;
    });
  });

  outBtn.addEventListener('click', function () {
    outBtn.disabled = true;
    sb.auth.signOut().then(function () { outBtn.disabled = false; });
  });

  /* Sesi dipantau terus: login, logout, dan refresh token. Jangan await panggilan Supabase di dalam callback ini. */
  sb.auth.onAuthStateChange(function (event, session) {
    if (session && session.user) showApp(session.user);
    else { window.analicaUser = null; showLogin(); }
  });

  sb.auth.getSession().then(function (res) {
    var s = res && res.data && res.data.session;
    if (s && s.user) showApp(s.user); else showLogin();
  }).catch(function () { showLogin(); });
})();
