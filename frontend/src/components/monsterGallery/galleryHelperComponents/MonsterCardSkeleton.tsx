// _____________
// Skeleton placeholder for a single MonsterCard.
// Used by the loading state to fill the grid while the page hydrates.
// _____________

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Approximates the MonsterCard shape for the loading skeleton grid.
 * aria-hidden — purely decorative, screen readers get aria-busy from the parent.
 */
export function MonsterCardSkeleton() {
	return (
		<article
			aria-hidden="true"
			className="flex w-full max-w-xs flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
		>
			{/* ── Image block ──────────────────────────────────────────── */}
			<Skeleton className="aspect-square w-full rounded-none" />

			<div className="flex flex-col gap-3 p-4">
				{/* ── Monster name line ─────────────────────────────────── */}
				<Skeleton className="h-5 w-3/4" />

				{/* ── Trait badge chips ─────────────────────────────────── */}
				<div className="flex gap-2">
					<Skeleton className="h-5 w-16 rounded-full" />
					<Skeleton className="h-5 w-20 rounded-full" />
				</div>

				{/* ── Flavor text lines ─────────────────────────────────── */}
				<Skeleton className="h-3 w-full" />
				<Skeleton className="h-3 w-2/3" />

				{/* ── Action row ────────────────────────────────────────── */}
				<Skeleton className="mt-1 h-8 w-full rounded-lg" />
			</div>
		</article>
	);
}
