#!/usr/bin/env python3
"""
Tests for ste-lint.py, the ASD-STE100 rules-level linter.

Run with:
  python3 -m pytest .claude/skills/ste-writing/test_ste_lint.py -v
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import importlib.util

spec = importlib.util.spec_from_file_location("ste_lint", SCRIPT_DIR / "ste-lint.py")
assert spec is not None and spec.loader is not None, "cannot load ste-lint.py"
ste_lint = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ste_lint)

lint = ste_lint.lint
strip_code = ste_lint.strip_code
noun_clusters = ste_lint.noun_clusters
wc = ste_lint.wc
sentences_of = ste_lint.sentences
reflow = ste_lint.reflow
sentences = ste_lint.sentences


# ---------------------------------------------------------------------------
# 1. Sentence cap - two tiers
# ---------------------------------------------------------------------------

class TestSentenceCap:
    """The sentence-length cap is two-tiered: 20 words strict, 25 flavored."""

    def _sentence(self, n):
        # "The parser reads" (3) + filler words + "today" (1) = n words total.
        return "The parser reads " + " ".join(f"word{i}" for i in range(n - 4)) + " today."

    def test_strict_flags_sentence_over_20_words(self):
        text = self._sentence(22)
        r = lint(text, mode="strict")
        assert r["violations"]["long_sentence(>20w)"] == 1

    def test_strict_silent_on_sentence_at_20_words(self):
        text = self._sentence(20)
        r = lint(text, mode="strict")
        assert r["violations"]["long_sentence(>20w)"] == 0

    def test_flavored_silent_on_22_word_sentence(self):
        text = self._sentence(22)
        r = lint(text, mode="flavored")
        assert r["violations"]["long_sentence(>25w)"] == 0

    def test_flavored_flags_sentence_over_25_words(self):
        text = self._sentence(27)
        r = lint(text, mode="flavored")
        assert r["violations"]["long_sentence(>25w)"] == 1

    def test_default_mode_is_flavored(self):
        text = self._sentence(22)
        r = lint(text)
        assert r["mode"] == "flavored"
        assert "long_sentence(>25w)" in r["violations"]

    def test_invalid_mode_raises(self):
        with pytest.raises(ValueError):
            lint("Some text.", mode="bogus")


# ---------------------------------------------------------------------------
# 2. Semicolon
# ---------------------------------------------------------------------------

class TestSemicolon:
    def test_semicolon_fires(self):
        r = lint("Start the server; then check the log.")
        assert r["violations"]["semicolon"] == 1

    def test_no_semicolon_silent(self):
        r = lint("Start the server. Then check the log.")
        assert r["violations"]["semicolon"] == 0


# ---------------------------------------------------------------------------
# 3. Contraction
# ---------------------------------------------------------------------------

class TestContraction:
    def test_contraction_fires(self):
        r = lint("It's not ready yet.")
        assert r["violations"]["contraction"] >= 1

    def test_no_contraction_silent(self):
        r = lint("It is not ready yet.")
        assert r["violations"]["contraction"] == 0


# ---------------------------------------------------------------------------
# 4. Passive voice
# ---------------------------------------------------------------------------

class TestPassiveVoice:
    def test_passive_voice_fires(self):
        r = lint("The file is read by the parser.")
        assert r["violations"]["passive_voice"] == 1

    def test_active_voice_silent(self):
        r = lint("The parser reads the file.")
        assert r["violations"]["passive_voice"] == 0


# ---------------------------------------------------------------------------
# 5. Perfect tense
# ---------------------------------------------------------------------------

class TestPerfectTense:
    def test_present_perfect_fires(self):
        r = lint("The plane has landed on the runway.")
        assert r["violations"]["perfect_tense"] >= 1

    def test_past_perfect_fires(self):
        r = lint("The crew had checked the manual before the flight.")
        assert r["violations"]["perfect_tense"] >= 1

    def test_simple_past_silent(self):
        r = lint("The plane landed on the runway.")
        assert r["violations"]["perfect_tense"] == 0

    def test_simple_present_silent(self):
        r = lint("The crew checks the manual before the flight.")
        assert r["violations"]["perfect_tense"] == 0


# ---------------------------------------------------------------------------
# 6. -ing main verb
# ---------------------------------------------------------------------------

class TestIngMainVerb:
    def test_ing_main_verb_fires(self):
        r = lint("The system is generating a report now.")
        assert r["violations"]["ing_main_verb"] == 1

    def test_simple_tense_silent(self):
        r = lint("The system generates a report now.")
        assert r["violations"]["ing_main_verb"] == 0


# ---------------------------------------------------------------------------
# 7. Nominalization
# ---------------------------------------------------------------------------

class TestNominalization:
    def test_nominalization_fires(self):
        r = lint("The team will perform an analysis of the log.")
        assert r["violations"]["nominalization"] >= 1

    def test_plain_verb_silent(self):
        r = lint("The team will analyze the log.")
        assert r["violations"]["nominalization"] == 0


# ---------------------------------------------------------------------------
# 8. Phrasal verb
# ---------------------------------------------------------------------------

class TestPhrasalVerb:
    def test_phrasal_verb_fires(self):
        r = lint("The team will spin up a new server today.")
        assert r["violations"]["phrasal_verb"] == 1

    def test_plain_verb_silent(self):
        r = lint("The team will start a new server today.")
        assert r["violations"]["phrasal_verb"] == 0


# ---------------------------------------------------------------------------
# 9. Banned word
# ---------------------------------------------------------------------------

class TestBannedWord:
    def test_banned_word_fires(self):
        r = lint("Utilize the tool to read the file.")
        assert r["violations"]["banned_word"] == 1
        assert "utilize" in r["sample_banned"]

    def test_plain_word_silent(self):
        r = lint("Use the tool to read the file.")
        assert r["violations"]["banned_word"] == 0


# ---------------------------------------------------------------------------
# 10. Marketing adjective
# ---------------------------------------------------------------------------

class TestMarketingAdjective:
    def test_marketing_adjective_fires(self):
        r = lint("This is a seamless and powerful tool.")
        assert r["violations"]["marketing_adjective"] == 2

    def test_plain_adjective_silent(self):
        r = lint("This is a small and useful tool.")
        assert r["violations"]["marketing_adjective"] == 0


# ---------------------------------------------------------------------------
# 11. Modal hedge
# ---------------------------------------------------------------------------

class TestModalHedge:
    def test_modal_hedge_fires(self):
        r = lint("It is important to note that the log rotates daily.")
        assert r["violations"]["modal_hedge"] == 1

    def test_direct_statement_silent(self):
        r = lint("The log rotates daily.")
        assert r["violations"]["modal_hedge"] == 0


# ---------------------------------------------------------------------------
# 12. Noun cluster
# ---------------------------------------------------------------------------

class TestNounCluster:
    KEY = "noun_cluster(>3, advisory)"

    def test_noun_cluster_over_3_fires(self):
        text = "Check the user account access control list before you edit it."
        r = lint(text)
        assert r[self.KEY] >= 1

    def test_short_noun_phrase_silent(self):
        text = "Check the access list before you edit it."
        r = lint(text)
        assert r[self.KEY] == 0

    def test_noun_clusters_helper_counts_one_run_once(self):
        text = "The user account access control list is long."
        assert noun_clusters(text) == 1

    def test_advisory_is_excluded_from_total(self):
        """The heuristic over-fires, so it must not move the headline score."""
        text = "Check the user account access control list before you edit it."
        r = lint(text)
        assert r[self.KEY] >= 1
        assert r["total"] == sum(r["violations"].values())
        assert self.KEY not in r["violations"]

    def test_sentence_starting_with_code_span_splits(self):
        """A backtick-led sentence must not merge into the one before it."""
        text = "The host owns the runtime. `AgRunner` then starts the task."
        r = lint(text)
        assert r["sentences"] == 2
        assert r["violations"]["long_sentence(>25w)"] == 0

    def test_sentence_starting_with_bare_identifier_splits(self):
        """Lowercase identifiers open sentences in technical prose."""
        for text in (
            "The tools are here. plan_create records the plan.",
            "Two test files changed. test_agrunner.py has 16 tests.",
            "The bridge changed. pi-bridge.js adds the two names.",
        ):
            assert lint(text)["sentences"] == 2, text

    def test_ordinary_lowercase_word_does_not_split(self):
        """Only identifier-shaped tokens split; plain lowercase must not."""
        assert lint("Version 1.x is young. it needs a pinned version.")["sentences"] == 1


class TestHardWrap:
    """Both repos wrap markdown at ~76 columns; the score must not depend on it."""

    LONG = ("The runner reads a graph file and starts each agent in turn, then waits "
            "for a signal file to appear on disk before it moves the node to the next "
            "state and records the outcome in the log.")

    def test_wrapped_long_sentence_still_fires(self):
        wrapped = self.LONG.replace(", then waits ", ", then waits\n").replace("the next ", "the next\n")
        r = lint(wrapped)
        assert r["sentences"] == 1
        assert r["violations"]["long_sentence(>25w)"] == 1

    def test_wrap_does_not_change_the_score(self):
        wrapped = self.LONG.replace(", then waits ", ", then waits\n").replace("the next ", "the next\n")
        assert lint(wrapped)["total"] == lint(self.LONG)["total"]
        assert lint(wrapped)["longest_sentence_words"] == lint(self.LONG)["longest_sentence_words"]

    def test_wrapped_paragraph_does_not_false_fire_long_paragraph(self):
        para = "\n".join(f"Sentence number {n} is short." for n in range(1, 4))
        assert lint(para)["violations"]["long_paragraph(>6s)"] == 0

    def test_list_items_and_headings_stay_separate(self):
        md = "## Heading here\n\n- first item\n- second item\n\nA wrapped line that\ncontinues here."
        assert sentences_of(md) == [
            "Heading here", "first item", "second item",
            "A wrapped line that continues here.",
        ]


# ---------------------------------------------------------------------------
# 13. Long paragraph
# ---------------------------------------------------------------------------

class TestLongParagraph:
    def test_long_paragraph_fires(self):
        para = " ".join(f"This is sentence {i}." for i in range(7))
        r = lint(para)
        assert r["violations"]["long_paragraph(>6s)"] == 1

    def test_short_paragraph_silent(self):
        para = " ".join(f"This is sentence {i}." for i in range(5))
        r = lint(para)
        assert r["violations"]["long_paragraph(>6s)"] == 0


# ---------------------------------------------------------------------------
# 14. Em dash - reported separately, never counted as a violation
# ---------------------------------------------------------------------------

class TestEmDash:
    def test_em_dash_counted_separately(self):
        r = lint("The build failed — check the log for the cause.")
        assert r["em_dash(slop-marker)"] == 1
        # STE bans the semicolon, not the em dash: it must never land in
        # the violations dict or the total.
        assert "em_dash" not in r["violations"]
        assert r["violations"]["semicolon"] == 0

    def test_en_dash_counted_too(self):
        r = lint("See pages 4–9 for details.")
        assert r["em_dash(slop-marker)"] == 1


# ---------------------------------------------------------------------------
# 15. Code-span token counting
# ---------------------------------------------------------------------------

class TestCodeSpanTokenCounting:
    """A code span counts as one token; upstream deleted it entirely."""

    def test_inline_code_span_counts_as_one_token(self):
        stripped = strip_code("Run `npm install some very long package name` now.")
        assert "Xcode" in stripped
        assert "install" not in stripped

    def test_fenced_code_block_counts_as_one_token(self):
        text = "Read this.\n\n```python\ndef f(x, y, z):\n    return x + y + z\n```\n\nDone."
        stripped = strip_code(text)
        assert "Xcodeblock" in stripped
        assert "return" not in stripped

    def test_code_span_inflates_word_count_vs_deletion(self):
        # A long code span must not vanish from the word count: it should
        # contribute exactly one word, not zero and not its literal length.
        text = "Run `alpha beta gamma delta epsilon zeta` now."
        r = lint(text)
        # "Run", "Xcode", "now" -> 3 words, not 1 (all deleted) or 8 (spelled out).
        assert r["words"] == 3

    def test_code_heavy_doc_does_not_inflate_score(self):
        # Regression guard for the bug this fix targets: upstream's
        # strip_code() deleted a code span outright, which shrinks the word
        # count and inflates the per-100w rate for every other rule on a
        # code-heavy document. The fix must count the span as exactly one
        # word (Xcode), not zero (deleted) and not its literal length.
        with_code = "Run `git status --short --branch` now."
        without_code_span = "Run now."  # what the old delete-based strip_code left behind
        r_with = lint(with_code)
        r_without = lint(without_code_span)
        assert r_with["words"] == r_without["words"] + 1


# ---------------------------------------------------------------------------
# 16. Per-100-words arithmetic
# ---------------------------------------------------------------------------

class TestPer100WordsArithmetic:
    def test_total_per100w_matches_manual_calc(self):
        text = "Utilize the tool. It's ready."
        r = lint(text)
        expected = round(r["total"] * 100.0 / r["words"], 2)
        assert r["total_per100w"] == expected

    def test_violation_per100w_matches_manual_calc(self):
        text = "Utilize the tool to obtain the file."
        r = lint(text)
        banned = r["violations"]["banned_word"]
        expected = round(banned * 100.0 / r["words"], 2)
        assert r["violations_per100w"]["banned_word"] == expected

    def test_empty_text_does_not_divide_by_zero(self):
        r = lint("")
        assert r["words"] == 1  # guarded to avoid ZeroDivisionError
        assert r["total_per100w"] == 0.0


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
