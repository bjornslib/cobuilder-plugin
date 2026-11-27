# Product: The priority reader answers an AskUserQuestion call

## Problem

When the agent asks a question with AskUserQuestion, it stops and waits
for the person. The priority reader is silent at that point, because it
reads only the end of a turn. The person answers in the engine dialog with
no reading beside the question.

## Success metric

In one week of use, at least eight of every ten AskUserQuestion calls in a
session with the reader on get a question card in the pane, and the
person answers them there. The person counts the cards in the reading
history, and counts the dialogs they still saw.

## Announcement — the blog post before the feature

The priority reader now reads the moment the agent asks you a question.
The pane opens with the question and its options at once. A reading of
that moment fills in beside them, with the status, the priority, and the
steps it suggests. You pick your answer in the pane, press Send, and the
agent goes on. If the pane cannot take the question, the usual dialog
opens, and the reading still arrives.

## Screens

The question card extends layout C of the approved reader pane
(`docs/architecture/designs/priority-dev-cc-plugin/pane-design/layout-c.png`).
The E1 probe draws a test pane only, which is not a product screen.
