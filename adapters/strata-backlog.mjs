#!/usr/bin/env node
// Adapter: strata's improve-loop/backlog.json → changes.jsonl (schema/ledger.schema.json).
// Any project's self-change ledger plugs into the instruments through one of these — ~30 lines.
// Emits to stdout: node adapters/strata-backlog.mjs <backlog.json> > changes.jsonl
import { readFileSync } from 'node:fs'

const backlog = JSON.parse(readFileSync(process.argv[2], 'utf8'))
for (const i of backlog.items || []) {
  if (i.status !== 'resolved' || !i.resolution) continue
  const ts = (i.resolution.match(/\b(20\d\d-\d{2}-\d{2})\b/) || [])[1]
  if (!ts) continue
  const cls = ['ship', 'gate', 'null'].includes(i.spiralClass) ? i.spiralClass
    : /revert|superseded|converge|no movement|do not chase|corrected|stays pending|out of scope/i.test(i.resolution) ? 'null'
    : /Δ\s*[+-]?\s*[1-9]\d*\s*%|moves the number|no regression/i.test(i.resolution) ? 'ship' : 'gate'
  const delta = cls === 'ship' ? parseInt((i.resolution.replace(/−/g, '-').match(/([+-]?\d+)\s*%/) || [])[1] ?? 'NaN', 10) : null
  const named = /arxiv|loop-engineering|superpowers|karpathy|anthropic|\bGSD\b|vercel|skill-tools|agent-ecosystem|trail of bits|borrow|\bfrom\s+\S/i
  process.stdout.write(JSON.stringify({
    kind: 'change', ts, id: i.id, class: cls,
    delta: Number.isFinite(delta) ? delta : null,
    grounding: named.test(i.hypothesis || '') || named.test(i.resolution) ? 'external' : 'internal',
    evidence: i.resolution.slice(0, 200),
    target: i.target || null,
  }) + '\n')
}
