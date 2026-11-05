# Compact stop brief report (slice 25, E7)

Numbers and 8-character session prefixes only. The run folder `fixtures/real/runs/slice25/` holds the call logs, digests and eval outputs. Git ignores it, because it holds real session text. Run settings: `JUDGE_PROVIDER=inception JUDGE_MODEL=mercury-3 JUDGE_REASONING_EFFORT=high`. The script `probes/digest_report.py` computes every number below from those logs.

## Choice for slices 26 and 27

**The full brief.** The compact brief scored lower on the test set (−0.045, interval −0.126 to +0.038), and lower again on the stops with a valid digest (0.470 against 0.536). Mercury 3 gave no valid digest for 17 of 56 stops. The size gain is small: the median input fell from 17,041 to 15,014 characters on the stops with a valid digest, because the prompt instructions are a large part of each input.

## 1. Digest check on human-chat training sessions

Command: `priority digest TRANSCRIPT --stop N --log-dir DIR`, each stop in order, on Mercury 3 (`fixtures/real/runs/slice25/digest2/`). Each later stop reads the stored digest of the session as `PREVIOUS RUN:` (the slice 25 fix in `cli.digest`). The store keeps the last valid digest, so a stop after an invalid digest has no previous run.

|Session|Stop|Model id (call log)|Input chars|Digest|PREVIOUS RUN:|HUMAN ASKED: chars|
|---|---|---|---|---|---|---|
|d3d83e74|1|openai/mercury-3|157,622|invalid_output|no (first stop)|7,795|
|d3d83e74|3|openai/mercury-3|70,698|valid|no (stop 1 invalid)|340|
|d3d83e74|6|openai/mercury-3|7,677|valid|yes|97|
|fe9bb39f|1|openai/mercury-3|110,585|invalid_output|no (first stop)|155|
|fe9bb39f|3|openai/mercury-3|2,625|invalid_output|no (stop 1 invalid)|165|
|fe9bb39f|5|openai/mercury-3|2,917|valid|no (stops 1 and 3 invalid)|181|
|fe9bb39f|7|openai/mercury-3|13,118|valid|yes|49|
|fe9bb39f|9|openai/mercury-3|79,316|valid|yes|113|
|7b308720|1|openai/mercury-3|32,519|invalid_output|no (first stop)|8,271|
|7b308720|2|openai/mercury-3|27,032|valid|no (stop 1 invalid)|157|
|7b308720|3|openai/mercury-3|3,475|valid|yes|168|

- Valid digests: 7 of 11 in this run, and 9 of 11 in the first run without the previous-run fix. Each invalid digest has the same cause: the reply breaks a `RunDigest` length limit (`ran` over 600 characters or `result` over 300). Digest prompt tuning is out of scope for this slice.
- Each later stop with a stored digest before it carried `PREVIOUS RUN:` (4 of 4).
- Each brief has a non-empty `HUMAN ASKED:` section (11 of 11).
- Shrink: no real training stop is over the 160,000-character budget (the largest is 157,622). One shrink call ran on Mercury 3 on the made-up 169,000-character run of the test helpers: input 38,795 characters, reply 71 characters. The digest of that brief was valid.
- Gap: the `priority digest` call log leaves `session_id` and `stop` empty. The rows above take the stop from the run order.

## 2. Arm A on the test set, full and compact brief

Commands: `priority eval --split holdout --threads 3` with the default full brief, then with `--brief compact --digest-dir DIR`. The compact run printed `compact brief: 17 stops fell back to the full brief`. Difference = compact − full. Interval: 95 percent, bootstrap over sessions.

|Set|Stops|Sessions|Full|Compact|Difference|Interval|
|---|---|---|---|---|---|---|
|All|56|24|0.498|0.453|−0.045|−0.126 to +0.038|
|Test set 1|30|6|0.482|0.387|−0.094|−0.219 to +0.005|
|Test set 2|26|18|0.517|0.528|+0.011|−0.079 to +0.102|
|Stops with a valid digest|39|19|0.536|0.470|−0.066|not computed|

Other lines: full brief 2,039,189 characters sent in 56 calls; compact brief 2,892,334 characters in 112 calls (56 digest calls on the full brief, then 56 task calls). Judge errors 0, model errors 0 in both runs.

## 3. Per stop

Character size = the rendered task-model input of the stop. A fallback stop got the full brief in the compact run.

|Session|Stop|Test set|Full chars|Compact chars|Digest|Full|Compact|
|---|---|---|---|---|---|---|---|
|16505e93|2|2|21937|22060|valid|0.500|0.333|
|16505e93|3|2|40902|14466|valid|0.500|0.500|
|173ae36f|1|1|17626|17626|fallback|0.500|0.333|
|173ae36f|5|1|15324|13823|valid|1.000|0.500|
|173ae36f|8|1|16171|15999|valid|0.800|0.500|
|173ae36f|12|1|15514|15489|valid|0.500|0.250|
|173ae36f|16|1|27397|21946|valid|0.500|0.000|
|391d47b9|1|2|42094|14634|valid|0.500|0.500|
|396b87e9|1|2|52034|52034|fallback|0.000|0.000|
|3b3d87e3|1|2|102526|15175|valid|0.500|0.500|
|40711e5b|6|2|132458|132458|fallback|0.500|0.250|
|43e055c1|2|2|19122|19122|fallback|0.500|0.500|
|5597ca26|1|2|14211|14118|valid|0.286|0.286|
|5597ca26|7|2|20500|13931|valid|0.000|0.700|
|5597ca26|13|2|96318|96318|fallback|0.750|0.600|
|5597ca26|19|2|13899|13368|valid|0.000|0.640|
|5597ca26|25|2|14096|13584|valid|0.500|0.500|
|63996751|18|2|16579|17502|valid|0.600|0.750|
|71a58b52|1|1|27166|15142|valid|0.500|0.500|
|71a58b52|3|1|14257|14706|valid|0.500|0.667|
|71a58b52|6|1|66433|15683|valid|0.700|0.700|
|71a58b52|8|1|26611|15014|valid|0.500|0.500|
|71a58b52|10|1|18128|18128|fallback|0.500|0.250|
|7438c281|1|2|65435|14295|valid|0.429|0.500|
|7ce2f07b|4|2|57384|14883|valid|0.500|0.500|
|7f26f5b0|1|1|44698|44698|fallback|0.220|0.667|
|7f26f5b0|3|1|36584|15200|valid|0.500|0.500|
|7f26f5b0|4|1|24547|16807|valid|0.600|0.500|
|7f26f5b0|6|1|17041|15011|valid|0.500|0.500|
|7f26f5b0|8|1|16977|13925|valid|0.500|0.500|
|7f58085f|1|1|20301|20301|fallback|0.500|0.500|
|7f58085f|8|1|14578|15628|valid|0.500|0.250|
|7f58085f|15|1|18030|14718|valid|0.778|0.700|
|7f58085f|22|1|26153|26153|fallback|0.500|0.500|
|7f58085f|29|1|16285|15012|valid|0.600|0.000|
|a2f34209|1|1|16310|16301|valid|0.600|0.600|
|a2f34209|5|1|24058|24058|fallback|0.200|0.400|
|a2f34209|8|1|14352|14523|valid|0.500|0.530|
|a2f34209|12|1|23347|23347|fallback|0.400|0.500|
|a2f34209|16|1|23168|24450|valid|0.727|0.000|
|a41510dd|10|2|39354|17094|valid|0.500|0.333|
|a6060e50|2|2|116847|116847|fallback|0.500|0.500|
|af644c7f|49|2|13139|13305|valid|1.000|1.000|
|b8272515|5|2|159626|159626|fallback|0.600|0.670|
|e5d71545|1|2|134407|14985|valid|0.500|0.500|
|e924e1e7|1|1|15504|15504|fallback|0.000|0.333|
|e924e1e7|37|1|16113|16439|valid|0.000|0.000|
|e924e1e7|72|1|18898|18898|fallback|0.000|0.000|
|e924e1e7|108|1|20369|20369|fallback|0.500|0.111|
|e924e1e7|144|1|15881|16029|valid|0.333|0.333|
|e9ebcd88|2|2|17094|14067|valid|0.700|0.667|
|f33925f0|1|2|79892|79892|fallback|0.818|0.900|
|f33925f0|6|2|14025|15006|valid|0.750|0.700|
|f33925f0|8|2|15361|16619|valid|0.700|0.900|
|f33925f0|12|2|15247|16525|valid|0.800|0.000|
|f6cdd6bb|4|2|56881|15536|valid|0.500|0.500|
