---
paths:
  - 'src/**/*.tsx'
  - 'src/styles/**'
---

# UI, styling and accessibility

## Matching the spec

- Build from the screen spec (`../docs/ui-pipeline/screens/`, `../specs/<NNN>-<slug>/spec.md`) and compare with the mockup (`../docs/ui-pipeline/mockups/index.dc.html`).
- Labels, placeholders, messages and button text are English and copied verbatim. If the spec has no wording, ask; do not invent it.
- No dark mode, no i18n, nothing the proposal lists as out of scope.

## Styling

- Tailwind utilities only; no CSS modules, inline `style={{}}` (except data-driven values like a board background or label color) or new global CSS.
- Colors only through tokens (`src/styles/tokens.css`, mapped in `src/styles/index.css`): `bg-primary`, `text-muted-foreground`, `border-border`. No hex/rgb or Tailwind palette colors (`bg-blue-500`). Exceptions: the board label palette and the 10 board background colors, which come from data.
- Merge class names with `cn()` from `@/lib/utils`; variants with `cva` the way `button.tsx` does.

## Components

- Reuse `src/components/ui/` (shadcn: Button, Dialog, DropdownMenu, Input, Popover). Add a missing one with `pnpm dlx shadcn@latest add <name>`; do not hand-edit generated files, wrap them in `components/common/` instead.
- Icons from `lucide-react` only.
- Dialogs use the shadcn `Dialog` (focus trap, Esc, focus return come with it). Do not build modals from `div`s.

## Accessibility (WCAG 2.1 AA)

- Native elements first: `<button>` for actions, `<a>`/`<Link>` for navigation, `<form>` with submit. No clickable `div`/`span`.
- Every input has a visible `<label>` (or `aria-label` when the spec has no visible label); errors are linked with `aria-describedby` and announced (`role="alert"`).
- Icon-only buttons have an `aria-label` from the spec.
- Everything works with the keyboard, focus is always visible (`ring` token), tab order follows the layout. Drag and drop has a keyboard or menu alternative ("Move" action).
- One `<h1>` per page, headings in order. Images have `alt` (empty for decoration).
- Text and controls meet 4.5:1 / 3:1 contrast; do not convey state by color alone (label colors also show a name).
- Respect `prefers-reduced-motion` for animations.
