// ______________
// Gallery page — the user's personal creature collection.
// Reads saved monsters directly from Redux auth state.
// ______________

"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { GalleryHeader } from "@/components/monsterGallery/galleryHelperComponents/GalleryHeader";
import { EmptyGalleryState } from "@/components/monsterGallery/galleryHelperComponents/EmptyGalleryState";
import { GalleryGrid } from "@/components/monsterGallery/GalleryGrid";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSelector } from "@/lib/store/hooks";

/**
 * Displays the user's saved monster collection from Redux auth state.
 */
export default function GalleryPage() {
	const authState = useAppSelector((state) => state.auth);
	const monsters =
		authState.status === "authenticated" ? authState.user.monsters : [];
	const hasMonsters = monsters.length > 0;

	return (
		<PageContainer size="marketing">
			<main>
				<section aria-labelledby="gallery-title">
					{/* ── Header ──────────────────────────────────────────────────── */}
					<GalleryHeader />

					{/* ── Summary strip (visible once the user has monsters) ──────── */}
					{hasMonsters && (
						<Card className="mt-6">
							<CardContent className="flex flex-wrap gap-x-6 gap-y-1 py-3 text-sm text-muted-foreground">
								<span>
									<strong className="text-foreground">{monsters.length}</strong>{" "}
									{monsters.length === 1 ? "monster" : "monsters"} saved
								</span>
								<span>Showing page 1 of 1</span>
								<span>Images immutable · details editable</span>
							</CardContent>
						</Card>
					)}

					{/* ── Grid / empty state ──────────────────────────────────────── */}
					<div className="mt-10">
						{hasMonsters ? (
							<GalleryGrid monsters={monsters} />
						) : (
							<EmptyGalleryState />
						)}
					</div>
				</section>
			</main>
		</PageContainer>
	);
}

