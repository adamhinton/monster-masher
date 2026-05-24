// _______________
// Next.js route segment loading UI for /about.
// Shown while the about page is streaming / hydrating.
// _______________

import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";

export default function AboutLoadingPage() {
	return (
		<PageContainer size="marketing">
			<main className="flex flex-col gap-24 py-8 sm:py-16">
				{/* Hero skeleton */}
				<section aria-label="Loading landing page">
					<div className="flex flex-col gap-4">
						<Skeleton className="h-14 w-3/4" />
						<Skeleton className="h-14 w-1/2" />
						<Skeleton className="mt-2 h-6 w-full max-w-2xl" />
						<Skeleton className="h-6 w-2/3 max-w-2xl" />
					</div>
					<div className="mt-8 flex gap-3">
						<Skeleton className="h-11 w-44 rounded-lg" />
						<Skeleton className="h-11 w-36 rounded-lg" />
					</div>
				</section>

				{/* Section skeletons */}
				{Array.from({ length: 3 }, (_, i) => (
					<section key={i} aria-hidden="true" className="flex flex-col gap-4">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-full max-w-lg" />
						<Skeleton className="h-4 w-2/3 max-w-lg" />
					</section>
				))}
			</main>
		</PageContainer>
	);
}
