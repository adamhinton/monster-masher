// _______________
// Final CTA block for the about/landing page.
//
// Calls the user to start creating monsters.
//
// Server Component — no interactivity needed.
// _______________

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Final call-to-action block at the bottom of the about/landing page.
 * Repeats the primary creation and gallery actions so visitors do not need
 * to scroll back to the top.
 */
export function FinalCtaBlock() {
	return (
		<section
			id="try-it"
			aria-labelledby="try-it-heading"
			className="flex flex-col items-center gap-8 rounded-3xl border border-border/60 bg-card px-6 py-16 text-center"
		>
			<h2
				id="try-it-heading"
				className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
			>
				Go make something weird.
			</h2>
			<p className="max-w-md text-muted-foreground">
				Start with a few traits and leave with a monster portrait you can
				actually use.
			</p>
			<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
				<Link href="/create" className={buttonVariants({ size: "lg" })}>
					<Sparkles aria-hidden="true" className="size-4" />
					Try it yourself
				</Link>
				<Link
					href="/gallery/example"
					className={buttonVariants({ variant: "outline", size: "lg" })}
				>
					See example gallery
				</Link>
			</div>
		</section>
	);
}
