# Open questions: work-drawer

1. **Does the detail pane follow the walk at the port?** The pane showing while
   the arrows move is the deck's measured behaviour, and it reads well at 60vh.
   The shipped shell's rail is a different frame (the Work row, not a top-left
   button); the behaviour is measured here first, and the port epic decides.
2. **Do standalone merged pull requests earn rows?** Prototype A carries them
   in its Shipped lane; the deck carries none and states that in its footer.
   The engineer decides at the port, with both arrangements on screen.
3. **What resets when the drawer closes?** The search, the filter, the fold,
   and the selection all reset on close, so the reader meets the whole board
   every time. If a reader's fold should persist across sessions, the cookie
   write must be guarded the way the sidebar's is (a published artifact's
   sandboxed frame throws on `document.cookie`).