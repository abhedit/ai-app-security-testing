import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@phosphor-icons/web/regular';
import '@phosphor-icons/web/fill';
import './style.css';

const root = document.querySelector('#app');
const drawer = document.querySelector('#drawer');
const announcement = document.querySelector('#announcement');
const navigation = [
  ['overview', 'Overview', 'house'], ['releases', 'Releases', 'cube'],
  ['checks', 'Defensive checks', 'shield-check'], ['artifacts', 'Artifacts', 'stack'],
  ['fixtures', 'Regression fixtures', 'file-text'], ['findings', 'Findings', 'chart-bar'],
  ['teams', 'Teams', 'users'], ['settings', 'Settings', 'gear'],
];
const statuses = {
  Failed: ['failed', 'x'], 'Needs attention': ['warning', 'warning'],
  Passed: ['passed', 'check'], 'Not run': ['neutral', 'minus'],
};
let releases = [];
let selectedId;
let page = 'releases';
let showList = false;
let busy = false;

const active = () => releases.find(release => release.id === selectedId) ?? releases[0];
const icon = (name, fill = false) => '<i class="' + (fill ? 'ph-fill' : 'ph') + ' ph-' + name + '" aria-hidden="true"></i>';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const date = value => new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value));
const action = (label, command, symbol = '', secondary = false) =>
  '<button type="button" class="' + (secondary ? 'button secondary' : 'button') + '" data-action="' + command + '">' +
    (symbol && icon(symbol)) + escape(label) + '</button>';

async function api(url, data) {
  const response = await fetch('/api/' + url, data === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'Request failed.');
  return value;
}

function status(value) {
  const [color, symbol] = statuses[value];
  return '<span class="pill ' + color + '">' + icon(symbol) + escape(value) + '</span>';
}

function ready(release) {
  return release.results.every(result => result.status === 'Passed');
}

function evidenceText(result) {
  if (result.failed.length) return result.failed.length + ' ' + (result.failed.length === 1 ? 'failure' : 'failures') + ' on regression fixtures.';
  if (!result.observed) return 'No observations supplied.';
  if (result.missing) return 'Observations are missing for ' + result.missing + ' fixtures.';
  return 'Verified on all ' + result.observed + ' supplied fixtures.';
}

function resultsTable(results) {
  if (!results.length) return '<p class="empty">No findings for this release.</p>';
  return `<div class="table-wrap"><table><thead><tr><th scope="col">Defensive check</th><th scope="col">Result</th><th scope="col">Key findings</th><th scope="col">What must be fixed before release</th></tr></thead><tbody>
    ${results.map(result => `<tr>
      <th scope="row"><button class="text-button row-title" data-action="check-${result.id}">${escape(result.title)}</button><small>${escape(result.description)}</small></th>
      <td>${status(result.status)}</td>
      <td>${escape(evidenceText(result))}${active().owners[result.id] ? '<small>Owner: ' + escape(active().owners[result.id]) + '</small>' : ''}</td>
      <td>${result.status === 'Passed' ? '&mdash;' : escape(result.missing && !result.failed.length ? 'Supply the missing observations and rerun the review.' : result.fix)}</td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

function releaseView(release) {
  const counts = ['Failed', 'Needs attention', 'Passed', 'Not run'].map(value => ({
    value, count: release.results.filter(result => result.status === value).length,
  })).filter(item => item.value !== 'Not run' || item.count);
  return `<button class="text-button back" data-action="list">${icon('arrow-left')} Releases</button>
    <header class="release-header">
      <div><h1>${escape(release.title)} / ${escape(release.version)}</h1><p>Release readiness review for defensive AI application security</p></div>
      ${action('Review evidence', 'evidence', 'files')}
    </header>
    <div class="meta">
      <span>${icon('calendar-blank')} ${date(release.date)}</span>
      <span>${icon('cube')} Artifacts: ${release.artifacts.length}</span>
      <span>${icon('stack')} Regression fixtures: ${release.fixtures.length}</span>
      <span>${icon('users')} Teams: ${escape(release.team)}</span>
    </div>
    <section class="section">
      <h2>Release status</h2><p>Overall readiness and what must be fixed before release.</p>
      <div class="summary">
        <div class="readiness ${ready(release) ? 'passed' : 'failed'}">${icon(ready(release) ? 'check-circle' : 'x-circle', true)} ${ready(release) ? 'Ready for release' : 'Not ready for release'}</div>
        <div class="metrics">
          <div><strong>${release.results.length}</strong><span>Checks total</span></div>
          ${counts.map(item => '<div><strong class="' + statuses[item.value][0] + '">' + item.count + '</strong><span>' + item.value + '</span></div>').join('')}
        </div>
      </div>
    </section>
    <section class="section">
      <h2>Defensive check results</h2><p>Results from the recorded observations in your regression fixtures.</p>
      ${resultsTable(release.results)}
    </section>
    ${release.sample ? '<p class="sample-note">Sample release · Illustrative evidence</p>' : ''}`;
}

function listView() {
  return `<header class="release-header page-header"><div><h1>${page === 'overview' ? 'Workspace overview' : 'Releases'}</h1><p>Review AI application releases and track evidence.</p></div>${action('New release', 'new', 'plus')}</header>
    <div class="table-wrap"><table><thead><tr><th scope="col">Release</th><th scope="col">Date</th><th scope="col">Team</th><th scope="col">Readiness</th></tr></thead><tbody>
    ${releases.map(release => `<tr><th scope="row"><button class="text-button row-title" data-action="release-${release.id}">${escape(release.title)} / ${escape(release.version)}</button>${release.sample ? '<small>Sample release</small>' : ''}</th><td>${date(release.date)}</td><td>${escape(release.team)}</td><td>${status(ready(release) ? 'Passed' : 'Needs attention')}</td></tr>`).join('')}
    </tbody></table></div>`;
}

function supportingView(release) {
  const title = navigation.find(item => item[0] === page)[1];
  let content;
  let primary = '';
  if (page === 'checks' || page === 'findings') {
    content = resultsTable(page === 'findings' ? release.results.filter(result => result.status !== 'Passed') : release.results);
  } else if (page === 'artifacts') {
    content = release.artifacts.length ? '<ul class="plain-list">' + release.artifacts.map(item => '<li>' + escape(item) + '</li>').join('') + '</ul><p class="sample-note">Sample artifact inventory</p>' : '<p class="empty">This release has fixture evidence only.</p>';
  } else if (page === 'fixtures') {
    primary = action('Replace and rerun', 'replace', 'upload-simple');
    content = '<ul class="plain-list">' + release.fixtures.map(fixture => '<li>' + escape(fixture.name) + '</li>').join('') + '</ul>';
  } else if (page === 'teams') {
    content = '<h2>Release ownership</h2><p>' + escape(release.team) + '</p><ul class="plain-list">' +
      release.results.map(result => '<li><button class="text-button row-title" data-action="check-' + result.id + '">' + escape(result.title) + '</button> <small>' + escape(release.owners[result.id] || 'Unassigned') + '</small></li>').join('') + '</ul>';
  } else {
    content = '<h2>Workspace data</h2><p>Releases are stored in the server database. This browser session controls access to its workspace.</p>';
    primary = action('Export release', 'export', 'download-simple');
  }
  return `<header class="release-header page-header"><div><h1>${title}</h1><p>${escape(release.title)} / ${escape(release.version)}</p></div>${primary}</header>${content}`;
}

function render(error = '') {
  const release = active();
  root.innerHTML = `<aside class="sidebar"><div class="brand">${icon('shield', true)} <span>Aegis Review</span></div>
    <nav aria-label="Workspace">${navigation.map(([key, label, symbol]) => '<button data-action="nav-' + key + '" class="nav-item" ' + (page === key ? 'aria-current="page"' : '') + '>' + icon(symbol) + escape(label) + '</button>').join('')}</nav>
    </aside><main id="main">${error ? '<p role="alert">' + escape(error) + '</p>' : !release ? '<p>Loading workspace…</p>' :
      page === 'overview' || (page === 'releases' && showList) ? listView() :
        page === 'releases' ? releaseView(release) : supportingView(release)}</main>`;
}

function openDrawer(title, content) {
  drawer.innerHTML = `<header><h2 id="dialog-title">${escape(title)}</h2><button data-action="close" class="icon-button" aria-label="Close">${icon('x')}</button></header><div class="drawer-body">${content}</div>`;
  if (!drawer.open) drawer.showModal();
}

function evidence() {
  const release = active();
  openDrawer('Release evidence', `<p>${escape(release.title)} / ${escape(release.version)} · ${release.fixtures.length} regression fixtures</p>
    <ul class="plain-list">${release.results.map(result => '<li><button class="text-button row-title" data-action="check-' + result.id + '">' + escape(result.title) + '</button>' + status(result.status) + '</li>').join('')}</ul>
    <div class="form-actions">${action('Replace and rerun', 'replace', 'upload-simple')}${action('Export evidence', 'export', 'download-simple', true)}</div>`);
}

function showCheck(id) {
  const release = active();
  const result = release.results.find(item => item.id === id);
  openDrawer(result.title, `${status(result.status)} <p>${escape(result.description)}</p>
    <h3>Recorded evidence</h3><p>${escape(evidenceText(result))} ${result.observed} observations recorded.</p>
    ${result.failed.length ? '<ul class="plain-list">' + result.failed.map(name => '<li>' + escape(name) + '</li>').join('') + '</ul>' : ''}
    ${result.status !== 'Passed' ? '<h3>Remediation</h3><p>' + escape(result.missing && !result.failed.length ? 'Supply the missing observations and rerun the review.' : result.fix) + '</p>' : ''}
    <form data-form="owner" data-check="${result.id}"><label>Remediation owner<input required maxlength="100" name="owner" value="${escape(release.owners[id])}" placeholder="Team or person"></label>
    <p class="form-error" role="alert"></p><button class="button" type="submit">Save owner</button></form>`);
}

const example = JSON.stringify([{ name: 'Standard request', protectedDataRedacted: true, outputSchemaValid: true, toolScopeAllowed: true, humanApprovalEnforced: true }], null, 2);
function fixtureForm(replace) {
  openDrawer(replace ? 'Replace regression fixtures' : 'New release', `
    <form data-form="${replace ? 'replace' : 'new'}">
      ${replace ? '<p>Upload a complete replacement set. The release status is recalculated from the new observations.</p>' :
      '<label>Application<input required maxlength="100" name="title" placeholder="Support Assistant"></label><label>Version<input required maxlength="40" name="version" placeholder="v2.9"></label><label>Team<input required maxlength="100" name="team" placeholder="AI Engineering"></label>'}
      <label>Regression fixtures (JSON)<textarea required name="fixtures" rows="11" spellcheck="false" placeholder="${escape(example)}"></textarea></label>
      <label>Load a JSON file<input type="file" name="file" accept=".json,application/json"></label>
      ${action('Use sample fixture', 'example', '', true)}
      <p class="form-error" role="alert"></p><button class="button" type="submit">${replace ? 'Rerun checks' : 'Create and review release'}</button>
    </form>`);
}

function exportRelease() {
  const release = active();
  const url = URL.createObjectURL(new Blob([JSON.stringify(release, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'aegis-release-' + release.id + '.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announcement.textContent = 'Release evidence exported.';
}

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || busy || !active()) return;
  const command = button.dataset.action;
  if (command === 'close') return drawer.close();
  if (command === 'evidence') return evidence();
  if (command === 'export') return exportRelease();
  if (command === 'new' || command === 'replace') return fixtureForm(command === 'replace');
  if (command === 'example') { drawer.querySelector('textarea').value = example; return; }
  if (command.startsWith('check-')) return showCheck(command.slice(6));
  if (command.startsWith('nav-')) {
    page = command.slice(4);
    showList = page === 'releases';
  } else if (command === 'list') {
    showList = true;
  } else if (command.startsWith('release-')) {
    selectedId = command.slice(8);
    page = 'releases';
    showList = false;
  }
  render();
});

drawer.addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const form = event.target.form;
  if (file.size > 128 * 1024) {
    form.querySelector('.form-error').textContent = 'Choose a JSON file of at most 128 KB.';
    return;
  }
  try {
    form.elements.fixtures.value = await file.text();
    form.querySelector('.form-error').textContent = '';
  } catch {
    form.querySelector('.form-error').textContent = 'Unable to read the file.';
  }
});

drawer.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const form = event.target;
  const fields = Object.fromEntries(new FormData(form));
  const mode = form.dataset.form;
  const submit = form.querySelector('[type=submit]');
  busy = true;
  submit.disabled = true;
  form.querySelector('.form-error').textContent = '';
  try {
    let release;
    if (mode === 'owner') {
      release = await api('releases/' + active().id + '/owners', { owner: fields.owner, check: form.dataset.check });
    } else {
      let fixtures;
      try { fixtures = JSON.parse(fields.fixtures); }
      catch { throw new Error('Enter a valid JSON array.'); }
      release = mode === 'new' ? await api('releases', { title: fields.title, version: fields.version, team: fields.team, fixtures }) :
        await api('releases/' + active().id + '/fixtures', { fixtures });
    }
    releases = mode === 'new' ? [release, ...releases] : releases.map(item => item.id === release.id ? release : item);
    selectedId = release.id;
    if (mode !== 'owner') { page = 'releases'; showList = false; }
    drawer.close();
    render();
    const focus = root.querySelector('[data-action="' + (mode === 'owner' ? 'check-' + form.dataset.check : 'evidence') + '"]');
    focus?.focus();
    announcement.textContent = mode === 'owner' ? 'Remediation owner saved.' : 'Release checks updated.';
  } catch (error) {
    form.querySelector('.form-error').textContent = error.message;
  } finally {
    busy = false;
    submit.disabled = false;
  }
});

render();
try {
  releases = await api('releases');
  render();
} catch {
  render('Unable to load the workspace. Refresh to try again.');
}
