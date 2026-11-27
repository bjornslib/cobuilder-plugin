"""RED, slice 29 (epic E8): the structural diff and the reference in the GEPA feedback.

The pinned contract.

1. `priority.structure_diff.structure_diff(reference, prediction) -> list[str]` compares typed
   values only. It writes these lines, in this order:

   - `status: <reference> -> <prediction>`
   - `needs_human: <yes|no> -> <yes|no>`
   - `priority: <reference> -> <prediction>`
   - one group per step, in step order, positions counted from 1:
     * the kind: `step <n>: missing <kind>` when the reference holds a step that the output does
       not, `step <n>: extra <kind>` when the output holds a step that the reference does not, and
       `step <n>: <reference kind> -> <prediction kind>` when both hold a step of a different kind.
       A step whose kinds differ gets the kind line alone.
     * for `ask_human`: `step <n> ask_human role: <a> -> <b>`, then
       `step <n> ask_human questions: <count> -> <count>`, then, for each question up to the
       shorter of the two question lists and counted from 1:
       `... question <q> options: <count> -> <count>`,
       `... question <q> multi_select: <yes|no> -> <yes|no>`,
       `... question <q> free_text: <yes|no> -> <yes|no>`,
       `... question <q> recommendation: <yes|no> -> <yes|no>` (`yes` when
       `agent_recommendation` names one option label of that side),
       `... question <q> helps: <kinds> -> <kinds>` (the help kinds in order, joined by `, `,
       `none` when the list is empty), and `... question <q> ask filled: <yes|no> -> <yes|no>`.
     * for `continue_until`: `step <n> continue_until proof kind: <a> -> <b>`.
     * for `approve_permission`: `step <n> approve_permission scope: <a> -> <b>`.
     * the required text fields: `step <n> <kind> <field> filled: <yes|no> -> <yes|no>`, in the
       order of `REQUIRED_TEXT` below. A side reads `yes` when its text holds a non-blank
       character, and `no` in every other case. The required text fields are `reply.text`,
       `continue_until.goal`, `approve_gate.gate`, `send_feedback.notes`, `notify.excerpt`,
       `dismiss.reason`, and `review.artifact`.
   - Only a difference becomes a line. `None` and an absent field read `none`. A boolean reads
     `yes` or `no`. No payload text, no option label, no help value, and no excerpt ever appears
     in a line: the diff holds fixed schema values, counts, and yes or no only.
   - `["structure: matches"]` when nothing differs, and `["no output: the reply did not parse"]`
     for a prediction that abstained (any reason), with no other line.
   - A step, a question, and a help may be a dict or an object with the same fields. Read them with
     `priority.evaluation.payload_rules.get_field`.

2. The `Reference:` block of the v2 feedback holds the reference `status`, `needs_human`,
   `priority`, and steps as one JSON object.

3. `gepa_feedback` keeps the E7 feedback. Only a run that chose the v2 proposer adds the two
   blocks: then the feedback holds `Score: X.XX of 1.00.`, the judge notes, `Structure:` with the
   diff lines, and `Reference:` with the reference JSON, in that order, and each header stands on
   its own line. The score value does not change between the arms. `plain_score` does not change.

The fixtures are made up, and they hold no real session text. Every model and judge here is a stub,
so no test makes a live model call.
"""
from __future__ import annotations

import contextlib
import copy
import io
import itertools
import json

import pytest

from eval_support import write_eval_world
from fixtures_support import require
from interpret_support import DummyLM, dspy, propose, step
from judge_ref_support import install_judge

NOTE = "payload: the made-up parts match."
GOOD_SCORE = 0.8
BRIEF_TEXT = "The made-up brief."

TWO_OPTIONS = ("Zephyr-Quilt", "Marigold-Press")
THREE_OPTIONS = ("Zephyr-Quilt", "Marigold-Press", "Copper-Kite")


# ---- the pinned line grammar -------------------------------------------------


def option(label: str, detail: str = "") -> dict:
    """One made-up option."""
    return {"label": label, "detail": detail}


def help_button(kind: str, label: str, value: str) -> dict:
    """One made-up help button."""
    return {"kind": kind, "label": label, "value": value}


def question(ask: str = "Which made-up token fits?", options=TWO_OPTIONS, multi_select: bool = False,
             free_text: bool = True, agent_recommendation: str | None = None, helps: tuple = ()) -> dict:
    """One made-up question of a `decide` step."""
    return {"ask": ask, "options": [option(label) for label in options], "multi_select": multi_select,
            "free_text": free_text, "agent_recommendation": agent_recommendation, "helps": list(helps)}


def ask_payload(role: str = "decide", questions: list | None = None,
                why: str = "Only the human can pick the token.") -> dict:
    """One made-up ask_human step."""
    return {"kind": "ask_human", "detail": {"role": role, "questions": list(questions or [Q_DEFAULT])},
            "why_escalated": why}


def reply_payload(text: str = "Made-up reply text.") -> dict:
    """One made-up reply step."""
    return {"kind": "reply", "text": text}


def notify_payload(excerpt: str = "Made-up notice.") -> dict:
    """One made-up notify step."""
    return {"kind": "notify", "excerpt": excerpt}


def snooze_payload() -> dict:
    """One made-up snooze step."""
    return {"kind": "snooze", "until": None, "until_event": "turn_end"}


def approve_payload(scope: str = "once") -> dict:
    """One made-up approve_permission step."""
    return {"kind": "approve_permission", "scope": scope}


def gate_payload(gate: str = "Made-up gate.") -> dict:
    """One made-up approve_gate step."""
    return {"kind": "approve_gate", "gate": gate, "notes": ""}


def continue_payload(proof_kind: str | None = "agent_shows", goal: str = "Made-up proof goal.") -> dict:
    """One made-up continue_until step. `None` leaves out the proof, as a fault does."""
    payload = {"kind": "continue_until", "goal": goal, "max_turns": 3, "max_minutes": 10}
    if proof_kind is not None:
        payload["proof"] = {"kind": proof_kind, "command": None, "show": ""}
    return payload


def reference(**changes) -> dict:
    """One made-up reference object. The keyword arguments replace whole fields."""
    base = {"status": "waiting_answer", "needs_human": True, "priority": "P2", "steps": [reply_payload()]}
    base.update(changes)
    return base


def output(**changes) -> dict:
    """One made-up program output with the same typed fields as the reference."""
    return reference(**changes)


Q_DEFAULT = question()
Q_MULTI = question(multi_select=True)
Q_FREE_OFF = question(free_text=False)
Q_RECOMMENDED = question(agent_recommendation="Zephyr-Quilt")
Q_RECOMMENDED_OTHER = question(agent_recommendation="Marigold-Press")
Q_RECOMMENDED_BAD = question(agent_recommendation="Copper-Kite")
Q_TWO_HELPS = question(helps=(help_button("copy_command", "Copy the made-up command", "make-token --now"),
                             help_button("open_file", "Open the made-up file", "shed_plan.md")))
Q_ONE_HELP = question(helps=(help_button("copy_command", "Copy the made-up command", "make-token --now"),))
Q_OTHER_HELP = question(helps=(help_button("explain", "Explain the made-up step", "why"),))
Q_EMPTY_ASK = question(ask="")

ASK_DECIDE = ask_payload(role="decide", questions=[Q_DEFAULT])
ASK_DO = ask_payload(role="do", questions=[Q_DEFAULT])

STEP_CASES = (
    pytest.param(reference(), output(), ["structure: matches"], id="matches"),
    pytest.param(reference(), output(status="blocked"), ["status: waiting_answer -> blocked"], id="status"),
    pytest.param(reference(), output(needs_human=False), ["needs_human: yes -> no"], id="needs-human"),
    pytest.param(reference(), output(priority="P1"), ["priority: P2 -> P1"], id="priority"),
    pytest.param(
        reference(status="waiting_answer", needs_human=True, priority="P2",
                  steps=[reply_payload(), notify_payload()]),
        output(status="blocked", needs_human=False, priority="P3",
               steps=[reply_payload(), snooze_payload()]),
        ["status: waiting_answer -> blocked", "needs_human: yes -> no", "priority: P2 -> P3",
         "step 2: notify -> snooze"],
        id="status-needs-human-priority-and-step"),
    pytest.param(reference(steps=[reply_payload("Made-up reply one.")]),
                 output(steps=[reply_payload("Made-up reply two.")]),
                 ["structure: matches"], id="reply-text-differs"),
    pytest.param(reference(steps=[ask_payload(questions=[question(options=TWO_OPTIONS)])]),
                 output(steps=[ask_payload(questions=[question(options=("Basalt-Loom", "Copper-Kite"))])]),
                 ["structure: matches"], id="option-labels-differ"),
    pytest.param(reference(steps=[reply_payload(), notify_payload()]), output(steps=[reply_payload()]),
                 ["step 2: missing notify"], id="step-missing"),
    pytest.param(reference(steps=[reply_payload()]), output(steps=[reply_payload(), snooze_payload()]),
                 ["step 2: extra snooze"], id="step-extra"),
    pytest.param(reference(steps=[reply_payload(), gate_payload()]),
                 output(steps=[reply_payload(), snooze_payload()]),
                 ["step 2: approve_gate -> snooze"], id="step-kind"),
    pytest.param(reference(steps=[ASK_DECIDE]), output(steps=[ASK_DO]),
                 ["step 1 ask_human role: decide -> do"], id="ask-role"),
    pytest.param(
        reference(steps=[ask_payload(questions=[Q_DEFAULT, question(ask="Made-up second question?")])]),
        output(steps=[ask_payload(questions=[Q_DEFAULT])]),
        ["step 1 ask_human questions: 2 -> 1"], id="ask-question-count"),
    pytest.param(reference(steps=[ask_payload(questions=[question(options=THREE_OPTIONS)])]),
                 output(steps=[ask_payload(questions=[question(options=TWO_OPTIONS)])]),
                 ["step 1 ask_human question 1 options: 3 -> 2"], id="ask-option-count"),
    pytest.param(
        reference(steps=[ask_payload(role="decide", questions=[question(options=THREE_OPTIONS)])]),
        output(steps=[ask_payload(role="do", questions=[question(options=TWO_OPTIONS)])]),
        ["step 1 ask_human role: decide -> do", "step 1 ask_human question 1 options: 3 -> 2"],
        id="ask-role-and-option-count"),
    pytest.param(reference(steps=[ask_payload(questions=[Q_MULTI])]),
                 output(steps=[ask_payload(questions=[Q_DEFAULT])]),
                 ["step 1 ask_human question 1 multi_select: yes -> no"], id="ask-multi-select"),
    pytest.param(reference(steps=[ask_payload(questions=[Q_DEFAULT])]),
                 output(steps=[ask_payload(questions=[Q_FREE_OFF])]),
                 ["step 1 ask_human question 1 free_text: yes -> no"], id="ask-free-text"),
    pytest.param(reference(steps=[ask_payload(questions=[Q_RECOMMENDED])]),
                 output(steps=[ask_payload(questions=[Q_DEFAULT])]),
                 ["step 1 ask_human question 1 recommendation: yes -> no"], id="ask-recommendation-missing"),
    pytest.param(reference(steps=[ask_payload(questions=[Q_RECOMMENDED])]),
                 output(steps=[ask_payload(questions=[Q_RECOMMENDED_BAD])]),
                 ["step 1 ask_human question 1 recommendation: yes -> no"], id="ask-recommendation-invalid"),
    pytest.param(reference(steps=[ask_payload(questions=[Q_RECOMMENDED])]),
                 output(steps=[ask_payload(questions=[Q_RECOMMENDED_OTHER])]),
                 ["structure: matches"], id="ask-recommendation-both-valid"),
    pytest.param(reference(steps=[ask_payload(questions=[Q_TWO_HELPS])]),
                 output(steps=[ask_payload(questions=[Q_OTHER_HELP])]),
                 ["step 1 ask_human question 1 helps: copy_command, open_file -> explain"], id="ask-helps"),
    pytest.param(reference(steps=[ask_payload(questions=[Q_ONE_HELP])]),
                 output(steps=[ask_payload(questions=[Q_DEFAULT])]),
                 ["step 1 ask_human question 1 helps: copy_command -> none"], id="ask-helps-empty"),
    pytest.param(reference(steps=[ask_payload(questions=[Q_DEFAULT])]),
                 output(steps=[ask_payload(questions=[Q_EMPTY_ASK])]),
                 ["step 1 ask_human question 1 ask filled: yes -> no"], id="ask-empty"),
    pytest.param(reference(steps=[continue_payload("agent_shows")]),
                 output(steps=[continue_payload("human_confirms")]),
                 ["step 1 continue_until proof kind: agent_shows -> human_confirms"],
                 id="continue-proof-kind"),
    pytest.param(reference(steps=[continue_payload("agent_shows")]),
                 output(steps=[continue_payload(None)]),
                 ["step 1 continue_until proof kind: agent_shows -> none"], id="continue-proof-absent"),
    pytest.param(reference(steps=[approve_payload("once")]), output(steps=[approve_payload("session")]),
                 ["step 1 approve_permission scope: once -> session"], id="approve-scope"),
    pytest.param(reference(steps=[reply_payload("Made-up reply text.")]),
                 output(steps=[reply_payload("")]),
                 ["step 1 reply text filled: yes -> no"], id="reply-text-empty"),
    pytest.param(reference(steps=[notify_payload()]), output(steps=[notify_payload("")]),
                 ["step 1 notify excerpt filled: yes -> no"], id="notify-excerpt-empty"),
    pytest.param(reference(), {"abstain": {"reason": "invalid_output", "detail": "Made-up parse fault.",
                                           "raw": "Made-up raw reply."}},
                 ["no output: the reply did not parse"], id="no-output"),
)

STEP_IDS = [case.id for case in STEP_CASES]


# ---- contract 1: the line list of each made-up pair ---------------------------


@pytest.mark.parametrize("reference,output,expected", STEP_CASES, ids=STEP_IDS)
def test_structure_diff_writes_the_expected_lines(reference, output, expected):
    diff = require("priority.structure_diff").structure_diff(copy.deepcopy(reference), copy.deepcopy(output))
    assert list(diff) == expected, f"structure_diff gave {list(diff)!r}, not {expected!r}"


def test_structure_diff_reads_a_prediction_object_by_attribute():
    prediction = dspy.Prediction(status="blocked", needs_human=True, priority="P2",
                                 steps=[reply_payload()], abstain=None)
    diff = require("priority.structure_diff").structure_diff(reference(), prediction)
    assert list(diff) == ["status: waiting_answer -> blocked"], f"structure_diff gave {list(diff)!r}"


def test_structure_diff_reads_an_abstain_object_and_writes_no_other_line():
    abstain = require("priority.interpreter.models").Abstain(reason="invalid_output",
                                                            detail="Made-up parse fault.")
    prediction = dspy.Prediction(status=None, needs_human=None, priority=None, steps=[], abstain=abstain)
    diff = require("priority.structure_diff").structure_diff(reference(), prediction)
    assert list(diff) == ["no output: the reply did not parse"], f"structure_diff gave {list(diff)!r}"


# ---- contract 2: the diff holds structure only --------------------------------

LEAK_TOKENS = ("Made-up reply text.", "Made-up notice.", "Which made-up token fits?",
               "Zephyr-Quilt", "Marigold-Press", "Copy the made-up command", "make-token --now",
               "Open the made-up file", "shed_plan.md", "Only the human can pick the token.",
               "Made-up proof goal.", "Made-up gate.")


def leaky_reference() -> dict:
    """One reference whose every text field holds a distinctive made-up token."""
    return reference(steps=[
        reply_payload("Made-up reply text."),
        ask_payload(role="decide", why="Only the human can pick the token.",
                    questions=[question(ask="Which made-up token fits?", helps=(
                        help_button("copy_command", "Copy the made-up command", "make-token --now"),
                        help_button("open_file", "Open the made-up file", "shed_plan.md")))]),
        notify_payload("Made-up notice."),
        continue_payload("agent_shows", goal="Made-up proof goal."),
        gate_payload("Made-up gate."),
    ])


def leaky_output() -> dict:
    """One output of the same typed shape, but with other counts, flags, and kinds."""
    return reference(steps=[
        reply_payload("Made-up reply text."),
        ask_payload(role="do", why="", questions=[question(options=("Zephyr-Quilt",), helps=())]),
        notify_payload("Made-up notice."),
        continue_payload("agent_shows", goal="Made-up proof goal."),
        gate_payload("Made-up gate."),
    ])


def test_the_diff_holds_no_text_value_of_a_reference_payload():
    lines = list(require("priority.structure_diff").structure_diff(leaky_reference(), leaky_output()))
    assert lines and lines != ["structure: matches"], f"the line list is {lines!r}, so the check is empty"
    text = "\n".join(lines)
    leaked = sorted(token for token in LEAK_TOKENS if token in text)
    assert not leaked, f"the diff holds reference payload text {leaked}: {lines!r}"


def test_the_diff_reports_the_typed_difference_of_the_same_pair():
    lines = list(require("priority.structure_diff").structure_diff(leaky_reference(), leaky_output()))
    assert "step 2 ask_human role: decide -> do" in lines, \
        f"the diff holds no role line, only {lines!r}"
    assert "step 2 ask_human questions: 1 -> 1" not in lines, \
        f"the diff reports an equal count as a difference: {lines!r}"


# ---- contract 3: the reference and the diff in the feedback -------------------


def stub_gepa(monkeypatch) -> list:
    """Replace GEPA with a class that records its settings and returns the student. Return the records."""
    import dspy.teleprompt as teleprompt

    calls: list = []

    class StubGEPA:
        def __init__(self, **settings):
            calls.append(settings)

        def compile(self, student, trainset=None, valset=None):
            return student

    monkeypatch.setattr(teleprompt, "GEPA", StubGEPA)
    return calls


def run_arm(monkeypatch, work, extra_args=(), log_dir: str = "made-up-log") -> tuple:
    """Run `priority optimise --optimiser gepa` on stub models. Return the GEPA metric and the print."""
    optimise = require("priority.optimise")
    manifest, labels, real_dir, _ = write_eval_world(work, payloads=[reply_payload()])
    task_lm = DummyLM(itertools.cycle([propose([step("reply")])]))
    monkeypatch.setattr(require("priority.interpreter"), "interpreter_lm", lambda retries=0: task_lm)
    monkeypatch.setattr(optimise, "_reflection_lm", lambda: None)
    built = stub_gepa(monkeypatch)
    monkeypatch.chdir(work)
    argv = ["optimise", "--optimiser", "gepa", "--manifest", str(manifest), "--labels", str(labels),
            "--real-dir", str(real_dir), "--budget", "2", "--seed", "7", "--threads", "1",
            "--minibatch", "3", "--gepa-log-dir", log_dir, *extra_args]
    out, code, raised = io.StringIO(), None, None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            code = require("priority.cli").main(argv)
        except SystemExit as exit_:  # argparse exits on an unknown flag
            code = exit_.code
        except Exception as error:  # noqa: BLE001 (the test reports what escaped `main`)
            raised = error
    assert raised is None, f"optimise raised {raised!r}"
    assert code == 0, f"optimise exited {code}: {out.getvalue()[-400:]!r}"
    assert built, "the stub GEPA class was never built, so the run skipped the compile"
    metric = built[0].get("metric")
    assert callable(metric), f"the GEPA settings hold no metric, only {sorted(built[0])}"
    return metric, out.getvalue()


@pytest.fixture(scope="module")
def arms(tmp_path_factory):
    """The GEPA metric of each proposer arm, from one stub run per arm."""
    mp = pytest.MonkeyPatch()
    install_judge(mp, lambda brief, predicted, expected: (GOOD_SCORE, [NOTE]))
    base = tmp_path_factory.mktemp("arms")
    built: dict = {}
    for name, extra in (("v1", ("--proposer", "v1")), ("v2", ("--proposer", "v2")), ("default", ())):
        work = base / name
        work.mkdir()
        built[name] = run_arm(mp, work, extra, log_dir=f"made-up-{name}-log")
    yield built
    mp.undo()


def metric_example() -> dict:
    """One made-up labelled stop with one reply payload."""
    return {"session_id": "made-up-session", "stop": "001", "brief_text": BRIEF_TEXT,
            "status": "waiting_answer", "needs_human": True, "priority": "P2",
            "expected_payloads": [reply_payload()]}


def metric_output(**changes) -> dict:
    """One made-up program output. The priority differs, so the diff holds one line."""
    base = {"status": "waiting_answer", "needs_human": True, "priority": "P3",
            "steps": [reply_payload()], "abstain": None}
    base.update(changes)
    return base


def blocks_of(feedback: str) -> tuple:
    """The `Structure:` body and the `Reference:` body of one v2 feedback."""
    assert "Structure:" in feedback, f"the feedback holds no Structure: block: {feedback!r}"
    assert "Reference:" in feedback, f"the feedback holds no Reference: block: {feedback!r}"
    structure, reference = feedback.split("Structure:", 1)[1].split("Reference:", 1)
    return structure.strip(), reference.strip()


def test_the_v2_feedback_holds_the_score_the_notes_the_structure_and_the_reference_in_order(arms):
    metric, _ = arms["v2"]
    result = metric(metric_example(), metric_output())
    prefix = f"Score: {GOOD_SCORE:.2f} of 1.00. {NOTE}"
    feedback = result.feedback
    assert feedback.startswith(prefix), f"the feedback is {feedback!r}, not the score line and the notes"
    assert float(result.score) == pytest.approx(GOOD_SCORE), f"the score is {result.score!r}"
    structure, body = blocks_of(feedback)
    assert feedback.index("Structure:") >= len(prefix), f"Structure: precedes the notes: {feedback!r}"
    assert feedback.index("Reference:") > feedback.index("Structure:"), \
        f"Reference: precedes Structure:: {feedback!r}"
    lines = [line for line in structure.splitlines() if line.strip()]
    assert lines == ["priority: P2 -> P3"], f"the Structure: block holds {lines!r}"
    assert "Made-up reply text." not in structure, f"the Structure: block holds payload text: {structure!r}"
    try:
        parsed = json.loads(body)
    except ValueError as error:
        raise AssertionError(f"the Reference: block is not JSON ({error}): {body!r}") from error
    assert parsed.get("status") == "waiting_answer", f"the reference states {parsed.get('status')!r}"
    assert parsed.get("needs_human") is True, f"the reference states {parsed.get('needs_human')!r}"
    assert parsed.get("priority") == "P2", f"the reference states {parsed.get('priority')!r}"
    assert parsed.get("steps", parsed.get("payloads")) == [reply_payload()], \
        f"the reference holds {parsed!r}, not the reference payloads"


def test_the_v1_feedback_keeps_the_e7_feedback(arms):
    metric, _ = arms["v1"]
    result = metric(metric_example(), metric_output())
    assert result.feedback == f"Score: {GOOD_SCORE:.2f} of 1.00. {NOTE}", \
        f"the v1 feedback is {result.feedback!r}, not the E7 feedback"


def test_the_default_run_uses_the_v2_feedback(arms):
    example, prediction = metric_example(), metric_output()
    default = arms["default"][0](example, prediction).feedback
    assert "Structure:" in default and "Reference:" in default, \
        f"the default run holds no v2 block: {default!r}"
    assert default == arms["v2"][0](example, prediction).feedback, \
        "the default run does not give the v2 feedback"


def test_the_score_value_does_not_change_between_the_arms(arms):
    example, prediction = metric_example(), metric_output()
    scores = {name: float(arms[name][0](example, prediction).score) for name in ("v1", "v2", "default")}
    assert scores["v1"] == pytest.approx(GOOD_SCORE), f"the v1 score is {scores['v1']!r}"
    assert scores["v2"] == pytest.approx(scores["v1"]), f"the scores are {scores!r}"


def test_the_v2_feedback_of_a_stop_that_did_not_parse_holds_the_no_output_line(arms):
    metric, _ = arms["v2"]
    result = metric(metric_example(), metric_output(status=None, needs_human=None, priority=None, steps=[],
                                                   abstain={"reason": "invalid_output",
                                                            "detail": "Made-up parse fault.",
                                                            "raw": "Made-up raw reply."}))
    structure, body = blocks_of(result.feedback)
    lines = [line for line in structure.splitlines() if line.strip()]
    assert lines == ["no output: the reply did not parse"], f"the Structure: block holds {lines!r}"
    assert "Made-up parse fault." not in result.feedback and "Made-up raw reply." not in result.feedback, \
        f"the feedback holds the raw reply or the fault text: {result.feedback!r}"
    assert json.loads(body).get("priority") == "P2", f"the Reference: block is {body!r}"


def test_the_plain_gepa_feedback_call_keeps_the_e7_feedback(monkeypatch):
    install_judge(monkeypatch, lambda brief, predicted, expected: (GOOD_SCORE, [NOTE]))
    result = require("priority.optimise").gepa_feedback(metric_example(), metric_output())
    assert result.feedback == f"Score: {GOOD_SCORE:.2f} of 1.00. {NOTE}", \
        f"the direct feedback is {result.feedback!r}, not the E7 feedback"


def test_plain_score_is_unchanged(monkeypatch):
    install_judge(monkeypatch, lambda brief, predicted, expected: (GOOD_SCORE, [NOTE]))
    plain_score = require("priority.optimise").plain_score
    assert plain_score(metric_example(), metric_output()) == pytest.approx(GOOD_SCORE), \
        "plain_score changed its value"
    assert plain_score(metric_example(), metric_output(), None, "propose", None) == pytest.approx(GOOD_SCORE), \
        "plain_score does not ignore the GEPA arguments"
