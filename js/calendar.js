// Monatskalender + Eventliste

function parseLocalDateTime(inputEl) {
  const v = inputEl.value;
  if (!v) return null;
  return new Date(v).toISOString();
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
function mondayIndex(jsDay) { return (jsDay + 6) % 7; } // 0 = Mo
function fmtMonthTitle(d) {
  return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}
function ymdKey(dateObj) {
  // lokales Datum (Berlin) → YYYY-MM-DD
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

async function listEventsInRange(fromISO, toISO) {
  // einfache Range: starts_at zwischen von/bis
  let q = sb.from('events').select('*').order('starts_at', { ascending: true });
  q = q.gte('starts_at', fromISO).lte('starts_at', toISO);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

const Calendar = (() => {
  const state = {
    current: new Date(), // heute
    shown: null,         // welcher Monat wird angezeigt
    events: []           // events des Monats
  };

  function computeGrid(monthDate) {
    const first = startOfMonth(monthDate);
    const last = endOfMonth(monthDate);
    const startGrid = new Date(first);
    startGrid.setDate(first.getDate() - mondayIndex(first.getDay())); // zurück bis Montag
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startGrid);
      d.setDate(startGrid.getDate() + i);
      const inMonth = d.getMonth() === monthDate.getMonth();
      const isToday = ymdKey(d) === ymdKey(state.current);
      cells.push({ date: d, inMonth, isToday });
    }
    return { first, last, cells };
  }

  function groupEventsByDay(list) {
    const map = new Map(); // key: 'YYYY-MM-DD' → []
    for (const ev of list) {
      const d = new Date(ev.starts_at);
      const key = ymdKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }
    return map;
  }

  function renderMonth() {
    const monthDate = state.shown;
    $('#cal-title').textContent = fmtMonthTitle(monthDate);

    const { cells } = computeGrid(monthDate);
    const byDay = groupEventsByDay(state.events);
    const cont = $('#cal-cells');
    cont.innerHTML = '';

    for (const c of cells) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell' +
        (c.inMonth ? '' : ' other-month') +
        (c.isToday ? ' today' : '');
      cell.dataset.date = ymdKey(c.date);
      cell.innerHTML = `
        <div class="daynum">${c.date.getDate()}</div>
        <div class="events"></div>
      `;

      const evWrap = cell.querySelector('.events');
      const key = ymdKey(c.date);
      const list = byDay.get(key) || [];
      if (!list.length) {
        // nix – leer
      } else {
        // maximal 3 kurz anzeigen
        list.slice(0, 3).forEach(ev => {
          const line = document.createElement('div');
          line.className = 'event-dot';
          line.innerHTML = `<span class="dot"></span><span>${ev.title}</span>`;
          evWrap.appendChild(line);
        });
        if (list.length > 3) {
          const more = document.createElement('div');
          more.className = 'event-dot';
          more.innerHTML = `<span class="badge">+${list.length - 3} mehr</span>`;
          evWrap.appendChild(more);
        }
      }

      // Klick auf Tag → Formular vorfüllen
      cell.addEventListener('click', () => {
        const start = new Date(c.date);
        start.setHours(10, 0, 0, 0);
        $('#ev-start').value = new Date(start.getTime() - start.getTimezoneOffset()*60000)
          .toISOString().slice(0,16);
        $('#ev-end').value = '';
        $('#ev-all-day').checked = false;
        $('#ev-title').focus({ preventScroll: false });
        // unten zum Formular scrollen (mobil komfort)
        document.getElementById('event-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      cont.appendChild(cell);
    }

    // Liste unterhalb auffüllen
    renderEventList(state.events);
  }

  function renderEventList(list) {
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
        <div style="margin-top:6px"><button data-del="${ev.id}" class="danger">Löschen</button></div>
      `;
      ul.appendChild(li);
    }

    // Delete-Buttons
    $$('#events-list [data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await deleteEvent(btn.dataset.del);
          toast('Event gelöscht');
          await Calendar.loadCurrentMonth(); // neu laden
        } catch (e) { toast(e.message); }
      });
    });
  }

  async function loadMonth(dateObj) {
    state.shown = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    const from = startOfMonth(state.shown).toISOString();
    const to = endOfMonth(state.shown).toISOString();
    try {
      state.events = await listEventsInRange(from, to);
      renderMonth();
    } catch (e) { toast(e.message); }
  }

  function wireCalendarUI() {
    $('#cal-prev').addEventListener('click', () => {
      const d = new Date(state.shown);
      d.setMonth(d.getMonth() - 1);
      loadMonth(d);
    });
    $('#cal-next').addEventListener('click', () => {
      const d = new Date(state.shown);
      d.setMonth(d.getMonth() + 1);
      loadMonth(d);
    });
    $('#cal-today').addEventListener('click', () => loadMonth(new Date()));

    // Formular speichern
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
        await loadMonth(state.shown);
      } catch (err) { toast(err.message); }
    });
  }

  // öffentliche API
  return {
    wireCalendarUI,
    loadCurrentMonth: async () => loadMonth(new Date())
  };
})();

window.Calendar = Calendar;
