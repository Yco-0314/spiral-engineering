#!/usr/bin/env node
// spiral-pitch — the second-order self-improvement instrument.
// A first-order loop edits the TASK; a spiral edits the SYSTEM that runs loops. Pitch is the
// rate of VERIFIED self-change per unit time, classified by evidence — plus the two numbers
// that keep it honest: null-ratio (a spiral that never rejects anything is not measuring) and
// grounding ratio (the Data Processing Inequality caps what a closed loop can learn).
// Disambiguation (von Foerster): pitch→0 with high grounding = mature (eigenform);
// pitch→0 with low grounding = starved. Pitch alone cannot tell death from maturity.
// Zero dependencies. Reads the ledger formats in schema/ledger.schema.json.
//   node bin/spiral-pitch.mjs --changes <changes.jsonl> [--evals <evals.jsonl>]
//   node bin/spiral-pitch.mjs --self-test
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const invokedDirectly = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

// Pure: JSONL text → change events (kind:'change' lines only; malformed lines are skipped).
export function parseChanges(text = '') {
  return text.trim().split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l) } catch { return null } })
    .filter(r => r && r.kind === 'change' && r.ts && r.id)
}

// Pure: ISO-week key (YYYY-Www) from a YYYY-MM-DD(T…) string.
export function isoWeek(ts) {
  const [y, m, d] = ts.slice(0, 10).split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const day = dt.getUTCDay() || 7
  dt.setUTCDate(dt.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
  return `${dt.getUTCFullYear()}-W${String(Math.ceil(((dt - yearStart) / 86400000 + 1) / 7)).padStart(2, '0')}`
}

// Pure: change events → pitch stats.
export function computePitch(events) {
  const known = ['ship', 'gate', 'null']
  const es = events.map(e => ({ ...e, class: known.includes(e.class) ? e.class : 'unknown' }))
    .sort((a, b) => a.ts.localeCompare(b.ts))
  const byClass = { ship: 0, gate: 0, null: 0, unknown: 0 }
  const byWeek = {}
  for (const e of es) {
    byClass[e.class]++
    ;(byWeek[isoWeek(e.ts)] ??= { ship: 0, gate: 0, null: 0, unknown: 0 })[e.class]++
  }
  const first = es[0]?.ts.slice(0, 10), last = es[es.length - 1]?.ts.slice(0, 10)
  const spanDays = first ? Math.max(1, Math.round((Date.parse(last) - Date.parse(first)) / 86400000)) : 0
  const spanWeeks = Math.max(spanDays / 7, 1 / 7)
  const verified = es.length - byClass.unknown
  const measured = es.filter(e => e.class === 'ship' && e.delta > 0)
  const external = es.filter(e => e.grounding === 'external').length
  return {
    events: es, byClass, byWeek, first, last, spanDays, verified,
    pitchPerWeek: +(verified / spanWeeks).toFixed(1),
    nullRatio: verified ? +(byClass.null / verified).toFixed(2) : 0,
    deltaThroughput: measured.reduce((s, e) => s + e.delta, 0),
    shipMeasured: measured.length,
    groundingRatio: es.length ? +(external / es.length).toFixed(2) : 0,
  }
}

// Pure: evals.jsonl text → measured summary, latest eval record per (set, model).
// Delta is MODEL-RELATIVE: records never merge across models.
export function measuredFromLog(text = '') {
  const recs = text.trim().split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const evals = recs.filter(r => r.kind === 'eval')
  const latest = {}
  for (const r of evals) latest[`${r.set}@${r.model}`] = r
  const rows = Object.values(latest).sort((a, b) => (b.delta ?? -999) - (a.delta ?? -999))
  const moved = rows.filter(r => r.delta > 0)
  return {
    records: evals.length,
    measureRuns: recs.filter(r => r.kind === 'measure-run').length,
    sets: rows.length, moved: moved.length,
    deltaSum: moved.reduce((s, r) => s + r.delta, 0), rows,
  }
}

function selfTest() {
  let bad = 0
  const ok = (c, m) => { console.log(`${c ? 'ok' : 'XX'} ${m}`); if (!c) bad++ }
  const mk = (ts, cls, extra = {}) => JSON.stringify({ kind: 'change', ts, id: ts + cls, class: cls, evidence: 'e', grounding: 'internal', ...extra })
  const text = [mk('2026-06-27', 'ship', { delta: 25, grounding: 'external' }), mk('2026-06-27', 'gate'), mk('2026-07-06', 'null'), 'garbage', '{"kind":"eval","set":"x"}'].join('\n')
  const ev = parseChanges(text)
  ok(ev.length === 3, 'parseChanges keeps change lines, skips garbage + eval lines')
  const p = computePitch(ev)
  ok(p.verified === 3 && p.byClass.ship === 1 && p.byClass.null === 1, 'classes counted')
  ok(p.spanDays === 9, '06-27 → 07-06 span = 9 days')
  ok(p.nullRatio === 0.33, 'null-ratio 1/3')
  ok(p.deltaThroughput === 25 && p.shipMeasured === 1, 'delta-throughput sums measured ship deltas only')
  ok(p.groundingRatio === 0.33, 'grounding 1/3 external')
  ok(computePitch(parseChanges(mk('2026-07-01', 'bogus'))).byClass.unknown === 1, 'unknown class isolated, never counted verified')
  ok(isoWeek('2026-07-06') === isoWeek('2026-07-08T10:00:00Z'), 'same ISO week groups; datetime ok')
  const log = ['{"kind":"eval","set":"a","model":"m1","delta":29,"gate":"PASS","n":1}',
    '{"kind":"eval","set":"a","model":"m1","delta":43,"gate":"PASS","n":5}',
    '{"kind":"eval","set":"a","model":"m2","delta":-10,"gate":"NO MOVEMENT","n":1}',
    '{"kind":"measure-run","ts":"t","rows":[]}'].join('\n')
  const m = measuredFromLog(log)
  ok(m.sets === 2 && m.rows.find(r => r.model === 'm1').delta === 43, 'latest per set@model wins; models never merge')
  ok(m.moved === 1 && m.deltaSum === 43 && m.measureRuns === 1, 'moved/sum/measure-run counts')
  console.log(bad ? '\nself-test FAIL' : '\nself-test PASS')
  process.exit(bad ? 1 : 0)
}

function main() {
  const argv = process.argv.slice(2)
  const arg = (f) => argv.includes(f) ? argv[argv.indexOf(f) + 1] : null
  const changesPath = arg('--changes')
  if (!changesPath) { console.error('usage: spiral-pitch --changes <changes.jsonl> [--evals <evals.jsonl>]'); process.exit(1) }
  const p = computePitch(parseChanges(readFileSync(changesPath, 'utf8')))
  console.log('spiral-pitch — verified second-order self-change\n')
  for (const e of p.events) console.log(`  ${e.ts.slice(0, 10)}  ${e.class.toUpperCase().padEnd(7)} ${e.id}`)
  if (p.byClass.unknown) console.log(`\n  ⚠ ${p.byClass.unknown} unknown-class line(s) — fix the ledger, they count nowhere`)
  console.log(`\n  window        ${p.first} → ${p.last}  (${p.spanDays} days)`)
  console.log(`  verified      ${p.verified}   ship ${p.byClass.ship} · gate ${p.byClass.gate} · null ${p.byClass.null}`)
  console.log(`  cadence       ${p.pitchPerWeek} verified self-changes / week  (a RATE, not a magnitude)`)
  console.log(`  Δ-throughput  +${p.deltaThroughput}%  (sum of MEASURED ship Δ, ${p.shipMeasured}/${p.byClass.ship} carry one; nothing invented)`)
  console.log(`  grounding     ${Math.round(p.groundingRatio * 100)}% external  (DPI ceiling: a closed loop cannot out-learn its external signal)`)
  console.log(`  null-ratio    ${p.nullRatio}  (0 = never rejects anything — suspicious)`)
  console.log('\n  by ISO week:')
  for (const [w, c] of Object.entries(p.byWeek).sort()) console.log(`    ${w}  ship ${c.ship} · gate ${c.gate} · null ${c.null}`)
  const evalsPath = arg('--evals')
  if (evalsPath) {
    const m = measuredFromLog(readFileSync(evalsPath, 'utf8'))
    if (m.records) {
      console.log('\n  measured layer (latest per set@model — Δ is model-relative):')
      for (const r of m.rows) console.log(`    ${(r.set + '@' + r.model).padEnd(44)} Δ${(r.delta >= 0 ? '+' : '') + r.delta}%  ${r.gate}${r.n > 1 ? `  (N=${r.n})` : ''}`)
      console.log(`    Σ +${m.deltaSum}% across ${m.moved}/${m.sets} moved · ${m.records} records · ${m.measureRuns} measure-run(s)`)
    }
  }
  console.log('\n  Honest limits: change class is declared (audit via each line\'s evidence field);')
  console.log('  pitch→0 needs grounding to disambiguate maturity from starvation; N small = noisy.')
}

if (invokedDirectly && process.argv[2] === '--self-test') selfTest()
else if (invokedDirectly) main()
