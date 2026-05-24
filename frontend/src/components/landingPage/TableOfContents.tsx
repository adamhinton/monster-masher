// _______________
// Page guide / table of contents for the about/landing page.
//
// Renders a <nav> with clickable anchor links to each major section.
// Designed to be skimmable — not a markdown document pasted into the UI.
// Appears between the hero and the first content block.
//
// Server Component — no interactivity required.
// _______________

import Link from "next/link";

const SECTIONS = [
	{ id: "download-ready", label: "Download-ready portraits" },
	{ id: "how-it-works", label: "How it works" },
	{ id: "sample-downloads", label: "Sample downloads" },
	{ id: "example-gallery", label: "Example gallery" },
	{ id: "tech-stack", label: "Tech stack" },
	{ id: "try-it", label: "Try it yourself" },
];

/**
 * Skimmable page guide for the /about landing page.
 *
 * Renders anchor links to all major sections so recruiters (and curious
 * visitors) can jump to the part they care about. Intentionally understated
 * so it does not compete with the hero above it.
 */
export function TableOfContents() {
	return (
		<nav
			aria-label="Page sections"
			className="rounded-2xl border border-border/50 bg-card/60 px-5 py-4"
		>
			<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
				On this page
			</p>
			<ol className="flex flex-wrap gap-x-4 gap-y-2">
				{SECTIONS.map(({ id, label }, index) => (
					<li key={id} className="flex items-center gap-3">
						<span
							aria-hidden="true"
							className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
						>
							{index + 1}
						</span>
						<Link
							href={`#${id}`}
							className="text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
						>
							{label}
						</Link>
					</li>
				))}
			</ol>
		</nav>
	);
}
