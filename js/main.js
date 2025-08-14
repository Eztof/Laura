// Views umschalten
function showView(name) {
  const sections = ['landing', 'login', 'register', 'calendar', 'storage', 'account'];
  sections.forEach(s => {
    const el = document.getElementById(`${s}-view`);
    if (!el) return;
    if (s === name) show(el); else hide(el);
  });
  // Nav nur zeigen, wenn eingeloggt (also keine der Auth-Views/Landing)
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

// Auth-UI koppeln
function wireAuthUI() {
  // Landing → zu Login/Registrieren
  $('#go-login').addEventListener('click', () => showView('login'));
  $('#go-register').addEventListener('click', () => showView('register'));

  // Footer-Links zwischen Forms
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

  // Login
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = $('#login-username').value.trim();
    const p = $('#login-password').value;
    if (!u || !p) return toast('Bitte Username und Passwort angeben');

    try {
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
  await Calendar.reloadEvents();
  await StorageUI.reloadFiles();
}

// Auth-State beobachten (Auto-Login)
sb.auth.onAuthStateChange(async (_evt, session) => {
  if (session?.user) await onSignedIn();
  else showView('landing');
});

// Init
wireNav();
wireAuthUI();
Calendar.wireCalendarUI();
StorageUI.wireStorageUI();
showView('landing');
