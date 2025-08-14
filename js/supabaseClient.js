// Supabase-Client initialisieren – mit Remember-Me
(function () {
  // gespeicherte Präferenz lesen (default: true)
  const saved = localStorage.getItem('rememberMe');
  const remember = saved === null ? true : saved !== '0';
  window.__REMEMBER_ME = remember;

  function makeClient(persist) {
    return supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: persist,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: persist ? localStorage : sessionStorage
      }
    });
  }

  // global verfügbar:
  window.initSupabase = function (persist) {
    window.__REMEMBER_ME = persist;
    // Präferenz merken, damit Reload das übernimmt
    localStorage.setItem('rememberMe', persist ? '1' : '0');
    window.sb = makeClient(persist);
    return window.sb;
  };

  // Initiale Instanz
  window.sb = makeClient(remember);

  // Reachability-Check (hilft bei falscher URL)
  (async () => {
    try {
      const res = await fetch(`${window.SUPABASE_URL}/auth/v1/settings`, { method: 'GET' });
      if (!res.ok) console.warn('Supabase erreichbar, aber Antwort nicht OK:', res.status);
    } catch (e) {
      console.error('Supabase URL nicht erreichbar. Prüfe js/config.js → SUPABASE_URL.', e);
      alert('⚠️ Supabase-URL nicht erreichbar.\nBitte js/config.js prüfen (Settings → API → Project URL).');
    }
  })();
})();
