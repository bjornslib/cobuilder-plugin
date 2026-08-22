---
name: ste-writing
description: Write and rewrite technical prose in ASD-STE100 Issue 9 Simplified Technical English (STE). STE is a controlled language standard for plain English technical documentation, and it removes AI slop. Trigger phrases -- ASD-STE100, STE, simplified technical english, plain english, controlled language, AI slop, technical documentation. Use for READMEs, docs, ADRs, PR and commit bodies, error messages, code comments, and release notes. Two modes: strict (procedures, safety text) and flavored (general prose). Ships a rules-level linter. The linter does not certify full dictionary compliance.
---

# ste-writing

Write prose in ASD-STE100 Simplified Technical English. STE covers docs,
READMEs, pull-request text, error messages, release notes, and comments. It
does not cover code, identifiers, or command syntax. It is not for marketing
copy, essays, or any text that needs a voice. STE strips voice on purpose.

## Scope

IN SCOPE:
1. READMEs.
2. Files under `docs/`.
3. ADRs (architecture decision records).
4. PR and commit bodies.
5. Error messages.
6. Code comments.
7. Release notes and reference docs.

OUT OF SCOPE:
1. Any deliverable that needs a voice. STE removes voice on purpose. In the
   cobuilder-harness repo these are the skills `linkedin-drafter`,
   `linkedin-campaign-development`, `consulting-os-board-memos`, and
   `consulting-os-executive-narrative`. Other repos may hold none of them.
2. Chat and conversational replies. In the cobuilder-harness repo the
   `caveman` skill governs those replies, not this one.
3. Code, identifiers, and command syntax.

## Precedence

STE yields to `caveman` for a conversational turn. STE yields to an
out-of-scope skill above for its own deliverable. Apply STE to everything
else in scope.

## Rules

WORDS
1. Use one name for one thing. Do not call the same item by two names.
2. Use the short common word: start (not begin/commence/initiate), use (not
   utilize/leverage), help (not facilitate), make sure (not ensure), before
   (not prior to), after (not subsequent to), about (not regarding), get
   (not obtain/acquire), show (not demonstrate), also (not furthermore).
3. Give each word one meaning. "Fall" means move down, not decrease.
4. No marketing adjectives: seamless, robust, powerful, cutting-edge,
   effortless, world-class, next-generation, revolutionary.
5. Use American spelling.
6. Keep a noun cluster to 3 words or fewer. Split a longer string with "of"
   or a hyphen: not "user account access control list", but "list that
   controls access to a user account".
7. Put an article (a, an, or the) before every countable singular noun. Do
   not drop the article to save a word.

VERBS
1. Use active voice. Write "the parser reads the file", not "the file is
   read by the parser".
2. Use a verb for an action. Write "analyze the log", not "perform an
   analysis of the log".
3. Do not stack auxiliaries. Not "it is important to note that this may
   help to improve X." Write "this improves X."
4. Do not use an "-ing" main verb where a simple tense works.
5. Use simple tenses only. Do not use a perfect tense ("has landed", "had
   been"). Write "the parser found the error", not "the parser has found
   the error".

SENTENCES
1. Write one instruction per sentence.
2. Cap an instruction sentence at 20 words. Cap a descriptive sentence at
   25 words.
3. Do not use a contraction.

PUNCTUATION
1. Do not use a semicolon. Write two sentences instead. STE does not ban
   the em dash, only the semicolon.

STRUCTURE
1. Keep one topic per paragraph, with a cap of six sentences.
2. For steps, use a numbered vertical list, one action per item, in
   imperative form.
3. State a condition before its command.

Write only the requested text. Add no preamble, no summary, and no closing
remark.

## Modes

- **strict** — procedures, runbooks, safety text, error messages. Apply
  every rule above, with the 20-word sentence cap.
- **flavored** — general prose (READMEs, PR descriptions, docs, ADRs).
  Apply the sentence, paragraph, tense, active-voice, and phrasal-verb
  rules, with the 25-word sentence cap. Relax the roughly 900-word
  dictionary lockdown so the text keeps enough range to read well.

## Self-lint (run before you return text)

1. Any sentence over the cap for this mode? Split it.
2. Any semicolon? Replace it with a period.
3. Any contraction? Expand it.
4. Any passive voice with a known actor? Make it active.
5. Any perfect tense ("has done", "had been")? Rewrite it in a simple
   tense.
6. Any "-ing" main verb, nominalization ("perform an analysis"), or
   phrasal verb ("spin up")? Replace it with a plain verb.
7. Any noun cluster over 3 words? Break it apart.
8. Any missing article before a countable noun? Add "a", "an", or "the".
9. Same thing named two ways? Pick one name.

The rules above are lintable, and they remove the FORM of slop. Full STE
also needs human judgment: the right technical noun, whether a sentence
makes good sense to a reader. A checker cannot certify that judgment, and
slop is not only about that judgment. This skill fixes form. It cannot
make a hollow paragraph true.

## Linter

Run `ste-lint.py` against a draft to get a violations-per-100-words score.
Lower reads cleaner.

```
python3 ste-lint.py --mode flavored your-draft.md
python3 ste-lint.py --mode strict your-draft.md
```

Lint a draft, apply the rules above, then lint the result again. The score
delta between the two runs is the signal, not the absolute number.

## Attribution

This skill and `ste-lint.py` start from an MIT-licensed source: the
ste-writing skill and linter by Ege Celebi, 2026, at
https://github.com/woosal1337/blog/tree/main/videos/ep01-the-cure-for-ai-slop.

The ASD-STE100 Issue 9 standard is free to read at https://asd-ste100.org.
Copyright law covers the standard. Read it at the source. Do not paste it
here. This skill checks rules only. It does not certify compliance with
the ASD-STE100 dictionary.
