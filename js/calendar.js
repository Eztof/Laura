// Events CRUD

function parseLocalDateTime(inputEl) {
  // input type="datetime-local" → lokale Zeit interpretieren
  const v = inputEl.value;
  if (!v) return null;
  // Browser erzeugt "YYYY-MM-DDTHH:mm"
  // new Date(v) interpretiert als lokale Zeit und gibt UTC-ISO zurück
  return new Date(v).toISOString();
}

async function addEvent({ title, description, starts_at, ends_at, all_day }) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Nicht eingeloggt');
  const { error } = await sb.from('events').insert({
    owner: user.id, title, description, starts_at, ends_at, all_day
  });
  if (error) throw error;
}

async function deleteEvent(id) {
  const { error } = await sb.from('events').delete().eq('id', id);
  if (error) throw error;
}

async function listEvents({ from, to }) {
  let q = sb.from('events').select('*').order('starts_at', { ascending: true });
  if (from) q = q.gte('starts_at', from);
  if (to) q = q.lte('starts_at', to + 'T23:59:59.999Z');
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

function renderEvents(list) {
  const ul = $('#events-list');
  ul.innerHTML = '';
  if (!list.length) {
    ul.innerHTML = '<li class="event">Keine Einträge 🗓️</li>';
    return;
  }
  for (const ev of list) {
    const li = document.createElement('li');
    li.className = 'event';
    const when = ev.all_day
      ? `${formatD(ev.starts_at)} (ganztägig)`
      : `${formatDT(ev.starts_at)}${ev.ends_at ? ' – ' + formatDT(ev.ends_at) : ''}`;
    li.innerHTML = `
      <div><strong>${ev.title}</strong></div>
      <div class="meta">${when}</div>
      ${ev.description ? `<div>${ev.description}</div>` : ''}
      <div><button data-del="${ev.id}">Löschen</button></div>
    `;
    ul.appendChild(li);
  }

  // Delete-Buttons
  $$('#events-list [data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await deleteEvent(btn.dataset.del);
        toast('Event gelöscht');
        await reloadEvents();
      } catch (e) { toast(e.message); }
    });
  });
}

async function reloadEvents() {
  const from = $('#filter-from').value || null;
  const to = $('#filter-to').value || null;
  try {
    const list = await listEvents({
      from: from ? new Date(from).toISOString() : null,
      to: to || null
    });
    renderEvents(list);
  } catch (e) { toast(e.message); }
}

function wireCalendarUI() {
  $('#event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $('#ev-title').value.trim();
    if (!title) return toast('Titel fehlt');
    const description = $('#ev-desc').value.trim();
    const starts_at = parseLocalDateTime($('#ev-start'));
    const ends_at = parseLocalDateTime($('#ev-end'));
    const all_day = $('#ev-all-day').checked;

    try {
      await addEvent({ title, description, starts_at, ends_at, all_day });
      e.target.reset();
      toast('Gespeichert!');
      await reloadEvents();
    } catch (err) { toast(err.message); }
  });

  $('#reload-events').addEventListener('click', reloadEvents);
}

window.Calendar = { wireCalendarUI, reloadEvents };
