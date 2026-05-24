// _______________
// Tech stack badge block for the about/landing page.
//
// Shows the major stack pieces as a tasteful badge list.

// Server Component — no interactivity needed.
// _______________

import { LandingPageBlock } from "@/components/landingPage/LandingPageBlock";

// ---------------------------------------------------------------------------
// Stack data
// ---------------------------------------------------------------------------

interface StackItem {
	name: string;
	description: string;
}

const STACK: StackItem[] = [
	{ name: "Next.js", description: "App Router + Server Components" },
	{ name: "TypeScript", description: "End-to-end type safety" },
	{ name: "Django REST", description: "API and data model" },
	{ name: "Python", description: "Backend generation logic" },
	{ name: "PostgreSQL", description: "Persistent monster storage" },
	{ name: "Generative AI", description: "AI image generation" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Short tech credibility section for the about/landing page.
 * Shows the major stack pieces — nothing more, nothing less.
 */
export function TechStackBadgeBlock() {
	return (
		<LandingPageBlock id="tech-stack" eyebrow="Built with" title="The stack">
			<ul className="flex flex-wrap gap-4">
				{STACK.map(({ name, description }) => (
					<li
						key={name}
						className="flex flex-col gap-0.5 rounded-xl border border-border/60 bg-card px-4 py-3"
					>
						<span className="text-sm font-semibold text-foreground">
							{name}
						</span>
						<span className="text-xs text-muted-foreground">{description}</span>
					</li>
				))}
			</ul>
		</LandingPageBlock>
	);
}
