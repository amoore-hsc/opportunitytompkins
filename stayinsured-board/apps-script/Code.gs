/**
 * Stay Insured Navigator Board: Google Sheets backend.
 *
 * Lives inside the navigator spreadsheet (Extensions > Apps Script).
 * - Menu "Navigator Board" sets up the tabs, syncs calendars, and connects SimplyBook.me.
 * - A 15-minute timer pulls open times from Cal.com, calendar feeds (ICS) and SimplyBook.me
 *   into the "Openings" tab.
 * - Deployed as a web app, it serves the board page and its data (add ?format=json for raw data).
 *
 * Everything here runs on Google's free tier. No secrets are stored in the sheet:
 * the SimplyBook.me API key is kept in Script Properties, and private calendar links in the
 * "feed_details" column are never sent to the public page.
 */

const TZ = 'America/New_York';
const DAYS_AHEAD = 14;
const CACHE_KEY = 'board-v1';
const CACHE_SECONDS = 120;

const SHEETS = {
  nav: 'Navigators',
  sched: 'Schedule',
  open: 'Openings',
  closed: 'Closures',
  settings: 'Settings',
  sb: 'SimplyBook IDs',
};

// Column keys. The sheet shows friendly headings (see labelOf); the script matches them back to these keys,
// so columns can be reordered or widened freely as long as the heading text stays the same.
const NAV_HEADERS = [
  'name', 'status', 'note', 'out_today', 'last_updated',
  'id', 'organization', 'short_name', 'phone', 'email', 'other_contact',
  'booking_link', 'booking_link_text', 'website', 'website_text',
  'counties', 'anywhere_in_ny', 'languages', 'help_by', 'show_on_board',
  'feed_type', 'feed_details', 'slot_minutes', 'last_synced', 'sync_message',
];
// Columns the public page never sees (private calendar links, sync errors).
const PRIVATE_NAV = ['feed_details', 'sync_message'];
// Columns navigators edit themselves; editing one stamps last_updated.
const NAVIGATOR_OWNED = ['status', 'note', 'out_today'];

const SCHED_HEADERS = [
  'navigator_id', 'site', 'address', 'pattern', 'days', 'week_of_month', 'first_date',
  'start_time', 'end_time', 'help_by', 'takes_appointments', 'main_hours', 'note',
];
const OPEN_HEADERS = ['navigator_id', 'start', 'site', 'source'];
const CLOSED_HEADERS = ['date', 'navigator_id', 'reason'];
const SETTINGS_HEADERS = ['setting', 'value', 'what_it_does'];

const LABEL_OVERRIDES = {
  id: 'ID', navigator_id: 'Navigator ID', anywhere_in_ny: 'Anywhere in NY', note: 'Note',
};
function labelOf(key) {
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
  const s = key.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function keyOf(label) {
  return String(label).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function headerKeys(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(keyOf);
}

// Explanations shown when hovering a column heading.
const HEADER_NOTES = {
  name: 'Navigator\'s name as residents should see it.',
  status: 'Automatic = based on open appointments from a connected calendar. Or set it yourself: Accepting, Limited openings, Full / waitlist, Away.',
  note: 'Optional short note for the public, e.g. "Extra walk-in hours Thursday until 4 pm". Clear it when it no longer applies.',
  out_today: 'Pick today\'s date if you\'re out today. Your sessions for that day are hidden from the board.',
  last_updated: 'Filled in automatically when Status, Note or Out today changes.',
  id: 'Short code that links this navigator to their Schedule rows. Don\'t change it once set.',
  short_name: 'Short organization name for the table.',
  other_contact: 'A second contact, if any (name, phone, email).',
  booking_link: 'Public booking or request page, if any.',
  counties: 'Counties served, separated by commas.',
  anywhere_in_ny: 'yes if they can help anyone living in New York State.',
  languages: 'Languages, separated by commas.',
  help_by: 'Any of: In person, Phone, Walk-in, Video, Home visit, Community sites.',
  show_on_board: 'no hides this navigator from the board.',
  feed_type: 'Where open appointments come from. Manual and Booking form link don\'t list openings.',
  feed_details: 'PRIVATE, never shown on the board. Cal.com: username/event-name (or "Site = username/event-name; ..."). Calendar feed: the secret .ics address. SimplyBook.me: "Site = serviceID:providerID".',
  slot_minutes: 'Appointment length, used for calendar feeds.',
  last_synced: 'Filled in by the sync.',
  sync_message: 'Filled in by the sync. Shows problems with a feed.',
  pattern: 'Weekly, Every other week, Nth weekday of month, Last weekday of month, or Call for hours.',
  days: 'Mon, Tue, Wed, Thu, Fri (comma-separated). One day for monthly or every-other-week patterns.',
  week_of_month: 'For "Nth weekday of month": 1, 2, 3 or 4.',
  first_date: 'For "Every other week": any date the session happens.',
  start_time: 'e.g. 9:00 am',
  end_time: 'e.g. 2:30 pm',
  takes_appointments: 'yes if people can book appointments here (no for walk-in only).',
  main_hours: 'yes for regular office hours. Outreach visits that overlap main hours take priority.',
};

const FEED_TYPES = ['Cal.com', 'Calendar feed (ICS)', 'SimplyBook.me', 'Booking form link', 'Manual'];
const SYNCED_FEEDS = ['Cal.com', 'Calendar feed (ICS)', 'SimplyBook.me'];
const STATUSES = ['Automatic', 'Accepting', 'Limited openings', 'Full / waitlist', 'Away'];
const PATTERNS = ['Weekly', 'Every other week', 'Nth weekday of month', 'Last weekday of month', 'Call for hours'];
const DAY_CODES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/* ------------------------------------------------------------------ menu */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Navigator Board')
    .addItem('Set up this spreadsheet', 'setupSpreadsheet')
    .addItem('Sync calendars now', 'syncAll')
    .addItem('Turn on automatic sync (every 15 minutes)', 'installTriggers')
    .addSeparator()
    .addItem('Connect SimplyBook.me', 'connectSimplyBook')
    .addItem('List SimplyBook.me services and providers', 'listSimplyBook')
    .addToUi();
}

/** Stamps last_updated when a navigator edits their status, note or "out today". */
function onEdit(e) {
  try {
    const sh = e.range.getSheet();
    if (sh.getName() !== SHEETS.nav || e.range.getRow() < 2) return;
    const headers = headerKeys(sh);
    const first = e.range.getColumn();
    const last = first + e.range.getNumColumns() - 1;
    const touched = NAVIGATOR_OWNED.some(h => {
      const c = headers.indexOf(h) + 1;
      return c >= first && c <= last;
    });
    if (!touched) return;
    const stampCol = headers.indexOf('last_updated') + 1;
    if (stampCol > 0) {
      for (let r = e.range.getRow(); r < e.range.getRow() + e.range.getNumRows(); r++) {
        sh.getRange(r, stampCol).setValue(new Date());
      }
    }
    CacheService.getScriptCache().remove(CACHE_KEY);
  } catch (err) {
    // Simple triggers must never block an edit.
  }
}

/* ----------------------------------------------------------------- setup */

function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);

  const nav = ensureSheet(ss, SHEETS.nav, NAV_HEADERS);
  const sched = ensureSheet(ss, SHEETS.sched, SCHED_HEADERS);
  ensureSheet(ss, SHEETS.open, OPEN_HEADERS);
  const closed = ensureSheet(ss, SHEETS.closed, CLOSED_HEADERS);
  const settings = ensureSheet(ss, SHEETS.settings, SETTINGS_HEADERS);

  // Keep times, days and IDs as typed (stops Sheets from turning "9:00 am" into a date).
  textColumns(sched, SCHED_HEADERS, ['days', 'week_of_month', 'first_date', 'start_time', 'end_time']);
  textColumns(nav, NAV_HEADERS, ['id', 'phone', 'slot_minutes', 'feed_details']);

  if (nav.getLastRow() < 2) {
    const rows = SEED_NAVIGATORS.map(o => NAV_HEADERS.map(h => (o[h] == null ? '' : o[h])));
    nav.getRange(2, 1, rows.length, NAV_HEADERS.length).setValues(rows);
  }
  if (sched.getLastRow() < 2) {
    sched.getRange(2, 1, SEED_SCHEDULE.length, SCHED_HEADERS.length).setValues(SEED_SCHEDULE);
  }
  if (closed.getLastRow() < 2) {
    closed.getRange(2, 1, SEED_CLOSURES.length, CLOSED_HEADERS.length).setValues(SEED_CLOSURES);
  }
  if (settings.getLastRow() < 2) {
    settings.getRange(2, 1, SEED_SETTINGS.length, SETTINGS_HEADERS.length).setValues(SEED_SETTINGS);
  }

  dropdown(nav, NAV_HEADERS, 'status', STATUSES);
  dropdown(nav, NAV_HEADERS, 'feed_type', FEED_TYPES);
  dropdown(nav, NAV_HEADERS, 'anywhere_in_ny', ['yes', 'no']);
  dropdown(nav, NAV_HEADERS, 'show_on_board', ['yes', 'no']);
  dateColumn(nav, NAV_HEADERS, 'out_today');
  dropdown(sched, SCHED_HEADERS, 'pattern', PATTERNS);
  dropdown(sched, SCHED_HEADERS, 'takes_appointments', ['yes', 'no']);
  dropdown(sched, SCHED_HEADERS, 'main_hours', ['yes', 'no']);
  dateColumn(closed, CLOSED_HEADERS, 'date');

  formatSheets(ss);
  CacheService.getScriptCache().remove(CACHE_KEY);
  SpreadsheetApp.getUi().alert(
    'The spreadsheet is ready. Next: Deploy > New deployment > Web app (Execute as: Me, ' +
    'Who has access: Anyone). Then use "Turn on automatic sync" from this menu.');
}

function ensureSheet(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers.map(labelOf)]);
    sh.setFrozenRows(1);
  }
  return sh;
}
function colOf(headers, name) { return headers.indexOf(name) + 1; } // headers: key list in sheet order
function textColumns(sh, headers, names) {
  names.forEach(n => sh.getRange(2, colOf(headers, n), sh.getMaxRows() - 1, 1).setNumberFormat('@'));
}
function dropdown(sh, headers, name, values) {
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
  sh.getRange(2, colOf(headers, name), sh.getMaxRows() - 1, 1).setDataValidation(rule);
}
function dateColumn(sh, headers, name) {
  const rule = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build();
  sh.getRange(2, colOf(headers, name), sh.getMaxRows() - 1, 1).setDataValidation(rule).setNumberFormat('mmm d, yyyy');
}

function installTriggers() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'syncAll')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncAll').timeBased().everyMinutes(15).create();
  SpreadsheetApp.getUi().alert('Automatic sync is on. Calendars will be checked every 15 minutes.');
}

/* ------------------------------------------------------------ formatting */

const COLORS = {
  header: '#0b6f6a', headerText: '#ffffff', navigatorCols: '#fff8e1', auto: '#f1f3f4', autoText: '#5f6368',
  open: ['#e0f2e7', '#1d7f47'], limited: ['#fbefd6', '#9a6400'], full: ['#f9e1de', '#b4352a'], away: ['#e6eaec', '#5e6b73'],
};
const WIDTHS = {
  name: 160, status: 140, note: 280, out_today: 110, last_updated: 140, id: 120, organization: 240, short_name: 170,
  phone: 150, email: 230, other_contact: 260, booking_link: 230, booking_link_text: 180, website: 230, website_text: 180,
  counties: 230, anywhere_in_ny: 110, languages: 200, help_by: 220, show_on_board: 110, feed_type: 160, feed_details: 260,
  slot_minutes: 100, last_synced: 140, sync_message: 260,
  navigator_id: 140, site: 260, address: 260, pattern: 190, days: 190, week_of_month: 110, first_date: 110,
  start_time: 100, end_time: 100, takes_appointments: 130, main_hours: 110,
  start: 180, source: 150, date: 120, reason: 200, setting: 160, value: 260, what_it_does: 520,
};

/** Makes every tab easy to read: colored headings, set widths, banding, hover notes, status colors. */
function formatSheets(ss) {
  Object.keys(SHEETS).forEach(k => {
    const sh = ss.getSheetByName(SHEETS[k]);
    if (!sh || sh.getLastColumn() === 0) return;
    const keys = headerKeys(sh);
    const width = keys.length;
    const head = sh.getRange(1, 1, 1, width);
    head.setBackground(COLORS.header).setFontColor(COLORS.headerText).setFontWeight('bold')
      .setVerticalAlignment('middle').setWrap(true);
    sh.setRowHeight(1, 36);
    sh.setFrozenRows(1);
    keys.forEach((key, i) => {
      if (WIDTHS[key]) sh.setColumnWidth(i + 1, WIDTHS[key]);
      if (HEADER_NOTES[key]) sh.getRange(1, i + 1).setNote(HEADER_NOTES[key]);
    });
    sh.getBandings().forEach(b => b.remove());
    sh.getRange(1, 1, Math.max(sh.getMaxRows(), 2), width)
      .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
      .setHeaderRowColor(COLORS.header);
    sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), width).setVerticalAlignment('top').setWrap(true);
    // Hide unused columns past the table so the sheet feels finished.
    if (sh.getMaxColumns() > width) sh.hideColumns(width + 1, sh.getMaxColumns() - width);
  });

  const nav = ss.getSheetByName(SHEETS.nav);
  const keys = headerKeys(nav);
  const rows = Math.max(nav.getMaxRows() - 1, 1);
  nav.setFrozenColumns(1);
  // Navigator-edited columns get a soft yellow heading so people know where to type.
  NAVIGATOR_OWNED.forEach(k => nav.getRange(1, colOf(keys, k)).setBackground('#f4b400').setFontColor('#1f1f1f'));
  nav.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(pr => { if (pr.getDescription() === 'Filled in automatically') pr.remove(); });
  // Columns the script fills in are grey, and editing them shows a warning.
  ['last_updated', 'last_synced', 'sync_message'].forEach(k => {
    const c = colOf(keys, k);
    if (!c) return;
    nav.getRange(2, c, rows, 1).setFontColor(COLORS.autoText).setFontStyle('italic');
    nav.getRange(2, c, rows, 1).protect().setDescription('Filled in automatically').setWarningOnly(true);
  });
  ['last_updated', 'last_synced'].forEach(k => nav.getRange(2, colOf(keys, k), rows, 1).setNumberFormat('mmm d, h:mm am/pm'));
  // Status colors.
  const statusRange = nav.getRange(2, colOf(keys, 'status'), rows, 1);
  const cf = [
    ['Accepting', COLORS.open], ['Limited openings', COLORS.limited], ['Full / waitlist', COLORS.full], ['Away', COLORS.away],
  ].map(([text, c]) => SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text)
    .setBackground(c[0]).setFontColor(c[1]).setBold(true).setRanges([statusRange]).build());
  nav.setConditionalFormatRules(cf);
  nav.getRange(2, colOf(keys, 'feed_details'), rows, 1).setFontColor('#a50e0e');

  const open = ss.getSheetByName(SHEETS.open);
  if (open) {
    open.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(pr => pr.remove());
    open.protect().setDescription('Written by the calendar sync').setWarningOnly(true);
    open.setTabColor('#9aa0a6');
  }
  nav.setTabColor(COLORS.header);
  ss.getSheetByName(SHEETS.sched).setTabColor('#4cc2b8');
  ss.setActiveSheet(nav);
}

/* --------------------------------------------------------------- reading */

/** Reads a tab into objects keyed by header. Text uses what's displayed; dates keep raw values. */
function readTable(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  const range = sh.getDataRange();
  const raw = range.getValues();
  const shown = range.getDisplayValues();
  const headers = shown[0].map(keyOf);
  const out = [];
  for (let i = 1; i < shown.length; i++) {
    if (shown[i].every(v => v === '')) continue;
    const o = { _row: i + 1 };
    headers.forEach((h, j) => { o[h] = String(shown[i][j]).trim(); o['_raw_' + h] = raw[i][j]; });
    out.push(o);
  }
  return out;
}
function setCell(sh, row, header, value) {
  const c = headerKeys(sh).indexOf(header) + 1;
  if (c > 0) sh.getRange(row, c).setValue(value);
}
function fmt(d, pattern) { return Utilities.formatDate(d, TZ, pattern); }
function dateKey(v) {
  if (v instanceof Date && !isNaN(v)) return fmt(v, 'yyyy-MM-dd');
  const s = String(v || '').trim();
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d) ? '' : fmt(d, 'yyyy-MM-dd');
}
function isoOrBlank(v) {
  if (v instanceof Date && !isNaN(v)) return v.toISOString();
  return '';
}
function yes(v) { return /^(y|yes|true|x)$/i.test(String(v || '').trim()); }

/* --------------------------------------------------------- schedule rules */

function parseTime(s) {
  const m = String(s || '').trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!m) return null;
  let h = +m[1];
  const min = +(m[2] || 0);
  if (m[3] && m[3][0] === 'p' && h < 12) h += 12;
  if (m[3] && m[3][0] === 'a' && h === 12) h = 0;
  return h * 60 + min;
}
function parseDays(s) {
  return String(s || '').toLowerCase().split(/[,\s/]+/).map(x => DAY_CODES.indexOf(x.slice(0, 3))).filter(x => x >= 0);
}
function dayDiff(a, b) {
  const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((db - da) / 864e5);
}
function ruleHits(row, d) {
  const days = parseDays(row.days);
  const dow = d.getDay();
  switch (row.pattern) {
    case 'Weekly': return days.indexOf(dow) >= 0;
    case 'Every other week': {
      const anchor = row._raw_first_date instanceof Date ? row._raw_first_date : new Date(row.first_date + 'T00:00:00');
      return days.indexOf(dow) >= 0 && !isNaN(anchor) && Math.abs(dayDiff(anchor, d)) % 14 === 0;
    }
    case 'Nth weekday of month': return days.indexOf(dow) >= 0 && Math.ceil(d.getDate() / 7) === +row.week_of_month;
    case 'Last weekday of month': {
      const n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
      return days.indexOf(dow) >= 0 && n.getMonth() !== d.getMonth();
    }
    default: return false;
  }
}
/** Sessions for one day. Outreach sessions carve their time out of "main hours" sessions. */
function sessionsFor(rows, d) {
  const hits = rows.filter(r => ruleHits(r, d));
  const specific = hits.filter(r => !yes(r.main_hours)).map(r => ({ row: r, start: parseTime(r.start_time), end: parseTime(r.end_time) }));
  const out = specific.slice();
  hits.filter(r => yes(r.main_hours)).forEach(r => {
    let segs = [[parseTime(r.start_time), parseTime(r.end_time)]];
    if (segs[0][0] == null || segs[0][1] == null) return;
    specific.filter(x => x.start != null && x.end != null).forEach(x => {
      const next = [];
      segs.forEach(([a, b]) => {
        if (x.end <= a || x.start >= b) { next.push([a, b]); return; }
        if (x.start > a) next.push([a, x.start]);
        if (x.end < b) next.push([x.end, b]);
      });
      segs = next;
    });
    segs.filter(([a, b]) => b - a >= 30).forEach(([a, b]) => out.push({ row: r, start: a, end: b }));
  });
  return out;
}

/* ------------------------------------------------------------------ sync */

function syncAll() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    const ss = SpreadsheetApp.getActive();
    const navSh = ss.getSheetByName(SHEETS.nav);
    const openSh = ss.getSheetByName(SHEETS.open);
    const navs = readTable(navSh);
    const sched = readTable(ss.getSheetByName(SHEETS.sched));
    const closures = readTable(ss.getSheetByName(SHEETS.closed));
    const existing = readTable(openSh);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const until = new Date(today.getFullYear(), today.getMonth(), today.getDate() + DAYS_AHEAD);
    const synced = {};
    const fresh = [];

    navs.forEach(n => {
      if (!n.id || SYNCED_FEEDS.indexOf(n.feed_type) < 0) return;
      if (!n.feed_details && n.feed_type !== 'SimplyBook.me') {
        setCell(navSh, n._row, 'sync_message', 'Waiting for feed_details');
        return;
      }
      const rows = sched.filter(r => r.navigator_id === n.id);
      const closedDays = closures.filter(c => !c.navigator_id || c.navigator_id === n.id).map(c => dateKey(c._raw_date));
      try {
        let found;
        if (n.feed_type === 'Cal.com') found = syncCalcom(n, rows, now, until);
        else if (n.feed_type === 'Calendar feed (ICS)') found = syncIcs(n, rows, closedDays, now, today, until);
        else found = syncSimplyBook(n, rows, now, until);
        found = found.filter(f => f.start > now && closedDays.indexOf(fmt(f.start, 'yyyy-MM-dd')) < 0);
        found.forEach(f => fresh.push([n.id, f.start.toISOString(), f.site, n.feed_type]));
        synced[n.id] = true;
        setCell(navSh, n._row, 'last_synced', now);
        setCell(navSh, n._row, 'sync_message', 'OK: ' + found.length + ' openings in the next ' + DAYS_AHEAD + ' days');
      } catch (err) {
        setCell(navSh, n._row, 'sync_message', 'Problem: ' + (err && err.message ? err.message : err));
      }
    });

    // Keep earlier openings for navigators whose sync failed this round, so one bad feed doesn't blank a card.
    const kept = existing
      .filter(r => !synced[r.navigator_id] && new Date(r.start) > now)
      .map(r => OPEN_HEADERS.map(h => r[h]));
    const all = kept.concat(fresh).sort((a, b) => (a[1] < b[1] ? -1 : 1));
    if (openSh.getLastRow() > 1) openSh.getRange(2, 1, openSh.getLastRow() - 1, OPEN_HEADERS.length).clearContent();
    if (all.length) openSh.getRange(2, 1, all.length, OPEN_HEADERS.length).setValues(all);
    CacheService.getScriptCache().remove(CACHE_KEY);
  } finally {
    lock.releaseLock();
  }
}

/** feed_details like "Catholic Charities = christy/catholic-charities; Free Clinic = christy/free-clinic" or just "christy/intake". */
function parseFeedDetails(s) {
  return String(s || '').split(/[;\n]+/).map(x => x.trim()).filter(Boolean).map(x => {
    const i = x.indexOf('=');
    return i > 0 ? { site: x.slice(0, i).trim(), ref: x.slice(i + 1).trim() } : { site: '', ref: x };
  });
}
function defaultSite(rows) {
  const main = rows.filter(r => yes(r.main_hours))[0];
  return main ? main.site : 'By appointment';
}
function qs(o) { return Object.keys(o).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(o[k])).join('&'); }

/* Cal.com: public availability for each event type, no login needed. */
function syncCalcom(n, rows, now, until) {
  const out = [];
  parseFeedDetails(n.feed_details).forEach(item => {
    const parts = item.ref.replace(/^https?:\/\/(app\.)?cal\.com\//, '').split('/').map(s => s.trim()).filter(Boolean);
    if (parts.length < 2) throw new Error('Cal.com details should look like username/event-name (got "' + item.ref + '")');
    const url = 'https://api.cal.com/v2/slots?' + qs({
      username: parts[0], eventTypeSlug: parts[1],
      start: fmt(now, 'yyyy-MM-dd'), end: fmt(until, 'yyyy-MM-dd'), timeZone: TZ,
    });
    const resp = UrlFetchApp.fetch(url, { headers: { 'cal-api-version': '2024-09-04' }, muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) throw new Error('Cal.com answered ' + resp.getResponseCode() + ' for ' + item.ref);
    const body = JSON.parse(resp.getContentText());
    const data = (body.data && body.data.slots) || body.data || body.slots || {};
    Object.keys(data).forEach(day => (data[day] || []).forEach(s => {
      const t = new Date(typeof s === 'string' ? s : (s.start || s.time));
      if (!isNaN(t)) out.push({ start: t, site: item.site || defaultSite(rows) });
    }));
  });
  return out;
}

/* Calendar feed (ICS): posted hours from the Schedule tab, minus busy events on the calendar. */
function syncIcs(n, rows, closedDays, now, today, until) {
  const url = String(n.feed_details).trim().replace(/^webcal:\/\//i, 'https://');
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (resp.getResponseCode() !== 200) throw new Error('Calendar link answered ' + resp.getResponseCode());
  const text = resp.getContentText();
  if (text.indexOf('BEGIN:VCALENDAR') < 0) throw new Error('That link is not a calendar feed (.ics)');
  const busy = busyIntervals(parseIcs(text), today, until);
  const slotMin = +n.slot_minutes || 30;
  const out = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    if (closedDays.indexOf(fmt(d, 'yyyy-MM-dd')) >= 0) continue;
    sessionsFor(rows, d).forEach(s => {
      if (!yes(s.row.takes_appointments) || s.start == null || s.end == null) return;
      for (let t = s.start; t + slotMin <= s.end; t += slotMin) {
        const a = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, t).getTime();
        const b = a + slotMin * 60000;
        if (a <= now.getTime()) continue;
        if (busy.some(iv => iv[0] < b && iv[1] > a)) continue;
        out.push({ start: new Date(a), site: s.row.site });
      }
    });
  }
  return out;
}

function parseIcs(text) {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events = [];
  let cur = null;
  lines.forEach(line => {
    if (line === 'BEGIN:VEVENT') { cur = { exdates: [] }; return; }
    if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; return; }
    if (!cur) return;
    const i = line.indexOf(':');
    if (i < 0) return;
    const left = line.slice(0, i);
    const val = line.slice(i + 1);
    const name = left.split(';')[0].toUpperCase();
    if (name === 'DTSTART') { cur.start = icsDate(val); cur.allDay = /^\d{8}$/.test(val); }
    else if (name === 'DTEND') cur.end = icsDate(val);
    else if (name === 'DURATION') cur.duration = val;
    else if (name === 'RRULE') cur.rrule = val;
    else if (name === 'EXDATE') val.split(',').forEach(v => { const d = icsDate(v); if (d) cur.exdates.push(d.getTime()); });
    else if (name === 'STATUS') cur.status = val.toUpperCase();
    else if (name === 'TRANSP') cur.transp = val.toUpperCase();
  });
  return events;
}
/* Times without "Z" are read as local (Eastern) time, which fits local navigators' calendars. */
function icsDate(v) {
  const m = String(v).match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
  if (!m) return null;
  if (!m[4]) return new Date(+m[1], +m[2] - 1, +m[3]);
  if (m[7]) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
}
function durationMs(s) {
  const m = String(s || '').match(/P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
  if (!m) return 0;
  return ((+m[1] || 0) * 7 * 1440 + (+m[2] || 0) * 1440 + (+m[3] || 0) * 60 + (+m[4] || 0)) * 60000;
}
/** Busy [start, end] ms intervals in the window. Expands daily and weekly repeats; monthly repeats count once. */
function busyIntervals(events, from, to) {
  const out = [];
  const lo = from.getTime();
  const hi = to.getTime();
  events.forEach(ev => {
    if (!ev.start || ev.status === 'CANCELLED' || ev.transp === 'TRANSPARENT') return;
    const len = ev.end ? ev.end - ev.start : (ev.duration ? durationMs(ev.duration) : (ev.allDay ? 864e5 : 0));
    const push = s => {
      if (ev.exdates.indexOf(s.getTime()) >= 0) return;
      const a = s.getTime();
      const b = a + len;
      if (b > lo && a < hi) out.push([a, b]);
    };
    if (!ev.rrule) { push(ev.start); return; }
    const r = {};
    ev.rrule.split(';').forEach(p => { const kv = p.split('='); r[kv[0].toUpperCase()] = kv[1]; });
    if (r.FREQ !== 'DAILY' && r.FREQ !== 'WEEKLY') { push(ev.start); return; }
    const interval = +(r.INTERVAL || 1);
    const until = r.UNTIL ? icsDate(r.UNTIL) : null;
    let count = r.COUNT ? +r.COUNT : Infinity;
    const byday = r.BYDAY ? r.BYDAY.split(',').map(x => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].indexOf(x.slice(-2))) : null;
    const days = byday || [ev.start.getDay()];
    const startDay = new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate());
    for (let i = 0; i < 20000 && count > 0; i++) {
      const d = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate() + i);
      if (d.getTime() > hi || (until && d > until)) break;
      let hit;
      if (r.FREQ === 'DAILY') hit = i % interval === 0 && (!byday || byday.indexOf(d.getDay()) >= 0);
      else hit = Math.floor((i + startDay.getDay()) / 7) % interval === 0 && days.indexOf(d.getDay()) >= 0;
      if (!hit) continue;
      const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), ev.start.getHours(), ev.start.getMinutes());
      if (s < ev.start) continue;
      count--;
      push(s);
    }
  });
  return out;
}

/* SimplyBook.me: open start times for a service (and optional provider). */
function sbCall(method, params) {
  const p = PropertiesService.getScriptProperties();
  const company = p.getProperty('SIMPLYBOOK_COMPANY');
  const key = p.getProperty('SIMPLYBOOK_API_KEY');
  if (!company || !key) throw new Error('SimplyBook.me isn\'t connected yet. Use Navigator Board > Connect SimplyBook.me');
  const rpc = (url, m, prm, headers) => {
    const resp = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json', headers: headers || {}, muteHttpExceptions: true,
      payload: JSON.stringify({ jsonrpc: '2.0', method: m, params: prm, id: 1 }),
    });
    const body = JSON.parse(resp.getContentText() || '{}');
    if (body.error) throw new Error('SimplyBook.me: ' + (body.error.message || JSON.stringify(body.error)));
    return body.result;
  };
  const cache = CacheService.getScriptCache();
  let token = cache.get('sb-token');
  if (!token) {
    token = rpc('https://user-api.simplybook.me/login', 'getToken', [company, key]);
    cache.put('sb-token', token, 1800);
  }
  return rpc('https://user-api.simplybook.me', method, params, { 'X-Company-Login': company, 'X-Token': token });
}
/** feed_details like "Main HSC Office = 3:1; Seven Valleys = 4" (service ID : provider ID). */
function syncSimplyBook(n, rows, now, until) {
  const items = parseFeedDetails(n.feed_details);
  if (!items.length) throw new Error('Add service IDs in feed_details, e.g. "Main HSC Office = 3:1". See the "SimplyBook IDs" tab.');
  const out = [];
  items.forEach(item => {
    const ids = item.ref.split(':').map(s => s.trim());
    const matrix = sbCall('getStartTimeMatrix', [fmt(now, 'yyyy-MM-dd'), fmt(until, 'yyyy-MM-dd'), ids[0], ids[1] || null, 1]) || {};
    Object.keys(matrix).forEach(day => (matrix[day] || []).forEach(time => {
      const d = day.split('-').map(Number);
      const t = String(time).split(':').map(Number);
      out.push({ start: new Date(d[0], d[1] - 1, d[2], t[0], t[1] || 0), site: item.site || defaultSite(rows) });
    }));
  });
  return out;
}

function connectSimplyBook() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt('Connect SimplyBook.me', 'Company login (the part before .simplybook.me in your booking address):', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const b = ui.prompt('Connect SimplyBook.me', 'API key (SimplyBook.me admin > Custom Features > API > Settings):', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  const p = PropertiesService.getScriptProperties();
  p.setProperty('SIMPLYBOOK_COMPANY', a.getResponseText().trim());
  p.setProperty('SIMPLYBOOK_API_KEY', b.getResponseText().trim());
  CacheService.getScriptCache().remove('sb-token');
  try {
    sbCall('getEventList', []);
    ui.alert('Connected to SimplyBook.me. Next: "List SimplyBook.me services and providers" to find the IDs.');
  } catch (err) {
    ui.alert('That didn\'t connect: ' + err.message);
  }
}

function listSimplyBook() {
  const events = sbCall('getEventList', []) || {};
  const units = sbCall('getUnitList', []) || {};
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.sb) || ss.insertSheet(SHEETS.sb);
  sh.clear();
  const rows = [['kind', 'id', 'name']];
  Object.keys(events).forEach(k => rows.push(['service', events[k].id, events[k].name]));
  Object.keys(units).forEach(k => rows.push(['provider', units[k].id, units[k].name]));
  sh.getRange(1, 1, rows.length, 3).setValues(rows);
  sh.getRange(1, 1, 1, 3).setFontWeight('bold');
  ss.setActiveSheet(sh);
}

/* ------------------------------------------------------------- web app */

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.format !== 'json') {
    try {
      return HtmlService.createHtmlOutputFromFile('Page')
        .setTitle('Stay Insured Navigator Board')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      // No "Page" file in this project: fall through to data.
    }
  }
  return ContentService.createTextOutput(JSON.stringify(getBoardData())).setMimeType(ContentService.MimeType.JSON);
}

/** Public board data. Also called directly by the page when it's served from this script. */
function getBoardData() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(CACHE_KEY);
  if (hit) return JSON.parse(hit);

  const ss = SpreadsheetApp.getActive();
  const now = new Date();
  const navigators = readTable(ss.getSheetByName(SHEETS.nav))
    .filter(n => n.id && !/^no$/i.test(n.show_on_board))
    .map(n => {
      const o = {};
      NAV_HEADERS.filter(h => PRIVATE_NAV.indexOf(h) < 0).forEach(h => { o[h] = n[h] || ''; });
      o.out_today = dateKey(n._raw_out_today);
      o.last_updated = isoOrBlank(n._raw_last_updated);
      o.last_synced = isoOrBlank(n._raw_last_synced);
      return o;
    });
  const schedule = readTable(ss.getSheetByName(SHEETS.sched)).map(r => {
    const o = {};
    SCHED_HEADERS.forEach(h => { o[h] = r[h] || ''; });
    o.first_date = dateKey(r._raw_first_date);
    return o;
  });
  const openings = readTable(ss.getSheetByName(SHEETS.open))
    .filter(r => new Date(r.start) > now)
    .map(r => ({ navigator_id: r.navigator_id, start: r.start, site: r.site }));
  const closures = readTable(ss.getSheetByName(SHEETS.closed))
    .map(r => ({ date: dateKey(r._raw_date), navigator_id: r.navigator_id, reason: r.reason }))
    .filter(r => r.date);
  const settings = {};
  readTable(ss.getSheetByName(SHEETS.settings)).forEach(r => { if (r.setting) settings[r.setting] = r.value; });

  const data = { generated: now.toISOString(), navigators, schedule, openings, closures, settings };
  try { cache.put(CACHE_KEY, JSON.stringify(data), CACHE_SECONDS); } catch (err) { /* too big to cache: fine */ }
  return data;
}

/* ------------------------------------------------------------ seed data */
// From hsctc.org/stayinsured (November 2026). Feed types start as "Manual" until each organization connects a calendar.

const SEED_NAVIGATORS = [
  { id: 'centralus', name: 'Diane Gray', organization: 'Cayuga Medical Center', short_name: 'Centralus', phone: '607.252.3728', email: 'dpgray@cayugamed.org',
    website: 'https://centralushealth.org/billing/', website_text: 'Billing / Centralus Health', counties: 'Tompkins, Cortland', anywhere_in_ny: 'no',
    languages: 'English', help_by: 'In person, Phone, Walk-in', feed_type: 'Manual', slot_minutes: '30', status: 'Automatic', show_on_board: 'yes' },
  { id: 'fidelis-phillips', name: 'Christy Phillips', organization: 'Fidelis Care Health Benefit Rep', short_name: 'Fidelis Care', phone: '607.201.4384', email: 'christy.phillips@fideliscare.org',
    website: 'https://www.fideliscare.org', website_text: 'fideliscare.org', counties: 'Tompkins', anywhere_in_ny: 'yes',
    languages: 'English', help_by: 'In person, Phone, Walk-in', feed_type: 'Manual', slot_minutes: '30', status: 'Automatic', show_on_board: 'yes' },
  { id: 'fidelis-scrivens', name: 'Lindsay Scrivens', organization: 'Fidelis Care Health Benefit Rep', short_name: 'Fidelis Care', phone: '607.752.0023', email: 'Lindsay.E.Scrivens@fideliscare.org',
    website: 'https://www.fideliscare.org', website_text: 'fideliscare.org', counties: 'Tompkins', anywhere_in_ny: 'yes',
    languages: 'English', help_by: 'In person, Phone, Walk-in', feed_type: 'Manual', slot_minutes: '30', status: 'Automatic', show_on_board: 'yes' },
  { id: 'guthrie', name: 'Danielle Williams', organization: 'The Guthrie Clinic', short_name: 'Guthrie', phone: '570.887.7168', email: 'Danielle.Williams@guthrie.org',
    booking_link: 'https://guthrie.org/form/financial-counselors', booking_link_text: 'Request a financial counselor',
    website: 'https://www.guthrie.org/changes-are-coming-medicaid', website_text: 'Changes Are Coming to Medicaid',
    counties: 'Tioga, Broome, Cortland, Tompkins, Chemung, Steuben, Bradford (PA), Tioga (PA), Sullivan (PA), Susquehanna (PA)', anywhere_in_ny: 'no',
    languages: 'English', help_by: 'Phone', feed_type: 'Booking form link', slot_minutes: '45', status: 'Automatic', show_on_board: 'yes' },
  { id: 'hsc', name: 'Liz Hoyt', organization: 'Human Services Coalition of Tompkins County', short_name: 'Human Services Coalition', phone: '1.877.211.8667', email: 'ehoyt@hsctc.org',
    booking_link: 'https://hsctc.org/health-appointment-booking/', booking_link_text: 'Book an appointment',
    counties: 'Tompkins, Cortland', anywhere_in_ny: 'no', languages: 'English, 240+ languages by interpreter line',
    help_by: 'In person, Phone, Community sites', feed_type: 'SimplyBook.me', slot_minutes: '60', status: 'Automatic', show_on_board: 'yes' },
  { id: 'molina', name: 'Alana Strope', organization: 'Molina Healthcare Facilitated Enroller', short_name: 'Molina Healthcare', phone: '585.736.8497', email: 'alana.strope@molinahealthcare.com',
    counties: 'Tompkins, Cortland, Broome, Tioga', anywhere_in_ny: 'no', languages: 'English, Hindi, Bengali, Urdu, Arabic, Interpreter services',
    help_by: 'In person, Phone, Walk-in, Community sites', other_contact: 'Muhammad Hasanuzzaman, 716.387.6469, Muhammad.Hasanuzzaman@molinahealthcare.com',
    feed_type: 'Manual', slot_minutes: '30', status: 'Automatic', show_on_board: 'yes' },
  { id: 'stic', name: 'Jerome James', organization: 'Southern Tier Independence Center, Health Enrollment Programs', short_name: 'STIC', phone: '607.724.2111, ext. 373', email: 'jeromej@stic-cil.org',
    website: 'https://www.stic-cil.org/medicaid/health-insurance-enrollment', website_text: 'Health insurance enrollment',
    counties: 'Broome, Chenango, Cortland, Delaware, Tioga, Tompkins', anywhere_in_ny: 'no', languages: 'English',
    help_by: 'In person, Phone, Walk-in, Video, Home visit, Community sites', feed_type: 'Manual', slot_minutes: '60', status: 'Automatic', show_on_board: 'yes' },
];

// navigator_id, site, address, pattern, days, week_of_month, first_date, start_time, end_time, help_by, takes_appointments, main_hours, note
const SEED_SCHEDULE = [
  ['centralus', 'Cayuga Medical Center, Main Admissions', '101 Dates Drive, Ithaca, NY 14850', 'Weekly', 'Mon, Tue, Wed, Thu, Fri', '', '', '8:30 am', '5:00 pm', 'In person, Phone, Walk-in', 'yes', 'yes', ''],
  ['fidelis-phillips', 'Catholic Charities', '324 W. Buffalo St., Ithaca, NY 14850', 'Weekly', 'Tue, Wed, Thu, Fri', '', '', '9:00 am', '2:00 pm', 'In person, Phone, Walk-in', 'yes', 'yes', ''],
  ['fidelis-phillips', 'Catholic Charities', '324 W. Buffalo St., Ithaca, NY 14850', 'Weekly', 'Mon', '', '', '9:00 am', '2:00 pm', 'In person, Phone', 'yes', 'yes', 'By appointment only'],
  ['fidelis-phillips', 'Ithaca Free Clinic', '521 W. Seneca St., Ithaca, NY 14850', 'Weekly', 'Mon', '', '', '3:00 pm', '6:00 pm', 'In person', 'no', 'no', 'Varies with provider availability and holidays'],
  ['fidelis-phillips', 'Tompkins County Mental Health', '', 'Nth weekday of month', 'Thu', '3', '', '9:00 am', '2:00 pm', 'Phone', 'no', 'no', 'Not able to take in-person appointments or walk-ins'],
  ['fidelis-phillips', 'Tompkins County Whole Health', '55 Brown Rd, Ithaca, NY 14850', 'Last weekday of month', 'Fri', '', '', '9:00 am', '3:00 pm', 'In person, Phone, Walk-in', 'yes', 'no', ''],
  ['fidelis-scrivens', 'Southern Tier AIDS Program (STAP)', '314 W. State St., Ithaca, NY 14850', 'Weekly', 'Mon', '', '', '12:00 pm', '3:00 pm', 'In person, Walk-in', 'yes', 'no', ''],
  ['fidelis-scrivens', 'Cayuga Addiction Recovery Services (CARS)', '334 W. State St., Ithaca, NY 14850', 'Every other week', 'Wed', '', '2026-11-18', '', '', 'In person', 'no', 'no', 'Times not listed. Call to confirm. (Which weeks: please check)'],
  ['fidelis-scrivens', 'Rodeway Inn', '654 Elmira Rd, Ithaca, NY 14850', 'Every other week', 'Fri', '', '2026-11-20', '10:00 am', '2:00 pm', 'In person, Walk-in', 'yes', 'no', '(Which weeks: please check)'],
  ['fidelis-scrivens', 'Salvation Army Food Pantry', '150 N. Albany St., Ithaca, NY 14850', 'Nth weekday of month', 'Fri', '3', '', '1:00 pm', '2:30 pm', 'In person, Walk-in', 'yes', 'no', ''],
  ['fidelis-scrivens', 'Enfield Food Pantry', '182 Enfield Main Rd, Ithaca, NY 14850', 'Last weekday of month', 'Mon', '', '', '9:30 am', '11:30 am', 'In person, Walk-in', 'yes', 'no', ''],
  ['hsc', 'Main HSC Office', '118 N. Tioga St., Suite 304, Ithaca, NY 14850', 'Weekly', 'Mon', '', '', '9:00 am', '5:00 pm', 'In person, Phone', 'yes', 'yes', ''],
  ['hsc', 'Main HSC Office', '118 N. Tioga St., Suite 304, Ithaca, NY 14850', 'Weekly', 'Tue, Wed, Thu, Fri', '', '', '8:00 am', '6:00 pm', 'In person, Phone', 'yes', 'yes', ''],
  ['hsc', 'Seven Valleys Health Coalition', '10 Kennedy Parkway, Cortland, NY 13045', 'Call for hours', '', '', '', '', '', 'In person', 'no', 'no', 'Call to schedule'],
  ['molina', 'Regular hours (phone or appointment)', 'Call to arrange a meeting place', 'Weekly', 'Mon, Tue, Wed, Thu, Fri', '', '', '8:30 am', '5:00 pm', 'Phone, In person', 'yes', 'yes', ''],
  ['molina', 'Cayuga Addiction Recovery Services (CARS)', '334 W. State St., Ithaca, NY 14850', 'Weekly', 'Fri', '', '', '9:30 am', '12:00 pm', 'In person, Walk-in', 'yes', 'no', ''],
  ['molina', 'Southern Tier AIDS Program (STAP)', '314 W. State St., Ithaca, NY 14850', 'Weekly', 'Tue', '', '', '12:00 pm', '4:00 pm', 'In person, Walk-in', 'yes', 'no', ''],
  ['stic', 'STIC Main Office', '135 E. Franklin St., Binghamton, NY 13904', 'Weekly', 'Mon, Tue, Wed, Thu', '', '', '8:00 am', '5:00 pm', 'In person, Phone, Walk-in, Video', 'yes', 'yes', ''],
  ['stic', 'STIC Main Office', '135 E. Franklin St., Binghamton, NY 13904', 'Weekly', 'Fri', '', '', '9:00 am', '3:00 pm', 'In person, Phone, Walk-in, Video', 'yes', 'yes', ''],
];

const SEED_CLOSURES = [
  ['2026-11-26', '', 'Thanksgiving'],
  ['2026-12-25', '', 'Christmas Day'],
  ['2027-01-01', '', 'New Year\'s Day'],
];

const SEED_SETTINGS = [
  ['open_threshold', '6', 'Openings in the next 7 days needed for a green "Accepting" light (when status is Automatic). Fewer shows "Limited openings"; none shows "Full".'],
  ['stale_after_days', '', 'If a calendar hasn\'t synced, or a manual card hasn\'t been touched, for this many days, the card shows "Call to confirm". Leave blank to turn off.'],
  ['help_line', 'Human Services Coalition, 1.877.211.8667', 'Shown when no navigator matches a visitor\'s filters.'],
];
