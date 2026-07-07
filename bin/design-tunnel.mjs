#!/usr/bin/env node
// design-tunnel v0 — the counterfactual wind tunnel (SPEC roadmap item 3).
// The reason architecture judgment never became empirical is that the road not taken was
// unaffordable to build. Agents changed the economics: throw the SAME future requirements at
// COMPETING skeletons and MEASURE the cost of change instead of arguing about it.
//   v0 (default): one-shot diff proxy — files-touched and lines-changed parsed DETERMINISTICALLY
//   from the emitted unified diff (no judge anywhere). Diffs are not executed.
//   v1 (--verify): each diff is APPLIED to a scratch copy (git apply, GNU-patch fuzz fallback),
//   TYPE-CHECKED (tsc), and probed by a per-feature BEHAVIORAL test through the skeletons'
//   shared route surface (fixture tests/ dir). Change-cost medians then count only VERIFIED
//   reps; apply/compile/test attrition is reported per cell — attrition is itself a finding.
// Requires ANTHROPIC_API_KEY (+ optional ANTHROPIC_BASE_URL for compatible endpoints).
//   node bin/design-tunnel.mjs --fixture examples/tunnel --model deepseek-chat [--reps 3] [--verify] [--out results.jsonl]
//   node bin/design-tunnel.mjs --self-test
import { readFileSync, readdirSync, appendFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolve, join, basename } from 'node:path'
import { tmpdir } from 'node:os'

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

// Pure: -p level for applying a diff — 1 when paths carry a/ b/ prefixes, else 0.
export const detectPatchLevel = (diff = '') => /^(---|\+\+\+) [ab]\//m.test(unfence(diff)) ? 1 : 0

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

// v1 pipeline: apply → compile → behavioral probe, in a throwaway dir. Never throws.
function verifyRep(skeletonDir, diffText, testFile) {
  const wd = mkdtempSync(join(tmpdir(), 'tunnel-'))
  const r = { applied: false, compiled: false, tested: false }
  try {
    for (const f of readdirSync(skeletonDir).filter(f => f.endsWith('.ts'))) cpSync(resolve(skeletonDir, f), join(wd, f))
    writeFileSync(join(wd, '.change.diff'), unfence(diffText) + '\n')
    const p = `-p${detectPatchLevel(diffText)}`
    try { execFileSync('git', ['apply', p, '--whitespace=nowarn', '.change.diff'], { cwd: wd, stdio: 'pipe' }); r.applied = true } catch {}
    if (!r.applied) { try { execFileSync('patch', [p, '-N', '--fuzz=3', '-i', '.change.diff'], { cwd: wd, stdio: 'pipe' }); r.applied = true } catch {} }
    if (!r.applied) return r
    try {
      execFileSync('npx', ['--yes', 'tsc', '--target', 'es2022', '--module', 'commonjs', '--esModuleInterop', '--outDir', '.build',
        ...readdirSync(wd).filter(f => f.endsWith('.ts'))], { cwd: wd, stdio: 'pipe', timeout: 120000 })
      r.compiled = true
    } catch {}
    if (!r.compiled) return r
    try { execFileSync('node', [testFile, join(wd, '.build')], { stdio: 'pipe', timeout: 30000 }); r.tested = true } catch {}
    return r
  } catch { return r } finally { rmSync(wd, { recursive: true, force: true }) }
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
  ok(detectPatchLevel(d) === 1, 'a/ b/ prefixed diff → -p1')
  ok(detectPatchLevel('--- users.ts\n+++ users.ts\n@@ -1 +1 @@\n-x\n+y') === 0, 'bare paths → -p0')
  ok(detectPatchLevel('```diff\n--- a/x.ts\n+++ b/x.ts\n```') === 1, 'fenced diff level detected')
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
  const verify = argv.includes('--verify')
  const { features } = JSON.parse(readFileSync(resolve(fixture, 'features.json'), 'utf8'))
  const skeletons = readdirSync(fixture, { withFileTypes: true }).filter(e => e.isDirectory() && e.name !== 'tests').map(e => e.name).sort()
  if (verify) for (const feat of features) {
    if (!existsSync(resolve(fixture, 'tests', feat.id + '.cjs'))) { console.error(`--verify needs tests/${feat.id}.cjs in the fixture`); process.exit(1) }
  }
  console.log(`design-tunnel ${verify ? 'v1 — verified diffs (apply → tsc → behavioral probe)' : 'v0 — one-shot diff proxy'} · model ${model} · reps ${reps}`)
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
          const text = runModel(buildPrompt(files, feat.task), model)
          const stats = diffStats(text)
          if (!stats.parsed) continue
          if (verify) Object.assign(stats, verifyRep(dir, text, resolve(fixture, 'tests', feat.id + '.cjs')))
          runs.push(stats)
        } catch (e) { process.stderr.write(`  ! ${sk}/${feat.id} rep ${i + 1}: ${String(e.message).slice(0, 80)}\n`) }
      }
      // In verify mode, change-cost medians count ONLY reps that passed the behavioral probe.
      const counted = verify ? runs.filter(r => r.tested) : runs
      const rec = {
        kind: 'tunnel', ts: new Date().toISOString(), model, skeleton: sk, feature: feat.id,
        version: verify ? 'v1-verified' : 'v0-diff-proxy',
        reps: runs.length, unparsed: reps - runs.length,
        files: median(counted.map(r => r.files)),
        added: median(counted.map(r => r.added)), removed: median(counted.map(r => r.removed)),
        ...(verify ? {
          applied: runs.filter(r => r.applied).length,
          compiled: runs.filter(r => r.compiled).length,
          tested: counted.length,
        } : {}),
      }
      results.push(rec)
      if (out) appendFileSync(out, JSON.stringify(rec) + '\n')
      const funnel = verify ? `  apply ${rec.applied}/${rec.reps} · tsc ${rec.compiled}/${rec.reps} · probe ${rec.tested}/${rec.reps}` : `  (${rec.reps}/${reps} parsed)`
      console.log(`  ${sk.padEnd(18)} ${feat.id.padEnd(18)} files ${String(rec.files).padStart(4)}  +${String(rec.added).padStart(3)} -${String(rec.removed).padStart(3)}${funnel}`)
    }
  }
  console.log(`\n  per-feature comparison (medians over ${verify ? 'VERIFIED reps only' : 'parsed reps'}):`)
  for (const feat of features) {
    const rs = results.filter(r => r.feature === feat.id)
    const line = rs.map(r => r.files === null ? `${r.skeleton}: 0 verified` : `${r.skeleton}: ${r.files} files / ${r.added + r.removed} lines`).join('   vs   ')
    console.log(`    ${feat.id.padEnd(18)} ${line}`)
  }
  console.log(verify
    ? '\n  v1 evidence grade: applied + type-checked + behaviorally probed. Attrition is a finding.'
    : '\n  v0 evidence grade: diffs are unexecuted (spread + landing site only). v1 = --verify.')
}

if (invokedDirectly && process.argv[2] === '--self-test') selfTest()
else if (invokedDirectly) main()
