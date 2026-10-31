// Local operator-observation system, not telemetry or verified cross-device compatibility.
// All reports are user-authored and remain on the current device unless explicitly exported.
import {SOURCES} from "./sources.js";
import {GAMES} from "./games.js";

export const FIELD_GAME_URL = "https://michaelwave369.github.io/BTM/";
export const FIELD_STATES = Object.freeze([
  Object.freeze({id:"untested",label:"Not tested"}),
  Object.freeze({id:"opened",label:"Opened, unverified playback"}),
  Object.freeze({id:"worked",label:"Worked on this device"}),
  Object.freeze({id:"failed",label:"Failed / blocked"})
]);
export const FIELD_TARGETS = Object.freeze([
  Object.freeze({id:"demo",name:"Sample video",kind:"Playback",description:"In-app HTML5 flower demo. Video must actually play, not just open."}),
  Object.freeze({id:"signal",name:"Signal Breaker",kind:"Game",description:"Start, move paddle, hit a block and restart using the Xbox controller."}),
  Object.freeze({id:"btm",name:"Break the Matrix",kind:"Game · external",description:"Original game at GitHub Pages. Xbox Edge performance and input remain unverified.",url:FIELD_GAME_URL}),
  ...GAMES.filter(game=>game.fieldId && game.id!=="btm").map(game=>Object.freeze({
    id:game.fieldId,name:game.name,kind:"Original game · external",
    description:"Browser game destination listed in its repository; this device has not been tested.",url:game.url
  })),
  ...SOURCES.map(source => Object.freeze({
    id:"source-"+source.id,name:source.name,kind:"Official provider · external",
    description:"Opening a provider page does NOT prove media playback.",url:source.url
  }))
]);
const VALID = new Set(FIELD_TARGETS.map(target=>target.id));
const STATES = new Set(FIELD_STATES.map(state=>state.id));
const MAX_NOTE = 240;
const MAX_IMPORT_SIZE = 16384;
export const FIELD_KEY = "reel-theater:xbox-field-report-v1";

export function emptyFieldReport() {
  return {schema:"REEL_XBOX_FIELD_REPORT_V1",device:"Xbox Series X / Microsoft Edge (self-reported)",entries:{}};
}
export function sanitizeFieldReport(input) {
  const clean = emptyFieldReport();
  if (!input || typeof input !== "object" || Array.isArray(input) || input.schema !== clean.schema || !input.entries || typeof input.entries !== "object" || Array.isArray(input.entries)) return clean;
  for (const id of Object.keys(input.entries)) {
    if (!VALID.has(id)) continue;
    const entry = input.entries[id];
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || !STATES.has(entry.status)) continue;
    const note = typeof entry.note === "string" ? entry.note.slice(0, MAX_NOTE) : "";
    // Imported timestamps are untrusted labels, never treated as verification.
    const at = typeof entry.at === "string" && /^\d{4}-\d{2}-\d{2}T/.test(entry.at) && entry.at.length <= 40 ? entry.at : "";
    clean.entries[id] = {status:entry.status,note,at};
  }
  return clean;
}
export function parseFieldReport(raw) {
  if (typeof raw !== "string" || raw.length > MAX_IMPORT_SIZE) return emptyFieldReport();
  try { return sanitizeFieldReport(JSON.parse(raw)); } catch { return emptyFieldReport(); }
}
export function updateFieldEntry(report,id,{status,note,at}={}) {
  const next = sanitizeFieldReport(report);
  if (!VALID.has(id)) return next;
  const old = next.entries[id] || {status:"untested",note:"",at:""};
  const updated = {
    status: STATES.has(status) ? status : old.status,
    note:typeof note === "string" ? note.slice(0, MAX_NOTE) : old.note,
    at:typeof at === "string" && /^\d{4}-\d{2}-\d{2}T/.test(at) ? at.slice(0,40) : old.at
  };
  if (updated.status === "untested" && !updated.note) delete next.entries[id];
  else next.entries[id] = updated;
  return next;
}
export function fieldCounts(report) {
  const entries = sanitizeFieldReport(report).entries;
  const statuses = Object.values(entries).map(entry=>entry.status);
  return {
    total:FIELD_TARGETS.length,
    tested:statuses.filter(status=>status!=="untested").length,
    worked:statuses.filter(status=>status==="worked").length,
    failed:statuses.filter(status=>status==="failed").length,
    opened:statuses.filter(status=>status==="opened").length
  };
}
function escapeAttr(text) {
  return String(text).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
export function fieldMarkup(report) {
  const current = sanitizeFieldReport(report);
  const counts = fieldCounts(current);
  const cards = FIELD_TARGETS.map(target=>{
    const entry = current.entries[target.id] || {status:"untested",note:""};
    const targetAction = target.id === "demo" ? '<button type="button" class="action secondary small" data-field-launch="demo">Try video sample</button>' :
      target.id === "signal" ? '<button type="button" class="action secondary small" data-field-launch="signal">Play Signal Breaker</button>' :
      '<a class="action secondary small" href="'+escapeAttr(target.url)+'" target="_blank" rel="noopener noreferrer">Open destination ↗</a>';
    return '<article class="field-card"><div class="field-card-heading"><div><span class="eyebrow">'+escapeAttr(target.kind)+'</span><h3>'+escapeAttr(target.name)+'</h3></div><span class="field-state" data-field-indicator="'+target.id+'">'+escapeAttr(FIELD_STATES.find(x=>x.id===entry.status).label)+'</span></div>' +
      '<p>'+escapeAttr(target.description)+'</p><div class="field-actions">'+targetAction+
      '<label>My observation<select data-field-status="'+target.id+'" aria-label="My observation for '+escapeAttr(target.name)+'">'+FIELD_STATES.map(state=>'<option value="'+state.id+'"'+(state.id===entry.status?" selected":"")+'>'+state.label+'</option>').join("")+'</select></label></div>' +
      '<label class="field-note-label" for="field-note-'+target.id+'">Optional note (stored only on this browser)<textarea id="field-note-'+target.id+'" maxlength="240" rows="2" data-field-note="'+target.id+'" placeholder="What actually happened?"></textarea></label></article>';
  }).join("");
  return '<div class="page-heading"><div class="eyebrow">RUNG 3 · FIELD LAB</div><h1>The Shayne Test</h1><p>Record what really works on an Xbox Series X. These are private, self-reported observations, not compatibility certifications or automated stream checks.</p></div>' +
    '<div class="field-summary"><strong id="field-progress">'+counts.tested+' / '+counts.total+' checked</strong><span id="field-summary-detail">'+counts.worked+' worked · '+counts.failed+' failed · '+counts.opened+' opened only</span><button class="action" data-action="export-field">Download local field report (JSON)</button></div>' +
    '<div class="info-panel"><strong>How to test:</strong> Launch each sample or official site, return to REEL Theater and choose what happened. “Opened” means the page opened, not that video or gameplay worked. A “Worked” selection is only your observation on this specific Xbox. No automatic probes, hidden uploads or external verification.</div>' +
    '<div class="field-grid">'+cards+'</div>' +
    '<p class="fineprint">Your observations are local to this browser. Report JSON is editable and unsigned; it cannot independently establish device performance, content rights or playback compatibility. The export contains your typed notes, so inspect it before sharing.</p>';
}
