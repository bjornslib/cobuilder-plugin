#!/usr/bin/env python3
"""
ste-lint.py — heuristic ASD-STE100 rules-level linter.

Base: MIT-licensed ste-lint.py from
https://github.com/woosal1337/blog/tree/main/videos/ep01-the-cure-for-ai-slop
(c) 2026 Ege Celebi.

Merged in on top of that base:
  - a two-tier sentence cap, chosen with --mode strict|flavored
    (strict: 20 words, flavored: 25 words; default flavored)
  - a perfect_tense check ("has landed", "had been")
  - a noun_cluster(>3) check
  - code-span handling that counts a code span as one token instead of
    deleting it (see strip_code() for why this matters)

This is a rules-level heuristic, not a certified ASD-STE100 checker. It
finds the mechanical subset of slop; it does not verify dictionary
compliance or sentence-level meaning. Score is violations per 100 words —
lower is cleaner.

Dependency-free Python 3 standard library only.
"""
import re
import sys
import json
import glob
import os

MARKETING = ["seamless", "seamlessly", "robust", "powerful", "cutting-edge", "effortless", "effortlessly",
    "world-class", "next-generation", "revolutionary", "blazing", "lightning-fast", "elegant", "delightful",
    "turnkey", "best-in-class", "state-of-the-art", "game-changing", "first-class", "battle-tested",
    "enterprise-grade", "supercharge", "unlock", "unleash", "empower", "empowers"]
BANNED = ["begin", "begins", "commence", "commences", "initiate", "initiates", "originate",
    "utilize", "utilizes", "utilizing", "leverage", "leverages", "leveraging", "facilitate", "facilitates",
    "ensure", "ensures", "ensuring", "prior to", "subsequent to", "obtain", "obtains", "acquire", "acquires",
    "demonstrate", "demonstrates", "additionally", "furthermore", "moreover", "comprehensive", "comprehensively",
    "utilization", "aforementioned", "henceforth", "therein", "whilst", "amongst", "numerous", "myriad", "plethora",
    "in order to", "a variety of", "in the event that", "due to the fact that", "it is important to note"]
PHRASAL = ["spin up", "spin down", "reach out", "dive into", "dives into", "diving into", "kick off", "kicks off",
    "roll out", "rolls out", "tear down", "ramp up", "circle back", "drill down", "spun up", "reaching out"]
MODAL_HEDGE = ["it is important to note", "it should be noted", "it is worth noting", "please note that",
    "as mentioned", "as noted above"]
BE = r"(?:am|is|are|was|were|be|been|being)"
PP_IRREG = r"(?:done|made|sent|read|built|kept|held|set|put|run|written|shown|given|taken|found|got|gotten|seen|known|thrown|drawn)"

# Function words a noun cluster does not run through. A run of content
# words this long, uninterrupted by any of these, reads as a stacked noun
# cluster (STE caps a cluster at 3 words before the head noun).
STOP_WORDS = {
    "a", "an", "the", "this", "these", "that", "those", "and", "or", "but", "nor", "of", "to", "in", "on", "for",
    "with", "by", "from", "as", "is", "are", "was", "were", "be", "been", "being", "am", "it", "its", "if", "when",
    "while", "after", "before", "not", "no", "do", "does", "did", "done", "can", "could", "will", "would", "shall",
    "should", "must", "may", "might", "at", "into", "onto", "about", "also", "then", "than", "so", "because",
    "which", "who", "whom", "whose", "you", "your", "we", "our", "i", "they", "their", "he", "she", "his", "her",
    "them", "has", "have", "had", "up", "down", "out", "over", "under", "again", "once", "only", "own", "each",
    "per", "via", "such", "any", "all", "some", "vs", "etc",
}


# Stems that form a real contraction with 's ("it's", "that's"). Any other
# stem before 's ("the script's", "the repo's") is a possessive, which
# ASD-STE100 does not ban. 'd is left alone: unlike 's, it does not collide
# with a correct possessive form, so the unambiguous branch below still
# counts it directly.
_CONTRACTION_S_STEMS = {
    "it", "that", "what", "there", "here", "let", "who", "he", "she", "one",
    "someone", "everyone", "nothing", "something", "everything",
}


def count_contractions(text):
    """
    Count contractions, without counting a possessive 's as one.

    "it's a problem" and "that's wrong" are contractions. "the script's
    output" and "the repo's history" are possessives, correct STE, and must
    not count. Both parse identically to \\w+['\u2019]s, so the stem decides:
    only a stem in _CONTRACTION_S_STEMS forms a real contraction with 's.
    The t/re/ve/ll/m branches stay unambiguous and always count, and so
    does 'd, per the docstring above.
    """
    n = 0
    for m in re.finditer(r"\b(\w+)['\u2019](t|re|ve|ll|d|s|m)\b", text, re.I):
        stem, suf = m.group(1).lower(), m.group(2).lower()
        if suf == "s" and stem not in _CONTRACTION_S_STEMS:
            continue
        n += 1
    return n


def strip_code(t):
    """
    Replace each code span with one opaque placeholder token, instead of
    deleting it the way the upstream linter did.

    Upstream's strip_code() removed code spans entirely. On a code-heavy
    document (this repo's docs and skills are full of `flag` and `path/to`
    spans) that deletes real word count, which shrinks the denominator in
    the per-100-words score and inflates every other rule's rate on text
    that a human would read as clean. Replacing a span with a single
    token keeps the word count honest while still excluding code content
    from every text-pattern rule below (banned words, passive voice, and
    so on do not need to see inside a code span).
    """
    t = re.sub(r"```.*?```", " Xcodeblock ", t, flags=re.S)
    t = re.sub(r"`[^`]*`", " Xcode ", t)
    return t


# A line that opens its own block rather than continuing the one above:
# heading, list item, table row, block quote, or fence.
_BLOCK_START = re.compile(r"^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|\||>|```)")


def reflow(text):
    """Join hard-wrapped continuation lines back into one logical line.

    Both repos wrap markdown at roughly 76 columns. Upstream's sentences()
    splits on "\\n" first, so every physical line became its own sentence.
    That breaks the two length rules in opposite directions, and the
    false-negative direction is the dangerous one:

      - long_sentence UNDER-fires. A 38-word sentence wrapped over three
        lines reads as three sentences of 16 words or fewer, so the cap
        never trips. The linter was blind to long sentences in exactly the
        hard-wrapped files it is meant to check.
      - long_paragraph OVER-fires. A wrapped paragraph of three sentences
        counts one "sentence" per physical line and trips the six-sentence
        cap.

    Headings, list items, table rows, and block quotes stay separate: each
    is its own unit of prose, not a continuation of the line above.
    """
    out = []
    for block in text.split("\n\n"):
        buf = []
        for line in block.split("\n"):
            if not line.strip():
                continue
            if _BLOCK_START.match(line) or not buf:
                buf.append(line.strip())
            else:
                buf[-1] = buf[-1] + " " + line.strip()
        out.append("\n".join(buf))
    return "\n\n".join(out)


def is_prose_block(p):
    """
    True if a "\\n\\n"-delimited block is running prose, not a table, a
    list, a heading, a block quote, or a fenced code block.

    long_paragraph(>6s) counts sentences inside a paragraph. A markdown
    table has no blank line between rows, so re.split(r"\\n\\s*\\n", ...)
    hands the whole table back as one "paragraph", and every row reads as
    a sentence. A table with more than six rows then trips the cap forever
    -- the only "fix" would be breaking the table, which is never correct.
    A list, a heading run, or a block quote can hit the same failure for
    the same reason: no blank lines, several short lines in a row.

    _BLOCK_START already tells a table row, list item, heading, block
    quote, or fence line apart from a prose line (see reflow() above,
    which uses it for the same distinction). A block where most lines open
    with one of those markers is not a prose paragraph, so it is excluded
    here rather than counted against the six-sentence cap.
    """
    lines = [l for l in p.split("\n") if l.strip()]
    if not lines:
        return False
    non_prose = sum(1 for l in lines if _BLOCK_START.match(l))
    return non_prose <= len(lines) / 2


def sentences(text):
    out = []
    for line in reflow(text).split("\n"):
        s = line.strip()
        if not s:
            continue
        s = re.sub(r"^\s*#{1,6}\s*", "", s)
        s = re.sub(r"^\s*(?:[-*+]|\d+[.)])\s+", "", s)
        if not s:
            continue
        # Two additions to upstream's lookahead, both for technical prose:
        #   1. a backtick, so a sentence opening with a code span splits
        #      ("`AgRunner` then makes ...");
        #   2. a bare lowercase identifier -- one containing an internal
        #      underscore, dot, or hyphen -- so "plan_create records the
        #      plan." and "pi-bridge.js adds the name." split too.
        # Without these the sentence merges into the one before it and the
        # pair registers as a single false long_sentence. Measured on a
        # hand-verified STE document, this alone accounted for every
        # long_sentence hit, and the reported longest sentence fell from
        # 57 words to the true 24.
        parts = re.split(
            r"(?<=[.!?:])\s+(?=[A-Z0-9\"'`\-]|[a-z][A-Za-z0-9]*[_.\-][A-Za-z0-9])", s
        )
        for p in parts:
            p = p.strip()
            if p:
                out.append(p)
    return out


def wc(s):
    return len([w for w in re.findall(r"[A-Za-z0-9][A-Za-z0-9'\-/]*", s)])


def count_ci(text, phrases):
    n = 0
    hits = []
    low = text.lower()
    for ph in phrases:
        for _ in re.finditer(r"(?<![a-z])" + re.escape(ph) + r"(?![a-z])", low):
            n += 1
            hits.append(ph)
    return n, hits


def noun_clusters(text, cap=3):
    """
    Count runs of more than `cap` consecutive content words (words not in
    STOP_WORDS) inside a sentence. This is a coarse stand-in for real
    part-of-speech tagging: it flags "user account access control list"
    (a 5-word run) but cannot tell a stacked noun cluster from a run of
    adjectives or a technical proper noun, so treat it as a prompt to
    look, not as ground truth.

    A comma, colon, semicolon, parenthesis, or slash breaks a run the same
    as a stop word does: "docs, READMEs, error messages, release notes" is
    a list of four separate items, not one five-word noun cluster, even
    though no stop word sits between the commas.
    """
    n = 0
    for sent in sentences(text):
        for segment in re.split(r"[,;:()/]", sent):
            tokens = re.findall(r"[A-Za-z][A-Za-z\-]*", segment)
            run = 0
            for tok in tokens:
                low = tok.lower()
                if low in STOP_WORDS or len(tok) < 3:
                    run = 0
                    continue
                run += 1
                if run == cap + 1:
                    n += 1
                # A run longer than cap+1 is still one over-long cluster;
                # only the first crossing of the cap counts, so a long run
                # is not double-billed.
    return n


def lint(text, mode="flavored"):
    if mode not in ("strict", "flavored"):
        raise ValueError(f"unknown mode: {mode!r} (expected 'strict' or 'flavored')")
    cap = 20 if mode == "strict" else 25
    cap_key = f"long_sentence(>{cap}w)"

    raw = text
    text = strip_code(text)
    sents = sentences(text)
    words = sum(wc(s) for s in sents) or 1
    v = {}
    longs = [(wc(s), s) for s in sents if wc(s) > cap]
    v[cap_key] = len(longs)
    v["semicolon"] = text.count(";")
    v["contraction"] = count_contractions(text)
    # Known false-positive class: a predicate adjective reads the same as a
    # passive verb to a regex. "the signal files are compiled views" is an
    # adjective and is correct STE, but it counts here. Separating the two
    # needs part-of-speech tagging, the same limit noun_clusters() documents.
    v["passive_voice"] = len(re.findall(rf"\b{BE}\s+(?:\w+ed|{PP_IRREG})\b", text, re.I))
    v["perfect_tense"] = len(re.findall(rf"\b(?:has|have|had)\s+(?:been\s+)?(?:\w+ed|{PP_IRREG})\b", text, re.I))
    v["ing_main_verb"] = len(re.findall(rf"\b{BE}\s+\w+ing\b", text, re.I))
    v["nominalization"] = len(re.findall(r"\b(?:perform(?:s|ed)?|conduct(?:s|ed)?|provide(?:s|d)?|carry out|carries out|make use of|makes use of)\b", text, re.I)) + len(re.findall(r"\b\w{4,}(?:tion|ment|ance|ence)\s+of\b", text, re.I))
    v["phrasal_verb"], _ = count_ci(text, PHRASAL)
    v["banned_word"], bh = count_ci(text, BANNED)
    v["marketing_adjective"], mh = count_ci(text, MARKETING)
    v["modal_hedge"], _ = count_ci(text, MODAL_HEDGE)
    paras = [p for p in re.split(r"\n\s*\n", raw) if p.strip()]
    prose_paras = [p for p in paras if is_prose_block(p)]
    v["long_paragraph(>6s)"] = sum(1 for p in prose_paras if len(sentences(strip_code(p))) > 6)
    em = raw.count("—") + raw.count("–")

    # noun_cluster is a real STE rule (rule 2.4, max three nouns in a row) but
    # it needs part-of-speech tagging to check honestly. The stdlib heuristic
    # in noun_clusters() cannot separate a stacked noun cluster from a run of
    # adjectives or a technical proper noun, so it over-fires on clean text:
    # on a hand-verified STE document it produced 51 of 54 total hits and
    # drowned out every rule that was actually working. It is reported as an
    # advisory marker next to em_dash, and is deliberately NOT summed into
    # total, so the headline score stays a signal instead of noise.
    clusters = noun_clusters(text)

    total = sum(v.values())
    per100 = {k: round(x * 100.0 / words, 2) for k, x in v.items()}
    return {
        "mode": mode,
        "words": words, "sentences": len(sents),
        "violations": v, "violations_per100w": per100, "total": total,
        "total_per100w": round(total * 100.0 / words, 2),
        "em_dash(slop-marker)": em,
        "noun_cluster(>3, advisory)": clusters,
        "longest_sentence_words": (max(longs)[0] if longs else max((wc(s) for s in sents), default=0)),
        "sample_marketing": list(dict.fromkeys(mh))[:6],
        "sample_banned": list(dict.fromkeys(bh))[:6],
    }


if __name__ == "__main__":
    argv = sys.argv[1:]
    mode = "flavored"
    if "--mode" in argv:
        i = argv.index("--mode")
        mode = argv[i + 1]
        del argv[i:i + 2]
    files = argv
    if not files:
        print(json.dumps(lint(sys.stdin.read(), mode=mode), indent=2))
        sys.exit(0)
    exp = []
    for f in files:
        exp += sorted(glob.glob(f)) if any(c in f for c in "*?[") else [f]
    for f in exp:
        with open(f) as fh:
            r = lint(fh.read(), mode=mode)
        print(f"{os.path.basename(f):32} words={r['words']:4d} total={r['total']:3d} per100w={r['total_per100w']:6.2f} em_dash={r['em_dash(slop-marker)']:2d}")
