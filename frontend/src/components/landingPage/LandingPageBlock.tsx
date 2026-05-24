// _______________
// Semantic section wrapper used by all landing page blocks.
//
// Standardises:
//   - anchor id for page-guide navigation
//   - optional eyebrow / title / description header
//   - consistent section spacing and max-width
//
// Uses a <section> element with aria-labelledby when a title is present.
// _______________

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface LandingPageBlockProps {
	/** Applied as the section's id — also used for anchor links in the page guide. */
	id?: string;
	/** Small all-caps label above the heading. */
	eyebrow?: string;
	/** Section heading rendered as an <h2>. */
	title?: string;
	/** One or two lines of supporting copy below the heading. */
	description?: string;
	children: ReactNode;
	/** Extra Tailwind classes applied to the outer section. */
	className?: string;
}

/**
 * Shared section container for all landing page content blocks.
 *
 * Renders a semantic `<section>` with optional eyebrow, heading, and
 * description above the children. The `id` prop doubles as an anchor
 * target for the page guide navigation.
 */
export function LandingPageBlock({
	id,
	eyebrow,
	title,
	description,
	children,
	className,
}: LandingPageBlockProps) {
	const titleId = id ? `${id}-heading` : undefined;
	const hasHeader =
		eyebrow !== undefined || title !== undefined || description !== undefined;

	return (
		<section
			id={id}
			aria-labelledby={title ? titleId : undefined}
			className={cn("flex flex-col gap-8", className)}
		>
			{hasHeader && (
				<header className="flex flex-col gap-2">
					{eyebrow && (
						<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
							{eyebrow}
						</p>
					)}
					{title && (
						<h2
							id={titleId}
							className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
						>
							{title}
						</h2>
					)}
					{description && (
						<p className="max-w-2xl text-muted-foreground">{description}</p>
					)}
				</header>
			)}
			{children}
		</section>
	);
}
