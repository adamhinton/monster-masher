// ______________
// Next.js route segment loading UI for /gallery.
// Shown while the gallery page is streaming / hydrating.
// ______________

import { PageContainer } from "@/components/layout/PageContainer";
import { MonsterCardSkeleton } from "@/components/monsterGallery/galleryHelperComponents/MonsterCardSkeleton";

/** Enough cards to fill the first viewport at the widest grid breakpoint (4 col). */
const NUM_SKELETON_CARDS = 8;

export default function GalleryLoadingPage() {
	return (
		<PageContainer size="marketing">
			<main>
				<section aria-label="Loading your monster gallery">
					{/* ── Skeleton grid ────────────────────────────────────────── */}
					<ul
						aria-busy="true"
						aria-label="Loading monsters"
						className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
					>
						{Array.from({ length: NUM_SKELETON_CARDS }, (_, index) => (
							<li key={index} className="flex justify-center">
								<MonsterCardSkeleton />
							</li>
						))}
					</ul>
				</section>
			</main>
		</PageContainer>
	);
}
