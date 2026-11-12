# 0007. Presentation lives in the components library, one stylesheet per component, named with BEM

## Status

Accepted, 12 November 2026.

## Context

When an app is styled by one global stylesheet, any template can draw a button by typing
`class="btn"`, and the build cannot notice. Jubilee's audit of that arrangement found hundreds
of hand-written buttons and dozens of copies of the dialog frame. The accepted practice for a
component library is the opposite: a component owns its markup and its styles, the styles are
encapsulated, and only design tokens and layout utilities are global. Popkin starts there.

## Decision

- **Prefer the best practice.** Where there is more than one way to build something, the
  established practice of the platform (Angular, .NET, Playwright, WCAG) is chosen over the
  expedient one. A departure is recorded in an ADR with its reason. A rule in `AGENTS.md` or an
  ADR that is found to conflict with best practice is raised and corrected, not worked around.
- **Every presentation component is in `frontend/projects/components`.** Application projects
  import them. An application project declares pages, dialogs and its root as containers, which
  hold state, call services, navigate and compose `pk-*` components. It declares no
  presentation component, no button and no stylesheet of its own.
- **One stylesheet per component.** A component is `name.ts` + `name.html` + `name.scss`,
  with `styleUrl` and Angular's default (emulated) encapsulation. The stylesheet holds every
  rule of that component and nothing else. `ViewEncapsulation.None` is not used.
- **BEM names.** The component is the block, named as in the design system (`btn`, `alert`,
  `dialog`). Its parts are `block__element`, its variants and states of appearance are
  `block--modifier`. A state that assistive technology must know is an attribute
  (`aria-current`, `aria-invalid`, `disabled`), styled through that attribute, with no
  modifier beside it. A stylesheet does not style another component's block and does not nest
  blocks; a component that needs another one composes it. The block class stays on the same
  element as in the mock, so the e2e locators keep working.
- **Global styles are foundations only**: `tokens.css` (tokens, `@font-face`), the reset, and
  the layout and text utilities (`stack`, `cluster`, `split`, `form-grid`, `container`,
  `visually-hidden`, `truncate`, `text-muted`, `text-caption`, `only-*`). These are the
  only classes an application template may write.
- **The design system stays the source.** A component's stylesheet carries the rules of its block
  from the design system, reading tokens by role. A change to the look is made in the design
  system and its mock first.

## Consequences

- A kit class typed in an application template has no effect, so the rule is held by the build
  and by what is on screen, with lint and review behind it.
- A component whose root is a native element with an attribute selector (`button[pk-button]`)
  styles that root through `:host`, with the block class on the host.
