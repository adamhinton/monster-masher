// ______________
// Gallery page — the user's personal creature collection.
// Reads saved monsters directly from Redux auth state.

// Pagination logic (GalleryPagination.tsx) only shows a set number of monsters per page.
// ______________

"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { GalleryHeader } from "@/components/monsterGallery/galleryHelperComponents/GalleryHeader";
import { EmptyGalleryState } from "@/components/monsterGallery/galleryHelperComponents/EmptyGalleryState";
import { GalleryGrid } from "@/components/monsterGallery/GalleryGrid";
import { GalleryPagination } from "@/components/monsterGallery/GalleryPagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSelector } from "@/lib/store/hooks";
import { ImageOff } from "lucide-react";

/**Max monsters to show on one page (pagination) */
const NUM_MONSTERS_PER_PAGE = 20;

function clampPage(page: number, totalPages: number) {
	return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

/**
 * Displays the user's saved monster collection from Redux auth state.
 */
export default function GalleryPage() {
	const authState = useAppSelector((state) => state.auth);
	const monsters =
		authState.status === "authenticated" ? authState.user.monsters : [];
	const hasMonsters = monsters.length > 0;
	const imagelessCount = monsters.filter((m) => m.image === null).length;

	// Pagination stuff
	const [currentPage, setCurrentPage] = useState(1);
	const totalNumPages = Math.ceil(monsters.length / NUM_MONSTERS_PER_PAGE);
	const currentlyVisiblePage = clampPage(currentPage, totalNumPages);
	/**The current set of visible monsters */
	const paginatedMonsters = monsters.slice(
		(currentlyVisiblePage - 1) * NUM_MONSTERS_PER_PAGE,
		currentlyVisiblePage * NUM_MONSTERS_PER_PAGE,
	);

	/**When user clicks another page number in the pagination */
	function handlePageChange(nextPage: number) {
		setCurrentPage(clampPage(nextPage, totalNumPages));
	}

	return (
		<PageContainer size="marketing">
			<main>
				<section aria-labelledby="gallery-title">
					{/* ── Header ──────────────────────────────────────────────────── */}
					<GalleryHeader />

					{/* ── Imageless monsters banner ────────────────────────────────── */}
					{imagelessCount > 0 && (
						<Alert className="mt-6">
							<ImageOff aria-hidden="true" />
							<AlertTitle>
								{imagelessCount}{" "}
								{imagelessCount === 1 ? "monster needs" : "monsters need"} an
								image
							</AlertTitle>
							<AlertDescription>
								Click &quot;View&quot; on a monster to retry image generation.
							</AlertDescription>
						</Alert>
					)}

					{/* ── Summary strip (visible once the user has monsters) ──────── */}
					{hasMonsters && (
						<Card className="mt-6">
							<CardContent className="flex flex-wrap gap-x-6 gap-y-1 py-3 text-sm text-muted-foreground">
								<span>
									<strong className="text-foreground">{monsters.length}</strong>{" "}
									{monsters.length === 1 ? "monster" : "monsters"} saved
								</span>
								<span>
									Showing page {currentlyVisiblePage} of {totalNumPages}
								</span>
							</CardContent>
						</Card>
					)}

					{/* ── Grid / empty state ──────────────────────────────────────── */}
					<div className="mt-10">
						{hasMonsters ? (
							<>
								{/* Pagination UI goes at top and bottom of page for convenience */}
								<GalleryPagination
									currentPage={currentlyVisiblePage}
									totalPages={totalNumPages}
									onPageChange={handlePageChange}
								/>
								<GalleryGrid monsters={paginatedMonsters} />

								<GalleryPagination
									currentPage={currentlyVisiblePage}
									totalPages={totalNumPages}
									onPageChange={handlePageChange}
								/>
							</>
						) : (
							<EmptyGalleryState />
						)}
					</div>
				</section>
			</main>
		</PageContainer>
	);
}
