# NVIDIA NIM free-tier rate limits, measured 1 November 2026

Endpoint: `https://integrate.api.nvidia.com/v1`, model `mistralai/mistral-large-4-1t-a52b`, key from `.env`.

## Published position
- build.nvidia.com free tier: ~40 RPM, account-wide, shared across all models on the key. NVIDIA does not publish a per-model number; the FAQ says the limit depends on the model, the use case, and current traffic. No `x-ratelimit-*` headers are returned.
- There is also an inference-credit budget (default 1,000 credits on the free tier). Credits are per token, so a 1T model spends them fast.

## Measured today
- 45 sequential tiny calls at ~31 RPM sustained: all 200, no 429.
- 18 calls at ~30 RPM: all 200, no 429.
- 10 concurrent tiny calls: all 200 in 6.1 s wall. 6 concurrent: all 200 in 5.1 s wall.
- 12 concurrent medium calls (600 max tokens): 4 got 429 instantly, the rest 200 in 30 s wall. So bursts above roughly 8 to 10 in flight trip the limiter even under 40 RPM.

## Rules we adopt
- Cap concurrency at 6 judge calls in flight. That stayed at 200 on every probe.
- Space judge calls so the sustained rate stays under ~30 RPM, because coding agents may share the key.
- The judge keeps `num_retries=3`, which absorbs a 429 with backoff.

## Cost per judge call, measured
- Short prompt: about 0.8 to 1 s, ~30 completion tokens.
- Real payload prompt: 85 to 231 s, 3k to 4.6k completion tokens. The 1T model is slow on reasoning, so judge latency dominates run time, not RPM.
