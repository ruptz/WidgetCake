const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { getVersion } = window.__TAURI__.app;
const { openUrl } = window.__TAURI__.opener;
const win = window.__TAURI__.window.getCurrentWindow();

const grid = document.getElementById('grid');
const switcher = document.getElementById('switcher');
const cellTemplate = document.getElementById('cell');
const soonTemplate = document.getElementById('soon');

/** id → app as last reported, with `el` and any `error` added here. */
const apps = new Map();
let filter = 'all';

const TAG = {
  off: 'Off',
  live: 'Running',
  stopping: 'Stopping…',
  missing: 'Not set up',
  available: 'Not installed',
  installing: 'Installing…',
};

/** True when version `a` is newer than `b` (both like "0.4.0"). */
function newer(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return false;
}

const mb = (bytes) => (bytes / 1048576).toFixed(0);

// ---------------------------------------------------------------- plates ---

/** A conversation for ChatterLayer's plate, in its speaker colours. */
const CHATTER = [
  ['Ana', '#FF6B6B', "okay, who's pulling the next pack?"],
  ['Ben', '#4ECDC4', 'me, give me ten seconds'],
  ['Kai', '#FFD93D', "healer's out of mana"],
  ['Ana', '#FF6B6B', 'drinking, go go go'],
  ['Ben', '#4ECDC4', 'pulled, stay behind me'],
  ['Kai', '#FFD93D', 'that went clean, nice'],
];

function caption([who, colour, said]) {
  const line = document.createElement('div');
  line.className = 'caption';
  line.style.setProperty('--ch', colour);
  const name = document.createElement('b');
  name.textContent = who;
  line.append(name, said);
  return line;
}

const PLATES = {
  chatterlayer(plate, app) {
    const lines = document.createElement('div');
    lines.className = 'captions';
    lines.append(caption(CHATTER[0]), caption(CHATTER[1]));
    plate.append(lines);

    // While it runs, new lines keep arriving at the bottom, as on stream.
    let next = 2;
    setInterval(() => {
      if (app.state !== 'live' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const line = caption(CHATTER[next++ % CHATTER.length]);
      line.classList.add('arriving');
      lines.append(line);
      if (lines.children.length > 3) lines.firstElementChild.remove();
    }, 2600);
  },

  jammylayer(plate) {
    plate.innerHTML = `
      <div class="track">
        <span class="art"></span>
        <div class="track-meta">
          <div class="track-title">Nightcall</div>
          <div class="track-artist">Kavinsky</div>
          <div class="progress"><i></i></div>
        </div>
      </div>`;
  },
};

// ----------------------------------------------------------------- cells ---

/** "ChatterLayer" → Chatter<span>Layer</span>: the family word sits back. */
function setName(el, name) {
  const own = name.replace(/Layer$/, '');
  const family = document.createElement('span');
  family.textContent = name.slice(own.length);
  el.replaceChildren(own, family);
}

/** The app's own logo when it has one, otherwise its coloured badge. */
function fillMark(el, app) {
  el.classList.toggle('has-logo', Boolean(app.logo));
  if (app.logo) {
    const img = document.createElement('img');
    img.src = app.logo;
    img.alt = '';
    el.replaceChildren(img);
  } else {
    el.textContent = app.mark;
  }
}

function switchItem(app) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'switch-item';
  item.style.setProperty('--app', app.colour);
  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.setAttribute('aria-hidden', 'true');
  fillMark(mark, app);
  item.append(mark, app.name);
  item.addEventListener('click', () => {
    if (app.el.hidden) document.querySelector('[data-filter="all"]').click();
    app.el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    app.el.classList.remove('found');
    void app.el.offsetWidth;
    app.el.classList.add('found');
  });
  return item;
}

function cell(app) {
  const el = cellTemplate.content.firstElementChild.cloneNode(true);
  setName(el.querySelector('.name'), app.name);
  el.style.setProperty('--app', app.colour);
  fillMark(el.querySelector('.mark'), app);
  el.querySelector('.tagline').textContent = app.tagline;
  el.querySelector('.url').textContent = app.overlayUrl;
  el.querySelector('[data-link="website"]').hidden = !app.website;
  PLATES[app.id]?.(el.querySelector('.plate'), app);

  el.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    if (button.classList.contains('more')) return toggleMenu(button);
    // Stays open between the two clicks it takes to confirm.
    if (button.dataset.menu === 'uninstall') return uninstall(app, button);
    closeMenus();
    if (button.dataset.link) openUrl(app[button.dataset.link]);
    else if (button.classList.contains('copy')) copy(app, button);
    else if (button.dataset.act === 'install' || button.dataset.act === 'update') install(app.id);
    else if (button.dataset.act === 'stop') stop(app.id);
    else if (button.dataset.act) run(button.dataset.act, app.id);
  });
  return el;
}

function render(app) {
  const el = app.el;
  el.dataset.state = app.state;
  app.item.dataset.state = app.state;
  el.hidden = filter !== 'all' && (filter === 'live') !== (app.state === 'live');
  const hasUpdate = app.state === 'off' && app.installed && app.latest && newer(app.latest, app.version);
  if (hasUpdate) el.dataset.update = '';
  else delete el.dataset.update;
  el.querySelector('.version').textContent = app.version
    ? `v${app.version}`
    : app.latest
      ? `v${app.latest} available`
      : '';
  el.querySelector('.tag').textContent = hasUpdate ? 'Update available' : TAG[app.state];

  const installing = app.state === 'installing';
  el.querySelector('.download').hidden = !installing;
  if (installing) {
    const { received = 0, total = 0, unpacking = false } = app.progress ?? {};
    const pct = total ? Math.min(100, Math.round((received / total) * 100)) : 0;
    el.querySelector('.bar i').style.width = `${unpacking ? 100 : pct}%`;
    el.querySelector('.download-text').textContent = unpacking
      ? 'Unpacking…'
      : total
        ? `Downloading ${mb(received)} of ${mb(total)} MB · ${pct}%`
        : 'Starting download…';
  }
  el.querySelector('[data-menu="uninstall"]').hidden = !app.installed || app.state !== 'off';

  const note = el.querySelector('.note');
  note.textContent = app.error ?? app.problem ?? '';
  note.hidden = !app.error && app.state !== 'missing';
  note.dataset.kind = app.error ? 'fault' : 'help';

  const button = (act) => el.querySelector(`[data-act="${act}"]`);
  button('launch').hidden = app.state !== 'off' && app.state !== 'missing';
  button('launch').disabled = app.state === 'missing';
  button('install').hidden = app.state !== 'available';
  button('update').hidden = !hasUpdate;
  button('update').textContent = hasUpdate ? `Update to ${app.latest}` : '';
  button('open').hidden = app.state !== 'live' && app.state !== 'stopping';
  button('open').disabled = app.state === 'stopping';
  button('stop').hidden = app.state !== 'live' && app.state !== 'stopping';
  button('stop').disabled = app.state === 'stopping';
  button('stop').textContent = app.state === 'stopping' ? 'Stopping…' : 'Stop';
}

function renderAll() {
  for (const app of apps.values()) render(app);
  const all = [...apps.values()];
  const live = all.filter((a) => a.state === 'live').length;
  const counts = { all: all.length, live, off: all.length - live };
  for (const [key, n] of Object.entries(counts)) {
    document.querySelector(`[data-count="${key}"]`).textContent = n;
  }
  const onair = document.getElementById('onair');
  onair.dataset.live = live ? '1' : '0';
  document.getElementById('onair-text').textContent = live
    ? `${live} on air`
    : 'Nothing on air';
}

function update(id, patch) {
  const app = apps.get(id);
  if (!app) return;
  Object.assign(app, patch);
  renderAll();
}

async function run(act, id) {
  update(id, { error: null });
  try {
    await invoke(act, { id });
    if (act === 'launch') update(id, { state: 'live' });
  } catch (err) {
    update(id, { error: String(err) });
  }
}

async function stop(id) {
  update(id, { state: 'stopping', error: null });
  try {
    await invoke('stop', { id });
  } catch (err) {
    update(id, { state: 'live', error: String(err) });
  }
}

/** Installs, or updates to the newest release; the card shows the download. */
async function install(id) {
  update(id, { state: 'installing', progress: null, error: null });
  try {
    await invoke('install_app', { id });
  } catch (err) {
    apps.get(id).error = String(err);
  }
  await load();
}

listen('install-progress', ({ payload }) => update(payload.id, { progress: payload }));

/** Asks once in place: the menu item becomes the confirmation. */
async function uninstall(app, button) {
  if (!button.dataset.armed) {
    button.dataset.armed = '1';
    button.textContent = `Click again to uninstall ${app.name}`;
    return;
  }
  delete button.dataset.armed;
  button.textContent = 'Uninstall';
  closeMenus();
  try {
    await invoke('uninstall_app', { id: app.id });
    app.latest = null;
  } catch (err) {
    app.error = String(err);
  }
  await load();
}

/** The one action that asks GitHub anything, and only when clicked. */
async function checkForUpdates() {
  const rescan = document.getElementById('rescan');
  rescan.disabled = true;
  await load();
  await Promise.all(
    [...apps.values()].map(async (app) => {
      try {
        app.latest = await invoke('latest_version', { id: app.id });
        app.error = null;
      } catch (err) {
        app.error = String(err);
      }
    }),
  );
  rescan.disabled = false;
  const now = new Date();
  checked = `Checked for updates at ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  footnote();
  renderAll();
}

function toggleMenu(button) {
  const menu = button.nextElementSibling;
  const open = menu.hidden;
  closeMenus();
  menu.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
}

function closeMenus() {
  for (const armed of document.querySelectorAll('[data-armed]')) {
    delete armed.dataset.armed;
    armed.textContent = 'Uninstall';
  }
  for (const menu of document.querySelectorAll('.menu')) menu.hidden = true;
  for (const b of document.querySelectorAll('.more')) b.setAttribute('aria-expanded', 'false');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.more-wrap')) closeMenus();
});

async function copy(app, button) {
  await navigator.clipboard.writeText(app.overlayUrl);
  button.textContent = 'Copied';
  setTimeout(() => (button.textContent = 'Copy'), 1600);
}

/** Reads every app again: versions, OBS addresses, whether it's set up. */
async function load() {
  for (const app of await invoke('list_apps')) {
    const known = apps.get(app.id);
    if (known) {
      // The launcher knows about downloads; only a stop still under way
      // (the app hasn't exited yet) is the window's to remember.
      const stopping = known.state === 'stopping' && app.state === 'live';
      Object.assign(known, app, { state: stopping ? 'stopping' : app.state });
      known.el.querySelector('.url').textContent = app.overlayUrl;
      fillMark(known.el.querySelector('.mark'), app);
      fillMark(known.item.querySelector('.mark'), app);
    } else {
      app.el = cell(app);
      app.item = switchItem(app);
      apps.set(app.id, app);
      grid.append(app.el);
      switcher.append(app.item);
    }
  }
  if (!grid.querySelector('.soon')) grid.append(soonTemplate.content.firstElementChild.cloneNode(true));
  renderAll();
}

// Whether stopped from here, quit from its own tray, or crashed.
listen('app-state', ({ payload }) => update(payload.id, { state: payload.state }));

// --------------------------------------------------------------- toolbar ---

document.getElementById('rescan').addEventListener('click', checkForUpdates);

// Coming back to the window picks up a changed port or a fresh npm install.
window.addEventListener('focus', load);

for (const button of document.querySelectorAll('[data-filter]')) {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    for (const b of document.querySelectorAll('[data-filter]')) {
      b.setAttribute('aria-checked', String(b === button));
    }
    grid.querySelector('.soon').hidden = filter !== 'all';
    renderAll();
  });
}

for (const link of document.querySelectorAll('[data-url]')) {
  link.addEventListener('click', () => openUrl(link.dataset.url));
}

// ---------------------------------------------------------------- window ---

document.getElementById('win-min').addEventListener('click', () => win.minimize());
document.getElementById('win-max').addEventListener('click', () => win.toggleMaximize());
// Goes through the same check as any other close: running apps ask first.
document.getElementById('win-close').addEventListener('click', () => win.close());

const closing = document.getElementById('closing');
const cancel = document.getElementById('closing-cancel');

listen('close-requested', () => {
  closing.hidden = false;
  document.getElementById('closing-stop').focus();
});

cancel.addEventListener('click', () => {
  closing.hidden = true;
});

document.getElementById('closing-leave').addEventListener('click', () => {
  invoke('quit', { stopAll: false });
});

document.getElementById('closing-stop').addEventListener('click', () => {
  for (const button of closing.querySelectorAll('button')) button.disabled = true;
  document.getElementById('closing-text').textContent = 'Stopping every overlay, then closing…';
  for (const app of apps.values()) if (app.state === 'live') app.state = 'stopping';
  renderAll();
  invoke('quit', { stopAll: true });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  closeMenus();
  if (!closing.hidden && !cancel.disabled) closing.hidden = true;
});

let version = '';
/** Replaced once updates have been checked; until then nothing has gone online. */
let checked = 'Runs on this PC';

function footnote() {
  document.getElementById('footnote').textContent = `WidgetCake ${version} · ${checked}`;
}

getVersion().then((v) => {
  version = v;
  footnote();
});

load();
