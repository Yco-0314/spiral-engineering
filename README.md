# Spiral Engineering · 螺旋工程

> A loop returns to where it started. A spiral doesn't — and can prove it.
> Show me your pitch curve.

**Loop engineering** makes one agent loop reliable. **Spiral engineering** asks whether the
system *running* your loops — the skills, prompts, gates, evals, judges — is verifiably
improving, and refuses to take your word for it. Every self-change carries evidence; every
claim ships with the condition under which it dies.

This repository is the discipline, not a framework:

- **[SPEC.md](SPEC.md)** — definition, the falsifiability contract, six laws (each with a
  death condition), anti-patterns, boundaries, roadmap.
- **[schema/ledger.schema.json](schema/ledger.schema.json)** — the interchange format: two
  append-only JSONL ledgers (`changes` = verified self-changes, `evals` = the measurements
  that back them). The format is the project; tools are replaceable.
- **[bin/](bin/)** — three zero-dependency instruments, each `--self-test`ed:

```bash
node bin/spiral-pitch.mjs --changes changes.jsonl --evals evals.jsonl
                                     # pitch · null-ratio · grounding · measured Σ
node bin/dark-room.mjs --sets sets/ --evals evals.jsonl
                                     # can your eval even reveal anything?
node bin/derive-difficulty.mjs --sets sets/ --evals evals.jsonl --model <id>
                                     # difficulty tags from measurement, not opinion
node bin/design-tunnel.mjs --fixture examples/tunnel --model <id>
                                     # the counterfactual wind tunnel (v0): same future
                                     # requirements vs competing skeletons, change-cost measured
```

The tunnel's first live run is in [`examples/tunnel/results.jsonl`](examples/tunnel/results.jsonl)
— and it refused to confirm the prejudice: the layered skeleton won on exactly one of four
future requirements (soft-delete, where SQL isolation pays), lost on read-cache by 2.7× lines
(the abstraction invited decorator ceremony), and tied the "infra swap" everyone predicts
isolation wins — because the direct skeleton's data access was already contained. The tradeoff
has a *condition*, not a winner. v0 evidence grade: unexecuted diffs (spread + landing site);
v1 = apply + test.

## Try it now, on real data

The [`examples/strata/`](examples/strata/) ledgers are the real, unedited exhibit from the
reference implementation ([strata](https://github.com/Yco-0314/strata), 2026-07-06):

```bash
node bin/spiral-pitch.mjs --changes examples/strata/changes.jsonl --evals examples/strata/evals.jsonl
```

You should see: 19 verified self-changes over 9 days, grounding 89% external, and the
canonical measured table — 7/7 skills moving the number under an N=5 majority vote with a
stronger judge (Σ +406%, whole run under a dollar):

```
debugging +100 · tdd +100 · grilling +75 · verification-before-completion +50
l0-ponytail +43 · review +25 · complexity-router +13
```

The same run also demonstrated why the discipline exists: with the model judging itself, the
best skill on that table read **Δ0** and was flagged for deletion. The instruments caught the
lie; a pattern catalog never would have.

## Adopt it on your repo

1. Start the two ledgers (any adapter works — [`adapters/strata-backlog.mjs`](adapters/strata-backlog.mjs)
   is ~30 lines; write one for your format).
2. Make your eval runner conform (SPEC §9): always append, never merge across models, judge
   stronger than judged, real usage or `null`.
3. Run the instruments. **Publish the numbers — including the ugly ones.**
4. Open a PR linking your pitch curve. Replications, including failed ones, are the community
   mechanic here — not stars.

## 中文速览

从 prompt → context → harness → loop,每一代工程都在往上一层。螺旋工程是下一层的**二阶**问题:
跑循环的系统本身(技能、门、eval、判官)是否在**可验证地**变强。核心是一份可证伪契约——自称螺旋,
就必须公布**螺距**(单位时间被验证的自改进,按证据分类 SHIP/GATE/NULL)、**null 比率**(从不拒绝
任何东西的系统没在度量)、**接地率**(数据处理不等式:封闭循环学不到外部信号之外的东西)。机制无一
新颖(PDCA、双环学习、DGM、fitness functions……),可辩护的贡献很窄:**诚实度量 + 机械门 + 拒绝
自证**,外加让任何仓库都能接入的账本交换格式。`examples/` 里是参考实现的真实账本,可直接复跑。

## Status

v0.1 draft. Reference implementation: [strata](https://github.com/Yco-0314/strata). The
discipline's own falsification condition is stated in SPEC §1 — if measured spirals don't
outperform unmeasured loop-pattern adoption on realized outcomes, this is a name, not a
discipline, and that result will be published here too.

MIT.
