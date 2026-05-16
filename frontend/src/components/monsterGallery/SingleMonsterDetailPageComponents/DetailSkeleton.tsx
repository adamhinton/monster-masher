// _______________
// Loading skeleton for the monster detail page at /gallery/[monsterID].
// Shown while Redux auth state is still resolving.
//
// Used by: src/app/gallery/[monsterID]/page.tsx
// _______________

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/PageContainer";

/**
 * Full-page skeleton that approximates the two-column dossier layout.
 * Matches the grid structure of MonsterDetailView so the layout shift
 * on hydration is minimal.
 */
export function DetailSkeleton() {
	return (
		<PageContainer size="detail">
			<div className="mb-6">
				<Skeleton className="h-4 w-28" />
			</div>
			<div className="grid grid-cols-1 gap-8 lg:grid-cols-[480px_1fr]">
				{/* Image column */}
				<Skeleton className="aspect-square w-full max-w-120 rounded-3xl" />

				{/* Dossier column */}
				<div className="flex flex-col gap-4">
					<Skeleton className="h-10 w-2/3" />
					<div className="flex gap-2">
						<Skeleton className="h-6 w-20 rounded-full" />
						<Skeleton className="h-6 w-24 rounded-full" />
					</div>
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
					<Separator className="my-2" />
					<Skeleton className="h-32 w-full" />
					<div className="flex gap-3">
						<Skeleton className="h-9 w-28" />
						<Skeleton className="h-9 w-28" />
					</div>
				</div>
			</div>
		</PageContainer>
	);
}
