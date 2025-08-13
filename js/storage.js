// Einfache Uploads in public Bucket "laura"

async function uploadFile(file) {
  if (!file) throw new Error('Keine Datei gewählt');
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Nicht eingeloggt');

  // Pfad: userId/filename
  const path = `${user.id}/${Date.now()}_${file.name}`;
  const { error } = await sb.storage.from(window.STORAGE_BUCKET).upload(path, file, {
    upsert: false
  });
  if (error) throw error;
  return path;
}

async function listFiles() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Nicht eingeloggt');

  // Liste nur eigenes Verzeichnis
  const { data, error } = await sb.storage
    .from(window.STORAGE_BUCKET)
    .list(user.id, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

  if (error) throw error;
  return (data || []).map(obj => `${user.id}/${obj.name}`);
}

function publicUrl(path) {
  // Bucket ist public → direkt nutzbar
  return sb.storage.from(window.STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function removeFile(path) {
  const { error } = await sb.storage.from(window.STORAGE_BUCKET).remove([path]);
  if (error) throw error;
}

async function reloadFiles() {
  try {
    const files = await listFiles();
    const ul = $('#files-list');
    ul.innerHTML = '';
    if (!files.length) {
      ul.innerHTML = '<li>Keine Dateien</li>';
      return;
    }
    for (const path of files) {
      const li = document.createElement('li');
      li.className = 'file-row';
      const url = publicUrl(path);
      li.innerHTML = `
        <span>${path.split('/').at(-1)}</span>
        <span>
          <a href="${url}" target="_blank" rel="noopener">Öffnen</a>
          <button data-del="${path}">Löschen</button>
        </span>
      `;
      ul.appendChild(li);
    }
    $$('#files-list [data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await removeFile(btn.dataset.del);
          toast('Datei gelöscht');
          await reloadFiles();
        } catch (e) { toast(e.message); }
      });
    });
  } catch (e) { toast(e.message); }
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
}

window.StorageUI = { wireStorageUI, reloadFiles };
