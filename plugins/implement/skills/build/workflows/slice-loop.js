// RED, GREEN, and VALIDATE are plugin agents, not inline prompts. Each
// agent() call below spawns one by its agentType ('implement:red',
// 'implement:green', 'implement:validate'). Their bodies, under
// plugins/implement/agents/, hold the scope contract, the blind rule, and
// the report format. The message passed here carries only the per-slice
// values those bodies need filled in.
export const meta = {
  name: 'slice-loop',
  description: 'Build approved vertical slices via red-green-validate, gated on an independent blind score',
  whenToUse: 'After Gate 4 is approved and the blind rubrics exist. The user must have opted into multi-agent orchestration.',
  phases: [
    { title: 'Red', detail: 'write failing tests that define each slice contract' },
    { title: 'Green', detail: 'minimal implementation, retried against validator feedback' },
    { title: 'Validate', detail: 'independent scoring against the blind rubric' },
    { title: 'Report', detail: 'roll up scores, escalations, and open gaps' },
  ],
}

// ---------------------------------------------------------------------------
// args: {
//   slug:         feature slug, e.g. "webhook-retry"
//   testCommand:  exact suite command, e.g. "pytest tests/ -v"
//   slices:       [{ id, name, goal, epicId, epicDesignExists, guidance, browserEvidence }]
//                 in build order. epicDesignExists is required for any slice
//                 whose epic carries more than one slice (Gate 4b). Workflow
//                 scripts have no filesystem access, so the orchestrating
//                 session must check `docs/plans/<slug>/epic-<epicId>-design.md`
//                 itself — e.g. with verify_gate.py — before invoking this
//                 workflow, and pass the result in.
//                 guidance: optional free text specific to this slice (a
//                 pattern to follow, a pitfall to avoid). Injected into the
//                 GREEN prompt only — RED writes the contract from the
//                 program design alone, so guidance cannot leak the answer
//                 into the tests.
//                 browserEvidence: optional. When true, GREEN must produce a
//                 browser-evidence file for this slice, and VALIDATE scores
//                 every browser-related criterion 0.0 if that file is
//                 missing or records a console error. Opt in per slice —
//                 most slices have no UI surface to evidence.
//   accept:       optional, default 0.90
//   maxAttempts:  optional, default 3
//   model:        optional model override applied to every RED and GREEN
//                 agent (e.g. 'claude-sonnet-5'). VALIDATE always inherits
//                 the session model — an independent auditor should not
//                 share the builder's model override by accident.
// }
// ---------------------------------------------------------------------------

const slug = args?.slug
const testCommand = args?.testCommand
const slices = args?.slices ?? []
const ACCEPT = args?.accept ?? 0.90
const MAX_ATTEMPTS = args?.maxAttempts ?? 3
const BUILD_MODEL = args?.model

if (!slug || !testCommand || slices.length === 0) {
  throw new Error('slice-loop needs args: { slug, testCommand, slices: [{id, name, goal}] }')
}

const plan = `docs/plans/${slug}`
const rubrics = `.cobuilder/rubrics/${slug}`
const evidence = `${rubrics}/evidence`

const BLIND = `Do not read anything under .cobuilder/ — it holds the acceptance rubric,
which you must not see. Building to the rubric instead of to the requirement voids
the score for this slice.`

const scopeContract = (s) => `SCOPE CONTRACT
Your scope is exactly one slice: slice ${s.id}, "${s.name}".
Goal: ${s.goal}
Do not build, test, or refactor anything belonging to a later slice, even if it
looks helpful — those are separate iterations and their code does not exist yet.
Do not modify or delete work from earlier slices beyond the minimum needed to
integrate this one.`

const RED_SCHEMA = {
  type: 'object',
  required: ['testFiles', 'newFailingTests', 'failuresAreAssertions', 'preexistingPassCount'],
  properties: {
    testFiles: { type: 'array', items: { type: 'string' } },
    newFailingTests: { type: 'integer' },
    failuresAreAssertions: { type: 'boolean', description: 'false if any new test fails on an import/collection/syntax error rather than an assertion' },
    preexistingPassCount: { type: 'integer' },
    notes: { type: 'string' },
  },
}

const GREEN_SCHEMA = {
  type: 'object',
  required: ['filesChanged', 'testsPassed', 'testsFailed', 'touchedATestFile'],
  properties: {
    filesChanged: { type: 'array', items: { type: 'string' } },
    testsPassed: { type: 'integer' },
    testsFailed: { type: 'integer' },
    touchedATestFile: { type: 'boolean', description: 'true if any test file appears in the diff — this voids the run' },
    feedbackAddressed: { type: 'string', description: 'on a retry, how each prior gap was addressed' },
    browserEvidencePath: { type: 'string', description: 'path to the browser-evidence file written for this slice, only when browserEvidence was required' },
  },
}

const VALIDATE_SCHEMA = {
  type: 'object',
  required: ['verdict', 'overallScore', 'criteria', 'voided'],
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL', 'ESCALATION', 'VOID'] },
    overallScore: { type: 'number' },
    voided: { type: 'boolean' },
    voidReason: { type: 'string' },
    criticalFailed: { type: 'boolean' },
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'score', 'evidence'],
        properties: {
          id: { type: 'string' },
          claim: { type: 'string' },
          score: { type: 'number' },
          critical: { type: 'boolean' },
          evidence: { type: 'string' },
          gap: { type: 'string' },
        },
      },
    },
    guidance: { type: 'string', description: 'actionable, specific next-attempt guidance; mandatory unless PASS' },
  },
}

const results = []

// How many slices, across the whole build, each epic carries. An epic that
// carries more than one slice needed a Gate 4b design (SKILL.md, Gate 4b).
// A single-slice epic — e.g. a spike — legitimately has none.
const slicesPerEpic = {}
for (const s of slices) {
  if (s.epicId) slicesPerEpic[s.epicId] = (slicesPerEpic[s.epicId] || 0) + 1
}

// Slices are sequential by construction — slice N builds on slice N-1.
// The parallelism here is inside a slice (the retry loop), not across slices.
for (const s of slices) {
  phase('Red')
  log(`Slice ${s.id} — ${s.name}: writing the contract`)

  const needsEpicDesign = Boolean(s.epicId) && slicesPerEpic[s.epicId] > 1
  const epicDesignPath = s.epicId ? `${plan}/epic-${s.epicId}-design.md` : null

  // Gate 4b requires a per-epic technical solution design for any epic that
  // carries more than one slice. Earlier versions of this loop fell back to
  // 03-program-design.md silently when the file was absent, which let six
  // epics ship with zero epic-*-design.md files while 00-status.md still
  // read Gate 4 as approved. Stop here instead, the same way a missing
  // rubric already stops scoring — an absent artifact must halt the loop,
  // not be routed around. Workflow scripts have no filesystem access, so
  // the existence check itself ran in the orchestrating session (e.g. via
  // verify_gate.py) before this workflow was invoked, and its result
  // travels in on `s.epicDesignExists`.
  if (needsEpicDesign && s.epicDesignExists !== true) {
    log(
      `Slice ${s.id} stopped: epic ${s.epicId} carries ${slicesPerEpic[s.epicId]} slices, `
      + `so Gate 4b requires ${epicDesignPath}, which the caller did not confirm exists.`,
    )
    results.push({
      slice: s,
      verdict: 'ERROR',
      reason: `Gate 4b missing: ${epicDesignPath} not confirmed to exist for epic ${s.epicId}`,
    })
    break
  }

  let epicDesignDoc
  if (needsEpicDesign) {
    epicDesignDoc = epicDesignPath
  } else {
    epicDesignDoc = `${plan}/03-program-design.md`
    if (s.epicId) {
      // Deliberate fallback, not the silent one this fix removes: epic
      // ${s.epicId} carries exactly one slice, so Gate 4b never required a
      // design for it (SKILL.md, Gate 4b: "For an epic carrying multiple
      // slices").
      log(`Slice ${s.id}: epic ${s.epicId} carries one slice, so Gate 4b needs no epic design. Reading ${epicDesignDoc} instead.`)
    }
  }

  const red = await agent(
    `slug: ${slug}
plan directory: ${plan}
slice: ${s.id} — "${s.name}"
epic design doc: ${epicDesignDoc}
04-slices.md: ${plan}/04-slices.md
test command: ${testCommand}

${scopeContract(s)}
${BLIND}`,
    { label: `red:slice-${s.id}`, phase: 'Red', schema: RED_SCHEMA, model: BUILD_MODEL, agentType: 'implement:red' },
  )

  if (!red) {
    results.push({ slice: s, verdict: 'ERROR', reason: 'RED agent returned nothing' })
    continue
  }
  if (!red.failuresAreAssertions) {
    log(`Slice ${s.id}: RED produced tests that fail on errors, not assertions — the contract is not real. Skipping to report.`)
    results.push({ slice: s, verdict: 'VOID', reason: 'RED tests fail on errors, not assertions', red })
    continue
  }

  let attempt = 0
  let verdict = null
  let last = null

  while (attempt < MAX_ATTEMPTS) {
    attempt += 1

    phase('Green')
    const green = await agent(
      `slug: ${slug}
plan directory: ${plan}
slice: ${s.id} — "${s.name}"
epic design doc: ${epicDesignDoc}
failing test files: ${(red.testFiles || []).join(', ')}
test command: ${testCommand}

${scopeContract(s)}
${BLIND}

${attempt > 1
  ? `This is RETRY ${attempt}. The feedback file at ${evidence}/slice-${s.id}-feedback.md
exists. Every gap in its "Actionable guidance" section MUST be addressed in
this attempt. Do not repeat a mistake the feedback already named.`
  : `This is attempt 1. The feedback file will not exist yet.`}
${s.guidance ? `\nSlice-specific guidance:\n${s.guidance}\n` : ''}
${s.browserEvidence ? `\nThis slice requires browser evidence. Write
${evidence}/slice-${s.id}-browser.md recording the page(s) you loaded, the
actions you took, a screenshot or DOM excerpt proving the behavior, and the
full console log for that session. A run with a console error in it is not
evidence of a working slice — fix the error before reporting. Report the
file's path as browserEvidencePath.` : ''}`,
      { label: `green:slice-${s.id}:a${attempt}`, phase: 'Green', schema: GREEN_SCHEMA, model: BUILD_MODEL, agentType: 'implement:green' },
    )

    if (!green) {
      last = { verdict: 'ERROR', reason: 'GREEN agent returned nothing', attempt }
      break
    }

    phase('Validate')
    const v = await agent(
      `slug: ${slug}
slice: ${s.id} — "${s.name}"
rubric: ${rubrics}/slice-${s.id}.md
manifest: ${rubrics}/manifest.yaml
feedback file (if it exists): ${evidence}/slice-${s.id}-feedback.md
test command: ${testCommand}
this is attempt ${attempt} of ${MAX_ATTEMPTS}
accept threshold: ${ACCEPT}
${s.browserEvidence ? `\nThis slice requires browser evidence. Read
${green.browserEvidencePath || `${evidence}/slice-${s.id}-browser.md`}. Score
every browser-related criterion 0.0, with that fact as the cited evidence, if
the file is missing, records no console log or a console error, or the
screenshot/DOM excerpt does not match what the criterion claims.` : ''}

Write your findings to ${evidence}/slice-${s.id}-attempt-${attempt}.md and
append the same block to ${evidence}/slice-${s.id}-feedback.md.`,
      { label: `validate:slice-${s.id}:a${attempt}`, phase: 'Validate', schema: VALIDATE_SCHEMA, effort: 'high', agentType: 'implement:validate' },
    )

    if (!v) {
      last = { verdict: 'ERROR', reason: 'VALIDATE agent returned nothing', attempt }
      break
    }

    last = { ...v, attempt, green }
    log(`Slice ${s.id} attempt ${attempt}: ${v.verdict} @ ${v.overallScore}`)

    if (v.verdict === 'PASS' || v.verdict === 'VOID' || v.verdict === 'ESCALATION') {
      verdict = v.verdict
      break
    }
    // FAIL → loop back into Green with the feedback file now on disk.
  }

  if (!verdict && last) verdict = last.verdict === 'ERROR' ? 'ERROR' : 'ESCALATION'
  results.push({ slice: s, verdict, ...last })

  // A voided or errored slice stops the run — later slices build on this one.
  if (verdict === 'VOID' || verdict === 'ERROR') {
    log(`Slice ${s.id} ended ${verdict}. Stopping: later slices build on this one.`)
    break
  }
}

phase('Report')

const passed = results.filter(r => r.verdict === 'PASS')
const escalated = results.filter(r => r.verdict === 'ESCALATION')
const broken = results.filter(r => r.verdict === 'VOID' || r.verdict === 'ERROR')
const notRun = slices.filter(s => !results.some(r => r.slice.id === s.id))

if (notRun.length) log(`NOT RUN: ${notRun.map(s => `slice ${s.id}`).join(', ')} — the run stopped early.`)

return {
  slug,
  threshold: ACCEPT,
  passed: passed.map(r => ({ id: r.slice.id, name: r.slice.name, score: r.overallScore, attempts: r.attempt })),
  escalated: escalated.map(r => ({
    id: r.slice.id,
    name: r.slice.name,
    score: r.overallScore,
    unmet: (r.criteria || []).filter(c => c.score < 1.0).map(c => ({ id: c.id, gap: c.gap, critical: c.critical })),
    guidance: r.guidance,
  })),
  voidedOrErrored: broken.map(r => ({ id: r.slice.id, verdict: r.verdict, reason: r.voidReason || r.reason })),
  notRun: notRun.map(s => s.id),
  // Deliberately not written to 00-status.md here — the orchestrating session
  // records scores and takes escalations to the user at a slice boundary.
  // The goal.json sync and, if Hindsight is available, the per-slice retain
  // (see references/goal-sync.md and references/hindsight-routine.md) also
  // run in the orchestrating session, not in this script.
}
