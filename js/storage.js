// Dateien-Ansicht mit Tabelle, Thumbnails, Größen & Datum

function isImageName(name) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
}
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  const units = ['B','KB','MB','GB','TB'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
function publicUrl(path) {
  return sb.storage.from(window.STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function uploadFile(file) {
  if (!file) throw new Error('Keine Datei gewählt');
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Nicht eingeloggt');

  const safeName = file.name.replace(/[^\w.\-() ]+/g, '_');
  const path = `${user.id}/${Date.now()}_${safeName}`;
  const { error } = await sb.storage.from(window.STORAGE_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

async function listFiles() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Nicht eingeloggt');

  const { data, error } = await sb.storage
    .from(window.STORAGE_BUCKET)
    .list(user.id, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });

  if (error) throw error;
  return (data || []).map(obj => ({
    name: obj.name,
    size: obj.metadata?.size ?? obj.size ?? null,
    created_at: obj.created_at || obj.updated_at || null,
    path: `${user.id}/${obj.name}`
  }));
}

async function removeFile(path) {
  const { error } = await sb.storage.from(window.STORAGE_BUCKET).remove([path]);
  if (error) throw error;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Link kopiert');
  } catch {
    toast('Konnte den Link nicht kopieren');
  }
}

async function reloadFiles() {
  const tbody = $('#files-body');
  const emptyMsg = $('#files-empty');
  tbody.innerHTML = '';
  emptyMsg.classList.add('hidden');

  try {
    const files = await listFiles();
    if (!files.length) {
      emptyMsg.classList.remove('hidden');
      return;
    }

    for (const f of files) {
      const tr = document.createElement('tr');

      // Name + Thumb
      const tdName = document.createElement('td');
      tdName.className = 'name-cell';
      if (isImageName(f.name)) {
        const img = document.createElement('img');
        img.className = 'thumb';
        img.loading = 'lazy';
        img.src = publicUrl(f.path);
        img.alt = f.name;
        tdName.appendChild(img);
      } else {
        const box = document.createElement('div');
        box.className = 'thumb';
        box.style.display = 'grid';
        box.style.placeItems = 'center';
        box.innerHTML = `<span class="badge">${(f.name.split('.').pop() || '').toUpperCase()}</span>`;
        tdName.appendChild(box);
      }
      const span = document.createElement('span');
      span.textContent = f.name.replace(/^\d+_/, ''); // Zeitpräfix entfernen
      tdName.appendChild(span);

      // Größe
      const tdSize = document.createElement('td');
      tdSize.textContent = formatBytes(f.size ?? 0);

      // Datum
      const tdDate = document.createElement('td');
      tdDate.textContent = f.created_at ? formatDT(f.created_at) : '—';

      // Aktionen
      const tdAct = document.createElement('td');
      tdAct.className = 'actions-col';
      const bar = document.createElement('div');
      bar.className = 'actions-bar';

      const aOpen = document.createElement('a');
      aOpen.href = publicUrl(f.path);
      aOpen.target = '_blank';
      aOpen.rel = 'noopener';
      aOpen.textContent = 'Öffnen';

      const btnCopy = document.createElement('button');
      btnCopy.type = 'button';
      btnCopy.textContent = 'Link kopieren';
      btnCopy.addEventListener('click', () => copyToClipboard(aOpen.href));

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'danger';
      btnDel.textContent = 'Löschen';
      btnDel.addEventListener('click', async () => {
        if (!confirm('Datei wirklich löschen?')) return;
        try {
          await removeFile(f.path);
          toast('Datei gelöscht');
          await reloadFiles();
        } catch (e) { toast(e.message); }
      });

      bar.appendChild(aOpen);
      bar.appendChild(btnCopy);
      bar.appendChild(btnDel);
      tdAct.appendChild(bar);

      tr.appendChild(tdName);
      tr.appendChild(tdSize);
      tr.appendChild(tdDate);
      tr.appendChild(tdAct);

      tbody.appendChild(tr);
    }
  } catch (e) {
    toast(e.message);
  }
}

function wireStorageUI() {
  $('#upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = $('#file-input').files[0];
    try {
      await uploadFile(f);
      $('#upload-form').reset();
      toast('Hochgeladen!');
      await reloadFiles();
    } catch (err) { toast(err.message); }
  });

  $('#files-reload').addEventListener('click', reloadFiles);
}

window.StorageUI = { wireStorageUI, reloadFiles };
