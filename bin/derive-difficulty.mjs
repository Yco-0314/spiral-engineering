#!/usr/bin/env node
// derive-difficulty — replace hand-guessed difficulty tags with MEASURED ones.
// Difficulty is model-relative (reference-implementation finding, 2026-07-06: 4 of 7 hand tags
// were wrong for the model actually measured). Derives each case's tag from the latest eval
// record's baseline majority verdict for the basis model:
//   baseline majority-PASS → 1 (convergence-prone: cannot show value on this model)
//   baseline majority-FAIL → 2 (discriminating)
//   3 (adversarial) is NEVER derived — hand-assigned only, at case-add time.
// Each set gets a `difficultyBasis` field (model + record ts + N) so every tag is traceable to
// the measurement that produced it. Cases absent/errored keep their existing tag.
//   node bin/derive-difficulty.mjs --sets <dir> --evals <evals.jsonl> --model <id> [--dry]
//   node bin/derive-difficulty.mjs --self-test
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const invokedDirectly = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

// Pure: latest eval record per set for one model, from evals.jsonl text.
export function latestBySet(text = '', model) {
  const latest = {}
  for (const line of text.trim().split('\n').filter(Boolean)) {
    let r; try { r = JSON.parse(line) } catch { continue }
    if (r?.kind === 'eval' && r.model === model && Array.isArray(r.cases)) latest[r.set] = r
  }
  return latest
}

// Pure: fold one record's measured baseline verdicts into a set's cases.
export function derive(setCases = [], recordCases = []) {
  const byId = Object.fromEntries(recordCases.map(c => [c.id, c]))
  let changed = 0, kept = 0
  const unmatched = []
  const cases = setCases.map(c => {
    const m = byId[c.id]
    if (!m || m.baseline === null) { unmatched.push(c.id); return c }
    const d = m.baseline ? 1 : 2
    if (c.difficulty === d) { kept++; return c }
    changed++
    return { ...c, difficulty: d }
  })
  return { cases, changed, kept, unmatched }
}

function selfTest() {
  let bad = 0
  const ok = (c, m) => { console.log(`${c ? 'ok' : 'XX'} ${m}`); if (!c) bad++ }
  const rec = [{ id: 'a', baseline: true }, { id: 'b', baseline: false }, { id: 'c', baseline: null }]
  const r = derive([{ id: 'a', difficulty: 2 }, { id: 'b' }, { id: 'c', difficulty: 1 }, { id: 'd', difficulty: 3 }], rec)
  ok(r.cases[0].difficulty === 1 && r.cases[1].difficulty === 2, 'pass→1 overrides; fail→2 derives')
  ok(r.cases[2].difficulty === 1 && r.cases[3].difficulty === 3, 'errored/absent keep tags (3 never derived away)')
  ok(r.changed === 2 && r.kept === 0 && r.unmatched.length === 2, 'accounting')
  ok(derive([{ id: 'x', difficulty: 2 }], [{ id: 'x', baseline: false }]).kept === 1, 'agreeing tag = kept')
  const l = latestBySet('{"kind":"eval","set":"s","model":"m","cases":[{"id":"a","baseline":true}]}\n{"kind":"eval","set":"s","model":"m","cases":[{"id":"a","baseline":false}]}\n{"kind":"eval","set":"s","model":"OTHER","cases":[]}', 'm')
  ok(l.s.cases[0].baseline === false, 'latest per set wins; other models excluded')
  console.log(bad ? '\nself-test FAIL' : '\nself-test PASS')
  process.exit(bad ? 1 : 0)
}

function main() {
  const argv = process.argv.slice(2)
  const arg = (f) => argv.includes(f) ? argv[argv.indexOf(f) + 1] : null
  const setsDir = arg('--sets'), evalsPath = arg('--evals'), model = arg('--model')
  const dry = argv.includes('--dry')
  if (!setsDir || !evalsPath || !model) { console.error('usage: derive-difficulty --sets <dir> --evals <evals.jsonl> --model <id> [--dry]'); process.exit(1) }
  const latest = latestBySet(readFileSync(evalsPath, 'utf8'), model)
  console.log(`derive-difficulty — basis model: ${model}${dry ? '  (dry run)' : ''}\n`)
  for (const f of readdirSync(setsDir).filter(f => f.endsWith('.json')).sort()) {
    const path = resolve(setsDir, f)
    const set = JSON.parse(readFileSync(path, 'utf8'))
    const rec = latest[f.replace(/\.json$/, '')]
    if (!rec) { console.log(`  ${f.padEnd(40)} no ${model} record — skipped`); continue }
    const { cases, changed, kept, unmatched } = derive(set.cases, rec.cases)
    set.cases = cases
    set.difficultyBasis = `measured baseline (${model}, ${rec.ts}, N=${rec.n}): 1=baseline-pass(convergence-prone) 2=baseline-fail(discriminating); 3=hand-only`
    if (!dry) writeFileSync(path, JSON.stringify(set, null, 2) + '\n')
    console.log(`  ${f.padEnd(40)} ${changed} derived, ${kept} confirmed${unmatched.length ? `, kept as-is: ${unmatched.join(',')}` : ''}`)
  }
}

if (invokedDirectly && process.argv[2] === '--self-test') selfTest()
else if (invokedDirectly) main()
