# Measuring Cairn on your own knowledge base

[한국어](measure.ko.md) · English

The paper measured Cairn on one knowledge base. Whether it lowers cost on yours depends on your notes, your question mix, your agent harness, and your search setup. This page describes a comparison you can run yourself, and [`scripts/measure.mjs`](../scripts/measure.mjs) computes the statistics from a plain JSONL file of runs.

## What to compare

- **Baseline**: what your agent uses today, for example the raw notes with file tools, a search command only, or both.
- **Cairn**: the same, plus the generated vault and the wayfinding block.

Keep everything else identical between the arms: model, harness and version, tools and permissions, turn limit, system prompt (except the wayfinding block), and the knowledge-base version. Apply any audit rule (for example "no shell reads of the vault") to both arms, not only to Cairn.

## Questions

1. **Fix the question set before you look at results**, and record a hash of the file.
2. **Cover the four question types**: topical lookup, attribute filter, relation lookup, multi-node composition. If you know your real mix, match it; if not, report results per type, because the aggregate depends on the mix.
3. **Hold questions out from design** where possible. If you tune cards or rules while looking at the same questions you then measure, the result favors Cairn (the paper's questions overlapped with design; it says so as a limitation).
4. **Write gold answers mechanically where you can.** For attribute and relation questions, compute the relevant node ids from the front matter, not by hand.

## Runs

- **Run both arms in the same period, in randomized order.** In the paper, a baseline with identical prompts moved by 13.6% between two measurements a few hours apart; a non-concurrent baseline can hide or invent an effect.
- **Several runs per question** (at least three). Single runs are noisy: the paper found a per-question log standard deviation of about 0.22 to 0.24 between repeated runs, and its three measurements of the same comparison gave reductions between 17.7% and 37.0%.
- **Record per run**: question id, question type, arm, run number, tokens (input, output, cache write, and cache read; or their sum), list-price cost, API requests (parallel tool calls count once), tool calls, the answer's ranked node ids, and the vault fingerprint (`.cairn-fingerprint.json`) at start and end.
- **Score retrieval** from the answer, for example Recall@5 and the reciprocal rank of the first relevant node. A cost reduction that loses relevant nodes is not a win.

## Statistics

The headline number is the **ratio of mean costs over the same questions, minus 1**:

```
change = mean_q(cost_cairn(q)) / mean_q(cost_baseline(q)) − 1
```

where each `cost(q)` is the mean over that question's runs. Expensive questions dominate a ratio of means, so also report the change per question type.

For uncertainty, use a **paired bootstrap over questions**: resample questions with replacement (both arms together), recompute the ratio, repeat 10,000 times, and take the 2.5th and 97.5th percentiles. This interval reflects between-question variation and run noise only, not time effects or the selection involved in tuning, so treat it as a lower bound on uncertainty.

## The JSONL format and the script

One JSON object per line. `question` and `arm` are required; metrics are any numeric fields.

```json
{"question": "Q-01", "type": "relation", "arm": "baseline", "run": 1, "tokens": 51234, "cost_usd": 0.0631, "requests": 3}
{"question": "Q-01", "type": "relation", "arm": "cairn", "run": 1, "tokens": 18011, "cost_usd": 0.0262, "requests": 2}
```

```sh
node scripts/measure.mjs runs.jsonl --baseline baseline --treatment cairn \
  --metrics tokens,cost_usd,requests --by type --resamples 10000 --seed 20261013
```

Output: per metric and group, the number of paired questions, the two means, the change, and its 95% CI. Questions that were not run in both arms are left out and listed. Add `--json` for machine-readable output.

[`sample-runs.synthetic.jsonl`](sample-runs.synthetic.jsonl) shows the format. **Its numbers are made up** for illustration; they are not results.

## Reading the result

- If the interval spans zero, a reduction is not established.
- If only one run per question was made, report the direction, not the size.
- Check cost and tokens separately: under prompt caching, cache writes can dominate list-price cost, so the two can move differently.
- Check the per-type results against your real question mix before you decide. In the paper's setting, topical questions saved little, and a search-only setup was cheaper on them.
