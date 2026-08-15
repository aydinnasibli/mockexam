/**
 * Join class names, dropping anything falsy.
 *
 * Deliberately local and deliberately tiny. This is NOT `clsx`, `classnames`,
 * `emotion`'s `cx`, or shadcn's `cn` — no dependency is involved, and in
 * particular it does NOT resolve conflicting Tailwind utilities the way
 * `tailwind-merge` does.
 *
 * That omission is the design. The UI primitives here (Button, Tag, Panel)
 * expose closed `variant` / `size` / `tone` props and a `size="none"` escape
 * hatch precisely so that a call site never has to fight the component's own
 * utilities. If a component ever does need to resolve a conflict, the answer is
 * to add the missing variant — or to adopt `tailwind-merge` properly — not to
 * grow a bespoke merger in here.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
