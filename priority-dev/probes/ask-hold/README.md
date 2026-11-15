# Ask-hold probe

This probe is test equipment. It holds a main-loop AskUserQuestion call in a pane, so you can record what the engine does. No marketplace lists it.

## Load the probe

1. Open a terminal in the repository root.
2. Run `claude --plugin-dir priority-dev/probes/ask-hold`.

## Set the priority-dev folder

1. Run `/config`.
2. Find the row `priority-dev folder` under `ask-hold-probe`.
3. Enter the path to the priority-dev checkout, such as `<repo>/priority-dev`.

The probe writes its log to `<priority-dev folder>/reports/logs/ask-hold/probe.jsonl`. Without the folder, the probe writes no log.

## Run the hold probe

1. Run `/ask-probe hold`. The command confirms the mode.
2. Ask the agent to call AskUserQuestion. Name two questions, each with two or three options.
3. The pane `Ask hold` opens and takes the keyboard. It shows each question, its options, an Other input, the three answer shapes, and Send.
4. Wait two minutes before you press Send. The pane shows the seconds that the call waits.
5. Pick one or more options for each question, or type under Other.
6. Press one answer shape: `answers-by-question`, `answers-list`, or `text`.
7. Press Send. Ask the agent which answer it received, and which shape it was.
8. Repeat steps 2 to 7 for each of the three shapes.
9. Read the log with `tail -n 20 <priority-dev folder>/reports/logs/ask-hold/probe.jsonl`.

The engine may end a held call before two minutes. A held call that runs past its hook budget logs a `cut-off` line, with the word `timeout`. Record that line as the result.

## Run the hold-spawn mode

`/ask-probe hold-spawn` holds each main-loop call inside a child process. Send writes the answer file, then the done file, under `.cobuilder/ask-hold` in the session folder. The probe does not delete these files, so they stay for the record.

1. Run `/ask-probe hold-spawn`. The command confirms the mode.
2. Ask the agent to call AskUserQuestion, then open the pane `Ask hold`.
3. Hold the call for 3 minutes. The pane must not show a `skipped` message.
4. Pick an option, press Send after 20 seconds, and check that the agent gets the answer.
5. Start a hold, press Esc, and run `ps aux | grep "until \[ -e"`. The child must not appear.

## Read the log

Each line is one JSON event. The kinds are:

- `caught`: the probe holds a call. `inTranscript` says whether the transcript holds its tool use.
- `answered`: Send resolved the call. `elapsedMs` gives the wait, and `shape` gives the answer shape.
- `cut-off`: the call ran past its budget. `detail` gives the failure kind.
- `passed`: in pass mode, the probe passed a main-loop call on to the dialog.

## Check the dialog path

1. Run `/ask-probe pass`. The probe passes each call on to the engine dialog.
2. Ask the agent to call AskUserQuestion. The engine dialog opens.
3. Answer the dialog. No pane `Ask hold` opens.
4. Run `/ask-probe off` to stop the probe.

The probe holds only main-loop calls. A subagent call passes on in every mode.
