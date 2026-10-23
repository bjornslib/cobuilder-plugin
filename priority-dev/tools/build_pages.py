#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["markdown"]
# ///
"""Build the two review pages of priority.dev from the Markdown design files.

Run it from the worktree root: `uv run priority-dev/tools/build_pages.py`.
It reads the frame (head, styles, runtime diagram) from the schemas page that is already there,
and the other diagrams from the older pages. It writes `.lavish/priority-dev-schemas.html`
and `.lavish/priority-dev-spikes.html`.
"""
import re

import markdown

D = "priority-dev/docs/"
L = ".lavish/"
REC = '<span class="rec">Recommended</span>'


def figure_with(text: str, fid: str) -> str:
    for m in re.finditer(r'<figure class="dia".*?</figure>', text, re.S):
        if f'id="{fid}"' in m.group(0):
            return m.group(0)
    raise SystemExit("figure not found: " + fid)


def conv(md: str) -> str:
    h = markdown.markdown(md, extensions=["tables", "fenced_code"])
    h = h.replace("<table>", '<div class="scroll"><table>').replace("</table>", "</table></div>")
    h = re.sub(r"(<tbody>\s*<tr>\s*)<td>", r'\1<td class="k">', h)
    h = re.sub(r"(</tr>\s*<tr>\s*)<td>", r'\1<td class="k">', h)
    return h.replace("<pre><code", '<pre class="code"><code').replace("<ol>", '<ol class="plain">')


def fieldset(i: int, legend: str, opts: list, default: str) -> str:
    o = "".join(f'      <label class="opt"><input type="radio" name="d{i}" value="{v}"><span>{t}{REC if r else ""}</span></label>\n'
                for v, t, r in opts)
    return f'    <fieldset id="f-d{i}"><legend>{i}. {legend}</legend>\n{o}      <p class="default-note">Default: {default}</p>\n    </fieldset>\n'


def decision(sets: str, n: int, foot: str) -> tuple[str, str]:
    html = f'''<section id="decide" class="decide">
  <div class="eyebrow">Decision</div>
  <p class="q">Do these changes match what you want?</p>
  <p class="default-note">If you do not answer a point, the draft uses the default marked under it. Nothing leaves this machine until you say so.</p>
  <form id="decision-form" onsubmit="return false">
{sets}    <fieldset id="f-notes"><legend><label for="notes">Notes</label></legend><textarea id="notes" placeholder="Changes, extra actions, or a reason"></textarea></fieldset>
    <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center; padding-top:12px"><button class="go" id="copy-btn" type="button">Copy my answers</button><span id="copy-status" role="status"></span></div>
    <textarea id="answers-out" readonly aria-label="Your answers, ready to paste into the session"></textarea>
    <p class="default-note" style="padding-top:8px">Paste the copied text into the session.</p>
  </form>
</section>
<footer class="end">{foot}</footer>
</div>
'''
    ids = ",".join(f"'d{i}'" for i in range(n))
    return html, ids


def script(old: str, title: str, ids: str) -> str:
    s = old[old.index("<script>\n(function"):]
    s = re.sub(r"var lines = \['[^']*'\];", f"var lines = ['{title}'];", s)
    return re.sub(r"\[('d\d',?)+\]\.forEach", f"[{ids}].forEach", s)


def section(sid: str, eyebrow: str, title: str, inner: str) -> str:
    return f'<section id="{sid}">\n  <header><div class="eyebrow">{eyebrow}</div><h2>{title}</h2></header>\n{inner}\n</section>\n\n'


def top(eyebrow: str, h1: str, lede: str, chips: str, toc: str) -> str:
    return f'''<div class="wrap">
<header class="top">
  <div class="eyebrow">{eyebrow}</div>
  <h1>{h1}</h1>
  <p class="lede">{lede}</p>
  <div class="chips">{chips}</div>
</header>
<nav class="toc" aria-label="Sections">{toc}</nav>
'''


def adapter_svg(template: str) -> str:
    """A hand-placed diagram of the adapter host, in the style of the runtime diagram."""
    style = re.search(r"<style>.*?</style>", template, re.S).group(0).replace("figrt22", "figah")
    defs = re.search(r"<defs>.*?</defs>", template, re.S).group(0).replace("figrt22", "figah")
    def box(i, x, y, w, h, t, s, cls="nr"):
        return (f'<g id="{i}"><rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="12"/>'
                f'<text class="nt" x="{x + w / 2}" y="{y + h / 2 - 2}" text-anchor="middle">{t}</text>'
                f'<text class="ns" x="{x + w / 2}" y="{y + h / 2 + 13}" text-anchor="middle">{s}</text></g>\n')
    def bound(x, y, w, h, t):
        return f'<rect class="bd" x="{x}" y="{y}" width="{w}" height="{h}" rx="10"/><text class="bt" x="{x + 12}" y="{y + 20}">{t}</text>\n'
    def edge(d, cls="ed"):
        return f'<path class="{cls}" d="{d}"/>\n'
    def label(x, y, t, a="middle"):
        return f'<text class="el" x="{x}" y="{y}" text-anchor="{a}">{t}</text>\n'
    b = bound(10, 20, 860, 470, "your Mac") + bound(30, 50, 200, 420, "tmux pane") + bound(260, 50, 590, 420, "adapter host (launchd, one process)")
    b += bound(900, 50, 290, 420, "service (Docker)")
    n = box("n-cc", 50, 90, 160, 60, "Claude Code", "hooks fire here") + box("n-tr", 50, 250, 160, 50, "Transcript file", "~/.claude/projects/*.jsonl")
    n += box("n-pane", 50, 390, 160, 50, "tmux pane", "paste and send-keys")
    n += box("n-hook", 280, 90, 150, 60, "priority-hook", "command hook") + box("n-sock", 470, 90, 150, 60, "Socket server", "~/.priority/hook.sock")
    n += box("n-spool", 660, 90, 170, 60, "Spool", "JSONL, at least once")
    n += box("n-tail", 470, 250, 150, 50, "Tailer", "watchfiles, byte offsets") + box("n-pull", 660, 250, 170, 50, "Puller", "long poll, checks the HMAC")
    n += box("n-tmux", 470, 390, 150, 50, "tmux module", "the only code that calls tmux")
    n += box("n-log", 920, 90, 250, 60, "Event log", "POST /events") + box("n-ctl", 920, 250, 250, 60, "Control process", "policy, actuator, signing key")
    e = edge("M210,120 H280", "ed2") + label(245, 112, "hook JSON,") + label(245, 138, "verdict")
    e += edge("M430,120 H470", "ed2") + label(450, 112, "event")
    e += edge("M620,120 H660") + edge("M830,120 H920") + label(875, 112, "POST")
    e += edge("M210,275 H470") + label(340, 267, "new records")
    e += edge("M545,250 V200 H745 V150") + label(640, 193, "records")
    e += edge("M920,280 H830") + label(875, 272, "signed command")
    e += edge("M745,300 V345 H545 V390") + label(645, 338, "if the checks pass")
    e += edge("M470,415 H210") + label(340, 407, "paste or keys")
    e += edge("M1045,150 V250") + label(1053, 205, "events in, commands out", "start")
    svg = (f'<svg id="figah" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 510" role="img" aria-labelledby="ah-t ah-d">'
           f'<title id="ah-t">priority.dev adapter host</title><desc id="ah-d">Hooks and the transcript feed the host. The host spools events to the event log. Signed commands come back and reach the session by a hook answer or by tmux.</desc>\n'
           f'{style}\n{defs}\n{b}{n}{e}</svg>')
    cap = ("The adapter host. A hook gives the host an event and can wait for a verdict (channel H). A signed command from the control process "
           "reaches the pane through the tmux module (channel T). The host holds no model key and no signing key.")
    return f'<figure class="dia" style="--min: 1000px"><div class="dia-scroll">{svg}</div><figcaption>{cap}</figcaption></figure>'


def main() -> None:
    old = open(L + "priority-dev-schemas.html").read()
    head = old[: old.index('<div class="wrap">')]
    rt = figure_with(old, "figrt22")
    for a, b in [("Jev, then LM advisor", "triage, advise, digest"), ("Interpreter: Jev, then LM advisor", "Interpreter: triage, advise, digest (language models)"),
                 ("System-1 decisions, first", "System-1 decisions, later"), ("advisor, forwarded cases", "Nemo and Inkling"),
                 ("Language model: Nemo and Inkling", "Language model: Nemo and Inkling via OpenRouter"), ("version 2.2 (proposal)", "version 2.3 (proposal)")]:
        rt = rt.replace(a, b)
    lvl = figure_with(open(L + "priority-dev-v0-1-scope.html").read(), "l1light")
    loop = figure_with(open(L + "priority-dev-components.html").read(), "figloop2")
    ah = adapter_svg(rt)

    # ---- page 1: the interpreter schemas
    md = open(D + "design/schemas.md").read()
    intro, *secs = re.split(r"^## ", md, flags=re.M)
    meta = {1: ("stages", "Pipeline"), 2: ("input", "In"), 3: ("facts", "Out"), 4: ("actions", "Out"), 5: ("flow", "Flow"), 6: ("priority", "Ranking"),
            7: ("notify", "Delivery"), 8: ("store", "Learning"), 9: ("abstain", "Failure"), 10: ("checks", "Gaps"), 11: ("examples", "Data")}
    lbl = dict(zip(range(1, 12), "Stages Input Facts Actions Flow Priority Notify Learning Abstain Checks Examples".split()))
    note = '<p class="default-note">{}</p>'
    dia = (section("diagrams", "Pictures", "The diagrams",
                   "<h3>Logical flow (level 1, version 2.1)</h3>" + lvl + note.format("This drawing is still version 2.1. It does not show the Digest call or the evidence check. Redrawing it is a next step.")
                   + "<h3>Roles and the action loop</h3>" + loop + "<h3>Runtime architecture (level 4, version 2.3)</h3>" + rt))
    body, nav = dia, ['<a href="#diagrams">Diagrams</a>']
    for s in secs:
        title, rest = s.split("\n", 1)
        n = int(re.match(r"(\d+)\.", title).group(1))
        sid, eb = meta[n]
        nav.append(f'<a href="#{sid}">{lbl[n]}</a>')
        inner = conv(rest)
        if n == 1:
            inner = conv(re.sub(r"^# .*\n", "", intro)) + inner
        body += section(sid, eb, title.split(". ", 1)[1], inner)
    sets = fieldset(0, "How `continue_until` runs", [
        ("B: send /goal", "B. Send the built-in <code>/goal</code> command. Our check runs after the goal clears", True),
        ("A: our own loop", "A. Keep our own loop that sends <code>continue</code> after each stop", False)],
        "B. Section 4.1 has the table. Nothing is built until you answer.")
    html, ids = decision(sets, 1, "Source of record: <code>priority-dev/docs/design/schemas.md</code> and <code>schemas/interpreter_schemas.py</code>.")
    chips = '<span class="chip warn">Draft for decision</span><span class="chip">Round 10: no Jev in the spikes, Digest always runs</span><span class="chip">Diagrams restored</span><span class="chip">24 October 2026</span>'
    page = head + top("CoBuilder · architect:design · round 10", "priority.dev interpreter schemas", "What the interpreter receives, what it produces, and every action it may propose.",
                      chips, "".join(nav) + '<a href="#decide">Decision</a>') + body + html + script(old, "priority.dev interpreter schemas, round 10: my answers", ids)
    open(L + "priority-dev-schemas.html", "w").write(page)

    # ---- page 2: the first spikes
    def doc(name: str) -> str:
        t = open(D + name).read()
        t = re.sub(r"^# .*\n", "", t)
        return conv(t.replace("\n## ", "\n### "))
    plan = open(D + "plans/priority-dev-spikes/04-slices.md").read()
    plan = re.sub(r"^# .*\n", "", plan).replace("\n## ", "\n### ")
    sp = section("plan", "Plan", "The slice plan, in the form of /implement:start", conv(plan))
    sp += section("host", "Design", "The adapter host", doc("design/adapter-host.md").replace("<h3>1. Job</h3>", ah + "<h3>1. Job</h3>"))
    sp += section("dspy", "Design", "The DSPy modules", doc("design/dspy-modules.md"))
    sets = (fieldset(0, "Where the spike code and its tracker live", [
        ("new repo", "A new repository for priority.dev, with its own tracker. This repository stays the plugin only", True),
        ("this branch", "A <code>priority-dev/</code> folder on this branch, using this repository's tracker", False)],
        "nothing is created. I keep designing on this branch.")
        + fieldset(1, "The transcripts that become test fixtures", [
            ("real and local", "Real transcripts, redacted, kept local and ignored by Git. Small made-up fixtures go in the repository", True),
            ("made-up only", "Made-up fixtures only. The replay then says little about real runs", False)],
            "the first. No transcript is copied until you answer.")
        + fieldset(2, "The slices to build first", [
            ("1 to 4", "Slices 1 to 4: the interpreter on recorded transcripts", True),
            ("1 to 6", "Slices 1 to 6: add the event log", False),
            ("all", "All twelve slices", False)],
            "slices 1 to 4.")
        + fieldset(3, "Run the /implement:start gates for epic E1", [
            ("after 0 to 2", "Yes, after you answer the three points above", True),
            ("not yet", "Not yet. Keep designing first", False)],
            "not yet."))
    html, ids = decision(sets, 4, "Source of record: <code>priority-dev/docs/design/adapter-host.md</code>, <code>dspy-modules.md</code>, and <code>plans/priority-dev-spikes/04-slices.md</code>.")
    chips = '<span class="chip warn">Draft for decision</span><span class="chip">Nothing built</span><span class="chip">No model call made</span><span class="chip">24 October 2026</span>'
    page = head + top("CoBuilder · architect:design · round 10", "priority.dev first spikes", "A plan for three spikes: the interpreter, the event log, and the session adapter.", chips,
                      '<a href="#plan">Plan</a><a href="#host">Adapter host</a><a href="#dspy">DSPy modules</a><a href="#decide">Decision</a>') + sp + html \
        + script(old, "priority.dev first spikes, round 10: my answers", ids)
    page = page.replace("<title>priority.dev interpreter schemas</title>", "<title>priority.dev first spikes</title>")
    open(L + "priority-dev-spikes.html", "w").write(page)
    print("ok", len(page))


if __name__ == "__main__":
    main()
