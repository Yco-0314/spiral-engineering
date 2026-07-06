# Spiral Engineering — spec v0.1 (draft)

> A loop returns to where it started. A spiral doesn't — and can prove it.

**Definition.** Prompt engineering shaped one call; context engineering shaped one session;
harness engineering shaped one task's environment; loop engineering closed the task cycle.
**Spiral engineering is second-order: the loop's output flows back into the system that runs
the loop** — its skills, prompts, gates, evals, and judges — and every such self-change must
carry **evidence**. A self-improvement claim without a measurement is a loop with marketing.

Not Boehm's 1986 spiral *model*, which organized the phases of a project. Spiral *engineering*
organizes the improvement of the development system itself. Its direct lineage is Deming's
PDCA and Argyris's double-loop learning — made mechanically measurable, because the economics
changed: one methodologically clean, full-population measurement of a skill layer now costs
under a dollar. "We couldn't afford to verify" is no longer an excuse.

## 1. The falsifiability contract

A system may call itself a spiral only if it publishes, from its own ledger
(`schema/ledger.schema.json` — two append-only JSONL files):

- **Pitch** — verified self-changes per unit time, each classified by evidence:
  `SHIP` (moved a measured Δ>0, or removed a documented failure mode), `GATE` (structural,
  verified by review/self-test, no single-shot Δ), `NULL` (honest closure: a revert,
  convergence, or correction).
- **Null-ratio** — a spiral that never rejects anything is not measuring.
- **Grounding ratio** — external-triggered vs self-generated changes. The Data Processing
  Inequality is the hard ceiling: a closed loop cannot learn more than its external signal
  carries. Self-certification is not merely bad practice; it is thermodynamically empty.
- **Disambiguation** (von Foerster's eigenform): pitch→0 with high grounding is a *mature*
  system that inspects itself and finds nothing to change; pitch→0 with low grounding is a
  *starved* one. Pitch alone cannot tell death from maturity — grounding can.

**Falsification of the discipline itself:** if, across real projects, ledger-measured spirals
do not outperform unmeasured loop-pattern adoption on realized outcomes (skill-Δ retention
across model swaps, defect escape rate, cost per verified outcome), spiral engineering is a
name, not a discipline. This spec commits to publishing negative results.

## 2. Instruments

Shipped in this repository (zero dependencies, every one `--self-test`ed):

| Instrument | Question it answers | Tool |
|---|---|---|
| Pitch | Is the system verifiably editing itself — at what rate, on what evidence? | `bin/spiral-pitch.mjs` |
| Measured layer | What did automated eval actually record (latest per set@model)? | `bin/spiral-pitch.mjs --evals` |
| Dark-room | Can this eval even reveal value, or is it all-easy? | `bin/dark-room.mjs` |
| Difficulty derivation | Tags from measurement, not opinion (difficulty is model-relative) | `bin/derive-difficulty.mjs` |

Specified here, implemented by any conforming harness (the reference implementation has all
of them):

- **Judge guard** — the grader must be stronger than the model under test; judge==model
  fabricates results (observed: a false Δ0 on the strongest skill in the table).
- **Eval runner contract** — with-vs-without arms, majority vote over N runs, per-case
  transcripts persisted, an `eval` ledger line ALWAYS appended (even `gate:ERROR`), real token
  usage or `null` — never an invented constant.
- **Stall breaker** — same-error-signature detection with reset-on-success; warn, don't block.
- **Verdict protocol** — default-REJECT reviewers, evidence = what the reviewer read itself,
  fail-closed last-line verdict (no verdict = REJECT).
- **Graduation gate** — autonomy earned by consecutive clean ledger runs, and revocable.

## 3. Evidence (reference implementation, 2026-07-06)

The reference implementation is [strata](https://github.com/Yco-0314/strata) — a Claude Code
skill framework whose self-change ledger and eval records back every number below. The raw
exhibit ships in [`examples/strata/`](examples/strata/) and replays through the instruments.

Canonical table — deepseek-chat under test, deepseek-reasoner judging, `EVAL_N=5` majority
vote, whole run ≪ $1:

```
debugging +100 · tdd +100 · grilling +75 · verification-before-completion +50
l0-ponytail +43 · review +25 · complexity-router +13        Σ +406%, 7/7 pass the gate
```

Findings the instruments produced (none available to a pattern catalog):

1. **Judge==model fabricates results.** With the model judging itself, the `debugging` skill
   read Δ0 — flagged dead weight — while its transcripts were textbook-correct. A stronger
   judge: **Δ0 → +100%**, the strongest skill on the table. Correcting the *eval* was the
   progress.
2. **Skill value is model-relative.** A verification skill converges to Δ0 on a strong model
   but scores +50–75% on a weaker one. Depreciation must be per-model; a skill "dead" on
   model A is load-bearing on model B.
3. **Difficulty is model-relative.** 4 of 7 hand-assigned difficulty tags were overturned by
   measured baseline verdicts. Tags are now derived, each set stamped with a traceable
   `difficultyBasis`.
4. **Honest error paths.** A ~1-minute transport window killed 40/40 calls of one set; the
   ledger recorded `gate:ERROR`, the re-run replaced it. Nulls are recorded, never invented.

## 4. Laws (statement → root → instrument → how it dies)

1. **Pitch law.** No measured second-order change, no spiral. *(2nd-order cybernetics →
   spiral-pitch → dies if pitch correlates with nothing downstream.)*
2. **Grounding law.** Learning rate is capped by external signal (DPI). *(Information theory →
   grounding ratio → dies if high-grounding spirals don't outlearn closed ones.)*
3. **Asymmetry law.** Direction comes from gates, not metaphors: verified gains enter easily,
   unverified changes hardly; autonomy is revocable. *(Ratchet-and-pawl → ship gate +
   graduation → dies if gate-less systems accumulate equally well.)*
4. **Depreciation law.** Process capital is a model-specific asset; on model swap, re-measure
   and retire converged pieces — deletion is progress. *(Evidence #2/#3 → derive-difficulty +
   per-model records → dies if Δ tables transfer across models unchanged.)*
5. **Dual-strand law.** The judging strand needs maintenance too: judge stronger than judged,
   human calibration preserved. *(Bainbridge's automation irony → judge guard → dies if weak
   judges prove harmless at scale.)*
6. **Dark-room law.** A healthy spiral lets tasks get harder; rising pass rates on static
   difficulty is hiding, not improving. *(Active inference → dark-room + difficulty axis →
   dies if all-easy evals predict deployed quality just as well.)*

## 5. Prior art and the narrow claim

None of the mechanisms are novel, and this spec says so: self-optimizing skill libraries
(SkillOpt/SkillGen lineage), self-modifying agents benchmarked on variants (Darwin Gödel
Machine), architecture fitness functions (Ford/Parsons/Kua), easy-to-hard curricula (zone of
proximal development), PDCA and double-loop learning (Deming, Argyris). **The defensible
contribution is narrow: honest measurement + mechanical gates + no self-certification,
demonstrated end-to-end on a real ledger — plus the interchange format that lets anyone else
do the same.**

## 6. Anti-patterns

From a 24-repo autopsy of the loop-engineering ecosystem (2026-07): self-certifying audits
(filename regex as "proof of runs"); invented cost constants presented with false precision;
honor-system "binding" prose without enforcement; scaffolding-per-pattern before any need;
manufactured community (pre-written good-first-issues, badge funnels); judging a model with
itself. The failure catalog that *names* "verifier theater" while *being* verifier theater is
the cautionary tale: naming a disease is not a blood test.

## 7. Boundaries — what a spiral does not claim

- It cannot out-learn its grounding channel (DPI): synthetic evals are proxies until
  deployment outcomes calibrate them (open roadmap item).
- It measures process, not product: it can tell you the loop improved, not that you built the
  right thing.
- The architect's residue stays human for now: authoring the distribution of plausible
  futures, risk appetite, organizational negotiation, accountability. The counterfactual
  wind tunnel (roadmap) attacks the technical core — candidate selection under change — not
  these.

## 8. Roadmap (each item ships only through the gate)

1. **MDL total description length** — intervention tokens + residual failure entropy,
   monotonically decreasing: the one number you cannot game by adding more skills.
2. **ADR outcome calibration** — predicted outcomes on architecture decisions + scheduled
   revisits graded against repo evidence: architecture judgment gets a Brier score.
3. **design-tunnel** — agents implement the same next-N features against competing skeletons;
   change-cost becomes a measurement (~$10² per decision vs an architect-week).
4. **Replication protocol** — the falsification experiment of §1, run on repos that aren't
   the reference implementation.

## 9. Conformance

A conforming implementation:

1. keeps the two append-only ledgers of `schema/ledger.schema.json`;
2. never merges records across models;
3. always appends an eval record, including failures (`gate:ERROR`);
4. records real usage or `null` — never an estimate presented as a measurement;
5. judges with a model stronger than the one under test;
6. publishes pitch, null-ratio, and grounding ratio — including when they are ugly.

Publish the numbers. That is the entire discipline.
