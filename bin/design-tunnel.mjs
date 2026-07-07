#!/usr/bin/env node
// design-tunnel v0 — the counterfactual wind tunnel (SPEC roadmap item 3).
// The reason architecture judgment never became empirical is that the road not taken was
// unaffordable to build. Agents changed the economics: throw the SAME future requirements at
// COMPETING skeletons and MEASURE the cost of change instead of arguing about it.
//   v0 evidence grade, stated plainly: one-shot diff proxy. The model emits a unified diff per
//   (skeleton × feature); we parse files-touched and lines-changed DETERMINISTICALLY (no judge
//   anywhere). Diffs are not executed or type-checked — this measures where change LANDS and how
//   wide it spreads, not whether it compiles. v1 (agentic: apply + run tests) upgrades the grade.
// Requires ANTHROPIC_API_KEY (+ optional ANTHROPIC_BASE_URL for compatible endpoints).
//   node bin/design-tunnel.mjs --fixture examples/tunnel --model deepseek-chat [--reps 3] [--out results.jsonl]
//   node bin/design-tunnel.mjs --self-test
import { readFileSync, readdirSync, appendFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolve, basename } from 'node:path'

const invokedDirectly = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

// Pure: strip markdown fences the model may wrap the diff in.
export const unfence = (s = '') => s.replace(/^\s*```[a-z]*\s*\n/i, '').replace(/\n```\s*$/, '').trim()

// Pure: unified diff → deterministic cost stats. Files = distinct non-/dev/null "+++" targets;
// added/removed exclude the +++/--- headers themselves.
export function diffStats(text = '') {
  const t = unfence(text)
  const files = new Set()
  let added = 0, removed = 0
  for (const line of t.split('\n')) {
    if (line.startsWith('+++ ')) {
      const f = line.slice(4).trim().replace(/^[ab]\//, '')
      if (f && f !== '/dev/null') files.add(f)
    } else if (line.startsWith('+')) added++
    else if (line.startsWith('---')) { /* header */ }
    else if (line.startsWith('-')) removed++
  }
  return { files: files.size, added, removed, touched: [...files].sort(), parsed: files.size > 0 }
}

// Pure: odd-or-even median.
export const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null
}

// Pure: assemble the one-shot prompt.
export function buildPrompt(files, task) {
  const listing = files.map(f => `--- ${f.name} ---\n${f.text}`).join('\n\n')
  return `You are modifying a small TypeScript codebase. Current files:\n\n${listing}\n\n` +
    `Task: ${task}\n\n` +
    `Reply with ONLY a unified diff (---/+++/@@ format, paths relative to the project root). ` +
    `No prose, no explanation, no markdown fences.`
}

function selfTest() {
  let bad = 0
  const ok = (c, m) => { console.log(`${c ? 'ok' : 'XX'} ${m}`); if (!c) bad++ }
  const d = '--- a/users.ts\n+++ b/users.ts\n@@ -1,3 +1,4 @@\n-old\n+new\n+new2\n--- /dev/null\n+++ b/cache.ts\n@@ -0,0 +1,2 @@\n+a\n+b'
  const s = diffStats(d)
  ok(s.files === 2 && s.touched.includes('cache.ts'), 'files counted, a/b prefixes stripped, /dev/null excluded')
  ok(s.added === 4 && s.removed === 1, 'line counts exclude headers')
  ok(diffStats('```diff\n' + d + '\n```').files === 2, 'markdown fences stripped')
  ok(diffStats('I would suggest refactoring...').parsed === false, 'prose → parsed:false, never counted as zero-cost')
  ok(median([3, 1, 2]) === 2 && median([1, 4]) === 2.5 && median([]) === null, 'median odd/even/empty')
  ok(buildPrompt([{ name: 'a.ts', text: 'x' }], 'do it').includes('--- a.ts ---'), 'prompt embeds files')
  console.log(bad ? '\nself-test FAIL' : '\nself-test PASS')
  process.exit(bad ? 1 : 0)
}

function runModel(prompt, model) {
  const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '')
  const key = process.env.ANTHROPIC_API_KEY || ''
  const payload = { model, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }
  const out = execFileSync('curl', ['-s', `${base}/v1/messages`,
    '-H', `x-api-key: ${key}`, '-H', `authorization: Bearer ${key}`,
    '-H', 'anthropic-version: 2023-06-01', '-H', 'content-type: application/json',
    '-d', JSON.stringify(payload)], { encoding: 'utf8', timeout: 180000, maxBuffer: 10 * 1024 * 1024 })
  const j = JSON.parse(out)
  if (j.error) throw new Error(`${j.error.type}: ${j.error.message}`)
  return (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('')
}

function main() {
  const argv = process.argv.slice(2)
  const arg = (f, d) => argv.includes(f) ? argv[argv.indexOf(f) + 1] : d
  const fixture = arg('--fixture'), model = arg('--model')
  const reps = Math.max(1, parseInt(arg('--reps', '3'), 10))
  const out = arg('--out')
  if (!fixture || !model || !process.env.ANTHROPIC_API_KEY) {
    console.error('usage: ANTHROPIC_API_KEY=… design-tunnel --fixture <dir> --model <id> [--reps 3] [--out results.jsonl]'); process.exit(1)
  }
  const { features } = JSON.parse(readFileSync(resolve(fixture, 'features.json'), 'utf8'))
  const skeletons = readdirSync(fixture, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort()
  console.log(`design-tunnel v0 — one-shot diff proxy · model ${model} · reps ${reps}`)
  console.log(`skeletons: ${skeletons.join(' vs ')} · features: ${features.length}\n`)
  const results = []
  for (const sk of skeletons) {
    const dir = resolve(fixture, sk)
    const files = readdirSync(dir).filter(f => f.endsWith('.ts')).sort()
      .map(f => ({ name: basename(f), text: readFileSync(resolve(dir, f), 'utf8') }))
    for (const feat of features) {
      const runs = []
      for (let i = 0; i < reps; i++) {
        try {
          const stats = diffStats(runModel(buildPrompt(files, feat.task), model))
          if (stats.parsed) runs.push(stats)
        } catch (e) { process.stderr.write(`  ! ${sk}/${feat.id} rep ${i + 1}: ${String(e.message).slice(0, 80)}\n`) }
      }
      const rec = {
        kind: 'tunnel', ts: new Date().toISOString(), model, skeleton: sk, feature: feat.id,
        reps: runs.length, files: median(runs.map(r => r.files)),
        added: median(runs.map(r => r.added)), removed: median(runs.map(r => r.removed)),
        unparsed: reps - runs.length,
      }
      results.push(rec)
      if (out) appendFileSync(out, JSON.stringify(rec) + '\n')
      console.log(`  ${sk.padEnd(18)} ${feat.id.padEnd(18)} files ${String(rec.files).padStart(3)}  +${String(rec.added).padStart(3)} -${String(rec.removed).padStart(3)}  (${rec.reps}/${reps} parsed)`)
    }
  }
  console.log('\n  per-feature comparison (median lines changed = added+removed):')
  for (const feat of features) {
    const rs = results.filter(r => r.feature === feat.id && r.reps > 0)
    const line = rs.map(r => `${r.skeleton}: ${r.files} files / ${r.added + r.removed} lines`).join('   vs   ')
    console.log(`    ${feat.id.padEnd(18)} ${line}`)
  }
  console.log('\n  v0 evidence grade: diffs are unexecuted (spread + landing site only). v1 = apply + test.')
}

if (invokedDirectly && process.argv[2] === '--self-test') selfTest()
else if (invokedDirectly) main()
