# Agent Notes

## UI Work

- For UI, UX, frontend layout, visual design, redesign, or styling work, apply the project UI standards below by default. Do not open/read the full `gpt-taste` or `redesign-existing-projects` skill files for small follow-ups, copy tweaks, narrow styling fixes, or routine layout polish.
- Use the full `gpt-taste` and `redesign-existing-projects` skills only for substantial redesigns, new visual directions, broad UX audits, ambiguous design work that needs deeper guidance, or when the user explicitly asks to use those skills.
- Preserve the current product style unless the user explicitly asks for a new direction. Improve hierarchy, spacing, alignment, states, and clarity without adding unnecessary decoration.
- Remove redundant controls, decorative labels, cramped components, and non-actionable UI before adding new elements.
- After meaningful UI changes, use Playwright to inspect the rendered page for yourself. Do not rely on code review alone.
- Use Playwright screenshots and DOM measurements to verify exact alignments, text fit, clipped images/logos, responsive behavior, and horizontal overflow. Prefer `getBoundingClientRect()` checks for paired elements such as avatars and profile text, card columns, headers, controls, and item rows.
- Test at least one desktop viewport and one mobile viewport for substantial UI work. Report any browser automation limitation if Playwright cannot run.

## Git Workflow

- After making any repository change, run the relevant checks for the change.
- Commit the completed changes.
- Push the commit to the current branch's upstream remote.
- Do this after every code, content, config, documentation, or dependency change unless the user explicitly says not to commit or push.
- Do not include unrelated untracked files or user changes in the commit.
