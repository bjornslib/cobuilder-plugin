#!/usr/bin/env python3
"""Fix the broken dock HTML in viewer/index.html"""

with open('/Users/theb/Documents/Windsurf/prodyssey/plugins/cobuilder-artifact/viewer/index.html', 'r') as f:
    content = f.read()

# Find the broken dock section and replace it
old_dock = '''  <div id="dock">
        <h2 id="assessment-sheet-title">PR Author Assessment</h2>
        <div class="adr-sheet-meta" id="assessment-sheet-meta"></div>
      </div>
      <button class="drawer-close" id="assessment-sheet-close-btn" title="Close (Esc)">&times;</button>
    </div>
    <div class="drawer-body" id="assessment-sheet-body"></div>
  </div

  <!-- Designs sheet'''

new_dock = '''  <div id="dock">
    <div class="dock-row1">
      <span class="decision-status mono" id="status-pill"></span>
      <div class="dock-row1-actions">
        <button class="btn-add-comment" id="btn-comments-toggle">Comments (0)</button>
        <button class="decision-btn close-pr pr-only" id="btn-close">Close pull request</button>
        <div class="split-btn pr-only">
          <button class="split-main" id="btn-merge">Merge pull request</button>
          <button class="split-arrow" id="btn-merge-arrow" aria-haspopup="true" title="Select merge method">&#9662;</button>
          <div class="merge-menu" id="merge-menu" hidden>
            <button class="merge-menu-item" data-method="squash">Squash and merge</button>
            <button class="merge-menu-item" data-method="rebase">Rebase and merge</button>
          </div>
        </div>
      </div>
    </div>

  <div id="drawer-scrim"></div>

  <!-- Designs sheet'''

if old_dock in content:
    content = content.replace(old_dock, new_dock)
    with open('/Users/theb/Documents/Windsurf/prodyssey/plugins/cobuilder-artifact/viewer/index.html', 'w') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Pattern not found - trying alternative...")
    # Try with different whitespace
    import re
    pattern = r'  <div id="dock">\s*<h2 id="assessment-sheet-title">.*?<!-- Designs sheet'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        print(f"Found match: {match.group()[:200]}...")
        content = re.sub(pattern, new_dock, content, flags=re.DOTALL)
        with open('/Users/theb/Documents/Windsurf/prodyssey/plugins/cobuilder-artifact/viewer/index.html', 'w') as f:
            f.write(content)
        print("Fixed with regex!")
    else:
        print("No match found")