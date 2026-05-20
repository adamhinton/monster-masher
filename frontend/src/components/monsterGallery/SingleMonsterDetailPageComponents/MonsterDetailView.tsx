// _______________
// Full dossier view for a single monster on the detail page at /gallery/[monsterID].
// Assumes the monster has already been looked up from Redux state — rendering
// decisions (loading, not-found, etc.) stay in page.tsx.
//
// Desktop layout: two-column grid — large image left, dossier panel right.
// Mobile layout:  single column — image first, then name/badges/flavor/traits/actions.
//
// Used by: src/app/gallery/[monsterID]/page.tsx
// _______________

"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/PageContainer";
import { MonsterImageFrame } from "@/components/monsterGallery/monsterCard/helperComponents/MonsterImageFrame";
import { MonsterTraitList } from "@/components/monsterGallery/monsterCard/helperComponents/MonsterTraitList";
import { DeleteMonsterDialog } from "@/components/monsterGallery/monsterCard/DeleteMonsterDialog";
import { PfpDownloadButton } from "@/components/monsterGallery/monsterCard/helperComponents/PfpDownloadButton";
import { MonsterSpecimenMetaCard } from "./MonsterSpecimenMetaCard";
import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";

interface MonsterDetailViewProps {
	monster: Monster;
}

/**
 * Renders the full specimen dossier for a single monster.
 * Receives a validated Monster object directly — no data fetching here.
 */
export function MonsterDetailView({ monster }: MonsterDetailViewProps) {
	const titleId = "monster-title";
	const imageHeadingId = "monster-image-heading";
	const traitsHeadingId = "monster-traits-heading";
	const actionsHeadingId = "monster-actions-heading";

	const altText = `${monster.traits.element} monster named ${monster.display_name}`;

	return (
		<PageContainer size="detail">
			{/* Back link */}
			<nav aria-label="Breadcrumb" className="mb-6">
				<Link
					href="/gallery"
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					<ArrowLeft aria-hidden="true" size={14} />
					Back to gallery
				</Link>
			</nav>

			<main>
				<article aria-labelledby={titleId}>
					<div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[480px_1fr]">
						{/* ── Image ──────────────────────────────────────────────── */}
						<section aria-labelledby={imageHeadingId}>
							<h2 id={imageHeadingId} className="sr-only">
								Monster image
							</h2>
							<MonsterImageFrame
								image={monster.image}
								variant="detail"
								altText={altText}
								className="mx-auto w-full max-w-120"
							/>
						</section>

						{/* ── Dossier panel ──────────────────────────────────────── */}
						<div className="flex flex-col gap-6">
							{/* Name + badges */}
							<header className="flex flex-col gap-3">
								<h1
									id={titleId}
									className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
								>
									{monster.display_name}
								</h1>
								<div className="flex flex-wrap gap-2">
									<Badge variant="secondary">{monster.traits.element}</Badge>
									<Badge variant="outline">{monster.traits.habitat}</Badge>
									<Badge variant="outline">{monster.traits.personality}</Badge>
								</div>
							</header>

							{/* Flavor text / fallback */}
							{monster.flavor_text ? (
								<p className="text-sm italic leading-relaxed text-muted-foreground">
									&ldquo;{monster.flavor_text}&rdquo;
								</p>
							) : (
								<p className="text-sm italic text-muted-foreground/50">
									No lore recorded for this specimen.
								</p>
							)}

							{/* Traits card */}
							<Card>
								<CardHeader className="pb-2">
									<h2
										id={traitsHeadingId}
										className="text-sm font-semibold uppercase tracking-widest text-muted-foreground"
									>
										Traits
									</h2>
								</CardHeader>
								<CardContent className="pt-0">
									<section aria-labelledby={traitsHeadingId}>
										<MonsterTraitList traits={monster.traits} />
									</section>
								</CardContent>
							</Card>

							{/* Specimen metadata */}
							<MonsterSpecimenMetaCard monster={monster} />

							{/* Actions */}
							<section aria-labelledby={actionsHeadingId}>
								<h2
									id={actionsHeadingId}
									className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground"
								>
									Actions
								</h2>
								<div className="flex flex-wrap gap-3">
									{/* Edit — dialog built in Step 15 */}
									<Button variant="secondary" size="sm" disabled>
										<Pencil aria-hidden="true" />
										Edit details
									</Button>

									{/* Download Picture */}
									<PfpDownloadButton monster={monster} variant="button" />

									<DeleteMonsterDialog
										monsterId={monster.id}
										monsterName={monster.display_name}
									/>
								</div>
							</section>
						</div>
					</div>
				</article>
			</main>
		</PageContainer>
	);
}
