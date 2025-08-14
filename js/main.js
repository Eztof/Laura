let unsubscribeAuth = null;

function showView(name) {
  const sections = ['landing', 'login', 'register', 'calendar', 'storage', 'account'];
  sections.forEach(s => {
    const el = document.getElementById(`${s}-view`);
    if (!el) return;
    if (s === name) show(el); else hide(el);
  });
  const authViews = ['landing', 'login', 'register'];
  if (authViews.includes(name)) hide($('#app-nav')); else show($('#app-nav'));
}

function wireNav() {
  $$('#app-nav [data-view]').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });
  $('#logout-btn').addEventListener('click', async () => {
    await logout();
    showView('landing');
  });
}

function attachAuthListener() {
  // Bestehenden Listener entfernen
  if (unsubscribeAuth && typeof unsubscribeAuth.unsubscribe === 'function') {
    try { unsubscribeAuth.unsubscribe(); } catch {}
  }
  unsubscribeAuth = sb.auth.onAuthStateChange(async (_evt, session) => {
    if (session?.user) await onSignedIn();
    else showView('landing');
  }).data?.subscription;
}

function wireAuthUI() {
  // Landing → Login/Registrieren
  $('#go-login').addEventListener('click', () => {
    $('#login-remember').checked = window.__REMEMBER_ME;
    showView('login');
  });
  $('#go-register').addEventListener('click', () => showView('register'));

  // Footer-Links
  $('#swap-to-register').addEventListener('click', (e) => { e.preventDefault(); showView('register'); });
  $('#swap-to-login').addEventListener('click', (e) => { e.preventDefault(); showView('login'); });

  // Registrierung
  $('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = $('#reg-username').value.trim();
    const p = $('#reg-password').value;
    const d = $('#reg-display').value.trim();
    if (!u || !p) return toast('Bitte Username und Passwort angeben');

    try {
      await register(u, p, d);
      toast('Account erstellt. Jetzt einloggen!');
      showView('login');
    } catch (err) { toast(err.message || 'Fehler bei der Registrierung'); }
  });

  // Login (mit Remember-Me)
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = $('#login-username').value.trim();
    const p = $('#login-password').value;
    const remember = $('#login-remember').checked;

    if (!u || !p) return toast('Bitte Username und Passwort angeben');

    try {
      // Client ggf. neu initialisieren, damit persistSession sofort passt
      if (remember !== window.__REMEMBER_ME) {
        initSupabase(remember);
        attachAuthListener();
      }
      await login(u, p);
      await onSignedIn();
    } catch (err) { toast(err.message || 'Login fehlgeschlagen'); }
  });
}

async function onSignedIn() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return showView('landing');

  const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).single();
  $('#whoami').textContent = `Eingeloggt als: ${prof?.display_name || prof?.username || '???'}`;

  showView('calendar');
  await Calendar.loadCurrentMonth();
  await StorageUI.reloadFiles();
}

// Init
wireNav();
wireAuthUI();
Calendar.wireCalendarUI();
StorageUI.wireStorageUI();

// Auth-State listener
attachAuthListener();

// Startansicht
showView('landing');
