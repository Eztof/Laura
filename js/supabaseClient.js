// Supabase-Client initialisieren
window.sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// Sanity-Check: ist die URL erreichbar? (hilft, DNS/URL-Fehler sofort zu sehen)
(async () => {
  try {
    const res = await fetch(`${window.SUPABASE_URL}/auth/v1/settings`, { method: 'GET' });
    if (!res.ok) {
      console.warn('Supabase erreichbar, aber Antwort nicht OK:', res.status);
    }
  } catch (e) {
    console.error('Supabase URL nicht erreichbar. Prüfe js/config.js → SUPABASE_URL.', e);
    alert('⚠️ Supabase-URL nicht erreichbar.\nBitte js/config.js prüfen (Settings → API → Project URL).');
  }
})();
