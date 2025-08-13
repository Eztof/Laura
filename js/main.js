// Views umschalten
function showView(name) {
  const sections = ['auth', 'calendar', 'storage', 'account'];
  sections.forEach(s => {
    const el = document.getElementById(`${s}-view`);
    if (!el) return;
    if (s === name) show(el); else hide(el);
  });
  if (name !== 'auth') show($('#app-nav')); else hide($('#app-nav'));
}

function wireNav() {
  $$('#app-nav [data-view]').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });
  $('#logout-btn').addEventListener('click', async () => {
    await logout();
    showView('auth');
  });
}

// Auth-UI koppeln
function wireAuthUI() {
  $('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = $('#reg-username').value.trim();
    const p = $('#reg-password').value;
    const d = $('#reg-display').value.trim();
    if (!u || !p) return toast('Bitte Username und Passwort angeben');
    try {
      await register(u, p, d);
      toast('Account erstellt. Jetzt einloggen!');
    } catch (err) { toast(err.message); }
  });

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = $('#login-username').value.trim();
    const p = $('#login-password').value;
    if (!u || !p) return toast('Bitte Username und Passwort angeben');
    try {
      await login(u, p);
      await onSignedIn();
    } catch (err) { toast(err.message); }
  });
}

async function onSignedIn() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return showView('auth');

  // whoami
  const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).single();
  $('#whoami').textContent = `Eingeloggt als: ${prof?.display_name || prof?.username || '???'}`;

  showView('calendar');
  await Calendar.reloadEvents();
  await StorageUI.reloadFiles();
}

// Auth-State beobachten (Auto-Login)
sb.auth.onAuthStateChange(async (_evt, session) => {
  if (session?.user) await onSignedIn();
  else showView('auth');
});

// Init
wireNav();
wireAuthUI();
Calendar.wireCalendarUI();
StorageUI.wireStorageUI();
showView('auth');
