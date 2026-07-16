# Spiral Engineering · 螺旋工程

> A loop returns to where it started. A spiral doesn't — **and can prove it.**
> Show me your pitch curve.

Prompt engineering shaped one call. Context engineering shaped one session. Harness and loop
engineering made one task's cycle reliable. **Spiral engineering asks the second-order question
none of them ask: is the system *running* your loops — the skills, prompts, gates, evals,
judges — verifiably improving?** Not "it feels smarter". Measured, on an append-only ledger,
receipts published — including the ugly ones.

**A self-improvement claim without a measurement is a loop with marketing.**

## Why care

- **Verification just got cheap.** One methodologically clean, full-population measurement of
  a skill library — N=5 majority vote, judge stronger than the judged — now costs **under a
  dollar**. "We couldn't afford to verify" retired in 2026.
- **Your eval is probably lying to you.** The reference ledger caught three eval pathologies
  in ten days (below). Each one had already flipped a real decision; none is visible to a
  pattern catalog.
- **Every claim here states how it dies.** The spec's six laws each carry a falsification
  condition — including the discipline itself: if measured spirals don't outperform unmeasured
  loop-pattern adoption on realized outcomes, this was a name, not a discipline, and that
  result gets published here too (SPEC §1).

## The receipts — a real ledger, not a demo

[strata](https://github.com/Yco-0314/strata), reference implementation #1: **22 verified
self-changes over 10 days, grounding 86% external**, and this canonical table (deepseek-chat
under test, deepseek-reasoner judging, N=5, whole run under a dollar):

```
review +100 · debugging +100 · grilling +75 · tdd +75
verification-before-completion +50 · l0-ponytail +43 · complexity-router +13
                                        Σ +456% · 7/7 skills move the number
```

Run it yourself — the [`examples/strata/`](examples/strata/) ledgers are the real, unedited
exhibit:

```bash
node bin/spiral-pitch.mjs --changes examples/strata/changes.jsonl --evals examples/strata/evals.jsonl
```

Three eval pathologies the instruments caught — the reason the discipline exists:

1. **Judge-confound.** With the model judging itself, the *best* skill read Δ0 and was headed
   for deletion. Re-judged by a stronger model: **Δ0 → +100%**. Correcting the eval *was* the
   progress.
2. **Guessed difficulty.** 4 of 7 hand-assigned difficulty tags were overturned by measured
   baselines. Tags are now derived from data, with a traceable basis.
3. **Assert drift.** review's eval asserts fell behind the skill's own evolved output
   contract — reading +25 for a +100 skill until transcript-feedback caught it.

And the counterfactual wind tunnel ([design-tunnel](bin/design-tunnel.mjs), both live runs in
[`examples/tunnel/results.jsonl`](examples/tunnel/results.jsonl)) produced a finding about
*measurement itself*: of 24 architecture-comparison diffs the unexecuted-diff proxy (v0) had
happily scored, v1's verification pipeline (apply → compile → behavioral probe) passed
**7 → 5 → 4 (17%)**. Most of what the proxy "measured" could never have been applied; one rep
compiled but didn't actually cache. **Behavioral verification is the floor, not the ceremony.**
(v0's own result was already anti-hype: the layered skeleton won exactly one of four future
requirements — the tradeoff has a *condition*, not a winner.)

## What's in the box

- **[SPEC.md](SPEC.md)** — the falsifiability contract: pitch (verified self-changes,
  classified SHIP/GATE/NULL), null-ratio (a spiral that never rejects anything is not
  measuring), grounding ratio (a closed loop cannot out-learn its external signal — the Data
  Processing Inequality, so self-certification is thermodynamically empty). Six laws, each
  with a death condition. Anti-patterns, boundaries, roadmap.
- **[schema/ledger.schema.json](schema/ledger.schema.json)** — the interchange format: two
  append-only JSONL ledgers (`changes` = verified self-changes, `evals` = the measurements
  that back them). **The format is the project; the tools are replaceable.**
- **[bin/](bin/)** — four zero-dependency instruments, each `--self-test`ed:

```bash
node bin/spiral-pitch.mjs --changes changes.jsonl --evals evals.jsonl
                                     # pitch · null-ratio · grounding · measured Σ
node bin/dark-room.mjs --sets sets/ --evals evals.jsonl
                                     # can your eval even reveal anything?
node bin/derive-difficulty.mjs --sets sets/ --evals evals.jsonl --model <id>
                                     # difficulty tags from measurement, not opinion
node bin/design-tunnel.mjs --fixture examples/tunnel --model <id> [--verify]
                                     # same future requirements vs competing skeletons:
                                     # change-cost measured, diffs behaviorally verified
```

This repo keeps its own ledger ([`changes.jsonl`](changes.jsonl)) — the discipline applied to
itself, from commit one.

## Adopt it on your repo — an afternoon, not a migration

1. Start the two ledgers. Any adapter works —
   [`adapters/strata-backlog.mjs`](adapters/strata-backlog.mjs) is ~30 lines; write one for
   your format.
2. Make your eval runner conform (SPEC §9): always append, never merge across models, judge
   stronger than judged, real usage or `null` — never an estimate presented as a measurement.
3. Run the instruments. **Publish the numbers — including the ugly ones.**
4. Open a PR linking your pitch curve. **Replications — including failed ones — are the
   community mechanic here. Not stars.**

## Run it from Claude Code or Codex

The discipline splits into two layers on purpose. The **instruments** (zero-dep node + JSONL)
are host-neutral — any agent with a shell runs them identically. The **discipline layer**
(making the agent actually follow the loop) is where hosts differ:

- **Claude Code** — full mechanical enforcement via the reference implementation: install
  [strata](https://github.com/Yco-0314/strata) as a namespaced plugin
  (`claude plugin marketplace add <repo> && claude plugin install strata@strata`), then say
  "run the improve loop". Skills drive measure→gate→record; hooks enforce at edit time
  (skill validation, a same-error circuit breaker). On a repo without strata, wrap the
  `bin/` commands in a skill of your own.
- **Codex** — instruments unchanged, from the shell. Discipline goes in `.agents/AGENTS.md`
  (strata ships `scripts/install.sh --host codex --apply`, which installs its skills to
  `~/.agents/skills` and prints the AGENTS.md line). Codex has no hook system, so the
  mechanical gates shift to CI — the layer both hosts share anyway.
- **Any model endpoint** — nothing here is vendor-bound: the exhibit itself was measured on
  DeepSeek through an Anthropic-compatible endpoint (`ANTHROPIC_BASE_URL`), judge stronger
  than judged.

Honest asymmetry: edit-time enforcement exists only where the host has hooks. Where it
doesn't, the ledger still catches drift — one gate later, in CI, instead of in-session.

## 中文速览

从 prompt → context → harness → loop，每一代工程都在往上一层。**螺旋工程是二阶问题：跑循环的
系统本身（技能、门、eval、判官）是否在可验证地变强。** 没有度量的自我改进声明，只是带营销的循环。

- **可证伪契约**：自称螺旋，就必须公布**螺距**（单位时间被验证的自改进，按证据分类
  SHIP/GATE/NULL）、**null 比率**（从不拒绝任何东西的系统没在度量）、**接地率**（数据处理不等式：
  封闭循环学不到外部信号之外的东西，自证在热力学上是空的）。六条定律，每条自带死亡条件。
- **真账本**：参考实现 10 天 22 条已验证自改进，7/7 技能 Δ>0（Σ +456%），整轮度量不到 1 美元；
  三类 eval 病理全被仪器抓出——模型自判自评时，最强的技能读作 Δ0，差点被删。
- **窄贡献，诚实说**：机制无一新颖（PDCA、双环学习、DGM、fitness functions……），可辩护的只有
  **诚实度量 + 机械门 + 拒绝自证**，外加一份任何仓库都能接入的账本交换格式。

**双宿主**：仪器层零依赖、宿主无关，Claude Code 和 Codex 的 shell 里跑法一样；纪律层在
Claude Code 走 strata 插件（skills + hooks 机械强制），Codex 走 `.agents/AGENTS.md`（无 hooks，
机械门移到 CI）。`examples/` 里是真实账本，可直接复跑。把数字发表出来——包括难看的那些，
这就是全部纪律。

## Status

v0.1 draft. Reference implementation: [strata](https://github.com/Yco-0314/strata). Roadmap
items 1–3 (MDL Pareto gauge, ADR outcome calibration, design-tunnel) have shipped through the
gate; open: agentic design-tunnel v2 and the replication protocol — the falsification
experiment of SPEC §1, run on repos that aren't the reference implementation. If that
experiment kills the discipline, the obituary will be published here.

MIT.
