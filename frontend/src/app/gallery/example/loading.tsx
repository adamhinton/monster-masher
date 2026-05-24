// _______________
// Next.js route segment loading UI for /gallery/example.
// _______________

import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";

const NUM_SKELETON_CARDS = 6;

export default function ExampleGalleryLoadingPage() {
	return (
		<PageContainer size="marketing">
			<main>
				<section aria-label="Loading example monsters">
					{/* Header skeleton */}
					<div className="flex flex-col gap-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-10 w-64" />
						<Skeleton className="h-5 w-full max-w-prose" />
					</div>

					{/* Grid skeleton */}
					<ul
						aria-busy="true"
						aria-label="Loading example monsters"
						className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
					>
						{Array.from({ length: NUM_SKELETON_CARDS }, (_, index) => (
							<li key={index} className="flex justify-center">
								<div className="flex w-60 flex-col gap-3">
									<Skeleton className="h-60 w-60 rounded-3xl" />
									<Skeleton className="h-5 w-32" />
									<div className="flex gap-2">
										<Skeleton className="h-6 w-20 rounded-full" />
										<Skeleton className="h-6 w-24 rounded-full" />
									</div>
								</div>
							</li>
						))}
					</ul>
				</section>
			</main>
		</PageContainer>
	);
}
