Clanker Wanker,

```md
---
name: styling-rules
description: How I want my styling done for frontend next.js pages
---

## ShadCN first

Use ShadCN heavily.

If a ShadCN primitive exists for a UI need, start there.

Do not hand-roll common UI primitives with raw Tailwind unless there is a strong reason.

## Using existing styles

I have styles already in globals.css. They're there for a reason. use them. Don't write your own styles or themes beyond what is reasonable for the specific scope of the component you're writing.

## Strong typing always

No `any`.

Do not use `as any`.

Do not silence TypeScript to get code working.

Treat type errors as useful feedback, not obstacles to bypass.

## Responsive by default

Every page must work on:

- narrow mobile
- large mobile
- tablet
- laptop
- large desktop

No page is complete until it has been checked at common responsive widths.

## IMPORTANT

ShadCN first, always.

If you’re writing much custom tailwind at all, you’re doing it wrong.

I give you full authority to install any and all shadcn components.

Semantic HTML.

I don’t want div soup.
```
