// Username ↔ E-Mail-Mapping (einfach)
const toEmail = (username) => `${username}@${window.USERNAME_DOMAIN}`.toLowerCase();

async function register(username, password, displayName="") {
  const email = toEmail(username);

  // 1) SignUp (ohne E-Mail-Verification aktiv)
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { username, display_name: displayName } }
  });
  if (error) throw error;

  // 2) Profilzeile erstellen (id = auth.user.id)
  const user = data.user;
  if (user) {
    const { error: pErr } = await sb.from('profiles').insert({
      id: user.id,
      username,
      display_name: displayName,
      last_seen: new Date().toISOString()
    });
    if (pErr && pErr.code !== '23505') { // unique violation bei Re-run ignorieren
      throw pErr;
    }
  }
  return data;
}

async function login(username, password) {
  const email = toEmail(username);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const user = data.user;

  // last_seen + login protokollieren
  await sb.from('profiles').update({ last_seen: new Date().toISOString() })
    .eq('id', user.id);

  await sb.from('user_logins').insert({
    user_id: user.id,
    user_agent: navigator.userAgent,
    note: 'login'
  });

  return user;
}

async function logout() {
  await sb.auth.signOut();
}
