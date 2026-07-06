#!/usr/bin/env node
// dark-room — can your eval even reveal anything? (the dark-room problem, active inference)
// A self-improving system can minimise surprise by AVOIDING hard tasks — stability that is
// really degeneration. The tell: an eval where the baseline already aces every case (Δ≈0
// structurally). Two layers:
//   static  — per-case `difficulty` tags in eval-set files (1 toy / 2 realistic / 3 adversarial);
//             a set with no case ≥2 is a dark room BY PREDICTION.
//   measured — per-model baseline verdicts from evals.jsonl; zero baseline-fails is a dark room
//             ON THAT MODEL, whatever the tags predicted. Difficulty is model-relative.
// Zero dependencies.
//   node bin/dark-room.mjs [--sets <dir>] [--evals <evals.jsonl>]
//   node bin/dark-room.mjs --self-test
import { readFileSync, readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const invokedDirectly = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

// Pure: a case's difficulty ordinal (1–3) or null when untagged.
export const difficultyOf = (c) => Number.isInteger(c?.difficulty) && c.difficulty >= 1 && c.difficulty <= 3 ? c.difficulty : null

// Pure: one set's cases → static coverage + verdict (untagged | darkroom | partial | ok).
export function coverage(cases = []) {
  const diffs = cases.map(difficultyOf)
  const total = cases.length
  const untagged = diffs.filter(d => d === null).length
  const easy = diffs.filter(d => d === 1).length
  const mid = diffs.filter(d => d === 2).length
  const hard = diffs.filter(d => d === 3).length
  const discriminating = mid + hard
  const verdict = total - untagged === 0 ? 'untagged'
    : discriminating === 0 ? 'darkroom'
    : untagged > 0 ? 'partial' : 'ok'
  return { total, easy, mid, hard, untagged, discriminating, verdict }
}

// Pure: evals.jsonl text → measured coverage per (set, model), latest record wins.
export function measuredCoverage(text = '') {
  const recs = text.trim().split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l) } catch { return null } })
    .filter(r => r && r.kind === 'eval' && Array.isArray(r.cases))
  const latest = {}
  for (const r of recs) latest[`${r.set}@${r.model}`] = r
  return Object.values(latest).map(r => {
    const graded = r.cases.filter(c => c.baseline !== null)
    const baselineFails = graded.filter(c => c.baseline === false).length
    return { set: r.set, model: r.model, n: r.n || 1, graded: graded.length, baselineFails,
      verdict: !graded.length ? 'error' : baselineFails === 0 ? 'darkroom' : 'ok' }
  }).sort((a, b) => a.set.localeCompare(b.set))
}

function selfTest() {
  let bad = 0
  const ok = (c, m) => { console.log(`${c ? 'ok' : 'XX'} ${m}`); if (!c) bad++ }
  ok(difficultyOf({ difficulty: 2 }) === 2 && difficultyOf({ difficulty: 0 }) === null && difficultyOf({}) === null, 'ordinal parsing')
  ok(coverage([{ difficulty: 1 }, { difficulty: 2 }]).verdict === 'ok', 'tagged + discriminator → ok')
  ok(coverage([{ difficulty: 1 }, { difficulty: 1 }]).verdict === 'darkroom', 'all easy → dark room')
  ok(coverage([{}, {}]).verdict === 'untagged' && coverage([{ difficulty: 3 }, {}]).verdict === 'partial', 'untagged / partial')
  const log = ['{"kind":"eval","set":"a","model":"m","n":1,"cases":[{"id":"x","baseline":true,"skill":true},{"id":"y","baseline":false,"skill":true}]}',
    'garbage',
    '{"kind":"eval","set":"a","model":"m","n":5,"cases":[{"id":"x","baseline":true,"skill":true},{"id":"y","baseline":true,"skill":true}]}',
    '{"kind":"eval","set":"b","model":"m","n":1,"cases":[{"id":"z","baseline":false,"skill":true},{"id":"w","baseline":null,"skill":null}]}'].join('\n')
  const mc = measuredCoverage(log)
  ok(mc.length === 2 && mc[0].verdict === 'darkroom' && mc[0].n === 5, 'latest wins: all-baseline-pass → measured dark room')
  ok(mc[1].verdict === 'ok' && mc[1].graded === 1, 'baseline-fail discriminates; errored case excluded')
  ok(measuredCoverage('').length === 0, 'empty → empty, not crash')
  console.log(bad ? '\nself-test FAIL' : '\nself-test PASS')
  process.exit(bad ? 1 : 0)
}

function main() {
  const argv = process.argv.slice(2)
  const arg = (f) => argv.includes(f) ? argv[argv.indexOf(f) + 1] : null
  const setsDir = arg('--sets'), evalsPath = arg('--evals')
  if (!setsDir && !evalsPath) { console.error('usage: dark-room [--sets <dir>] [--evals <evals.jsonl>]'); process.exit(1) }
  console.log('dark-room — only-easy evals cannot reveal anything\n')
  if (setsDir) {
    console.log('  static (per-case difficulty tags — the pre-run prediction):')
    console.log('  set                              cases  easy  mid  hard  untagged  verdict')
    const dash = (n) => n === 0 ? '·' : String(n)
    for (const f of readdirSync(setsDir).filter(f => f.endsWith('.json')).sort()) {
      const set = JSON.parse(readFileSync(resolve(setsDir, f), 'utf8'))
      const r = coverage(set.cases || [])
      console.log(`  ${f.replace(/\.json$/, '').padEnd(32)} ${String(r.total).padEnd(5)}  ${dash(r.easy).padEnd(4)}  ${dash(r.mid).padEnd(3)}  ${dash(r.hard).padEnd(4)}  ${dash(r.untagged).padEnd(8)}  ${r.verdict}${r.verdict === 'darkroom' ? '  ⚠ DARK ROOM' : ''}`)
    }
  }
  if (evalsPath) {
    const mc = measuredCoverage(readFileSync(evalsPath, 'utf8'))
    if (mc.length) {
      console.log('\n  measured (latest per set@model — ground truth; difficulty is MODEL-RELATIVE):')
      console.log('    set@model                                  baseline-fail/graded  verdict')
      for (const r of mc) console.log(`    ${(r.set + '@' + r.model).padEnd(42)} ${String(r.baselineFails).padStart(2)}/${String(r.graded).padEnd(2)}${r.n > 1 ? ` (N=${r.n})` : '      '}  ${r.verdict}${r.verdict === 'darkroom' ? '  ⚠ MEASURED DARK ROOM on this model' : ''}`)
    } else console.log('\n  (no measured eval records yet)')
  }
  console.log('\n  A healthy spiral lets difficulty RISE over time; rising pass rates on static')
  console.log('  difficulty is hiding, not improving.')
}

if (invokedDirectly && process.argv[2] === '--self-test') selfTest()
else if (invokedDirectly) main()
