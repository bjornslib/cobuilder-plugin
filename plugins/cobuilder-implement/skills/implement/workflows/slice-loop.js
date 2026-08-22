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
//   slices:       [{ id, name, goal, epicId }]   in build order
//   accept:       optional, default 0.90
//   maxAttempts:  optional, default 3
// }
// ---------------------------------------------------------------------------

const slug = args?.slug
const testCommand = args?.testCommand
const slices = args?.slices ?? []
const ACCEPT = args?.accept ?? 0.90
const MAX_ATTEMPTS = args?.maxAttempts ?? 3

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

// Slices are sequential by construction — slice N builds on slice N-1.
// The parallelism here is inside a slice (the retry loop), not across slices.
for (const s of slices) {
  phase('Red')
  log(`Slice ${s.id} — ${s.name}: writing the contract`)

  const epicDesignDoc = s.epicId ? `${plan}/epic-${s.epicId}-design.md` : `${plan}/03-program-design.md`

  const red = await agent(
    `You are the RED role in a test-driven slice. Write failing tests. Write no implementation.

${scopeContract(s)}
${BLIND}

Read first:
  ${plan}/03-program-design.md   (the test plan section)
  ${epicDesignDoc}               (epic technical solution design)
  ${plan}/04-slices.md

Then:
1. Write tests that define the contract for slice ${s.id} only. Every behavior the
   slice promises needs at least one test.
2. The tests MUST fail, and must fail on assertions — not on import errors,
   missing fixtures, or syntax errors. A test that errors out proves nothing.
3. Run the full suite: ${testCommand}
   Tests from earlier slices must still pass. Only your new tests fail.
4. Do NOT write any implementation code.

Report the test files created, how many new tests fail, whether every failure is
an assertion failure, and the pass count for pre-existing tests.`,
    { label: `red:slice-${s.id}`, phase: 'Red', schema: RED_SCHEMA },
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
      `You are the GREEN role in a test-driven slice. Make the failing tests pass.

${scopeContract(s)}
${BLIND}
Do NOT modify any test file. The tests are the contract. Changing a test changes
the requirement, which is not yours to do.

Read first:
  ${plan}/03-program-design.md
  ${epicDesignDoc}
  the failing test files: ${(red.testFiles || []).join(', ')}
  ${evidence}/slice-${s.id}-feedback.md   — ONLY IF IT EXISTS

${attempt > 1
  ? `This is RETRY ${attempt}. The feedback file exists. Every gap in its
"Actionable guidance" section MUST be addressed in this attempt. Do not repeat a
mistake the feedback already named.`
  : `This is attempt 1. The feedback file will not exist yet.`}

Then:
1. Write the MINIMAL code that makes the failing tests pass. No gold-plating.
2. Run the full suite: ${testCommand}. All new tests pass, nothing previously
   passing breaks.
3. Before reporting, verify:
   - git diff --name-only shows only files in this slice's scope
   - no TODO, FIXME, HACK, or XXX markers in the files you touched
   - no test file appears in your diff

Report files changed, real pass/fail counts, whether any test file appears in
your diff, and how you addressed the prior feedback if this was a retry.`,
      { label: `green:slice-${s.id}:a${attempt}`, phase: 'Green', schema: GREEN_SCHEMA },
    )

    if (!green) {
      last = { verdict: 'ERROR', reason: 'GREEN agent returned nothing', attempt }
      break
    }

    phase('Validate')
    const v = await agent(
      `You are the VALIDATOR. You are an independent auditor. You did not write this
code and you do not trust its author's report.

SCOPE CONTRACT
Score only slice ${s.id} ("${s.name}") against the criteria in its rubric. Do not
penalise the implementation for capabilities belonging to later slices — see the
rubric's "Out of scope" section.

Read:
  ${rubrics}/slice-${s.id}.md          your criteria
  ${rubrics}/manifest.yaml             thresholds
  ${evidence}/slice-${s.id}-feedback.md   (if it exists — prior attempts)

This is attempt ${attempt} of ${MAX_ATTEMPTS}.

Steps:
1. Run the suite YOURSELF: ${testCommand}. Do not rely on any claimed result.
2. Check for a rigged pass. Any of these VOIDS the run — set voided=true and say
   why:
   - a test file changed in this slice's diff
   - a test skipped, xfailed, commented out, or its assertion weakened
   - a test that would also pass against the pre-change code
3. Score each rubric criterion using its own scoring guide: 1.0 fully met,
   0.5 partial or fragile or happy-path-only, 0.0 missing or wrong or failing.
   EVERY score needs cited evidence — a file:line, a test name, or command
   output. A score without evidence is an opinion and does not count.
4. overallScore = the plain average of the criterion scores.
5. Check regressions: tests passing before this slice must still pass.
6. Write your findings to ${evidence}/slice-${s.id}-attempt-${attempt}.md and
   APPEND the same block to ${evidence}/slice-${s.id}-feedback.md, using the
   format in the rubric-authoring reference (## Validation Result header,
   per-criterion results with evidence, regression check, actionable guidance).
7. Verdict:
   PASS       — overallScore >= ${ACCEPT} AND no CRITICAL criterion below 1.0
   FAIL       — otherwise, and ${attempt} < ${MAX_ATTEMPTS}
   ESCALATION — otherwise, and ${attempt} >= ${MAX_ATTEMPTS}
   VOID       — a rigged pass was found in step 2

Guidance is mandatory unless PASS, and must be specific: file paths, function
names, the exact behavior that must change. Vague guidance wastes a retry.`,
      { label: `validate:slice-${s.id}:a${attempt}`, phase: 'Validate', schema: VALIDATE_SCHEMA, effort: 'high' },
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
}
