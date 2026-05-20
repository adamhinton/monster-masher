// _______________
// Full dossier view for a single monster on the detail page at /gallery/[monsterID].
// Assumes the monster has already been looked up from Redux state — rendering
// decisions (loading, not-found, etc.) stay in page.tsx.
//
// Desktop layout: two-column grid — large image left, dossier panel right.
// Mobile layout:  single column — image first, then name/badges/flavor/traits/actions.
//
// TODO (stretch): Full editing is currently disabled. The only supported edit
// flow is retrying image generation for imageless monsters (see retry UI below).
// When editing is revisited, ensure the image is regenerated or explicitly
// left unchanged so the one-image-per-monster design is preserved.
//
// Used by: src/app/gallery/[monsterID]/page.tsx
// _______________

"use client";

import { useState } from "react";
import {
	AlertCircle,
	ArrowLeft,
	ImageOff,
	LoaderCircle,
	RefreshCw,
} from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/PageContainer";
import { MonsterImageFrame } from "@/components/monsterGallery/monsterCard/helperComponents/MonsterImageFrame";
import { MonsterTraitList } from "@/components/monsterGallery/monsterCard/helperComponents/MonsterTraitList";
import { DeleteMonsterDialog } from "@/components/monsterGallery/monsterCard/DeleteMonsterDialog";
import { PfpDownloadButton } from "@/components/monsterGallery/monsterCard/helperComponents/PfpDownloadButton";
import { ProgressBar } from "@/components/ProgressBar";
import { MonsterSpecimenMetaCard } from "./MonsterSpecimenMetaCard";
import {
	MonsterSchema,
	type Monster,
} from "@/lib/api/schemas/monster/MonsterSchema";
import { useAppDispatch } from "@/lib/store/hooks";
import {
	monsterImageCleared,
	monsterUpdated,
} from "../../../../store/authSlice";
import { nextApiErrorSchema } from "@/lib/api/errors";
import { monsterFormSchema } from "@/components/monsterGeneration/monsterFormSchema";
import { generateImageSuccessSchema } from "@/lib/api/schemas/monster/GenerateImageResponseSchema";

interface MonsterDetailViewProps {
	monster: Monster;
}

type RetryState =
	| { status: "idle" }
	| { status: "running" }
	| { status: "succeeded" }
	| { status: "failed"; message: string };

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

	const dispatch = useAppDispatch();
	const [retryState, setRetryState] = useState<RetryState>({ status: "idle" });

	async function handleRetryGeneration() {
		setRetryState({ status: "running" });
		dispatch(monsterImageCleared(monster.id));

		try {
			// Build a minimal form-values payload from the existing monster traits.
			// The generate-image route expects the same monsterFormSchema shape.
			const formPayload = monsterFormSchema.parse({
				display_name: monster.display_name,
				element: monster.traits.element,
				habitat: monster.traits.habitat,
				personality: monster.traits.personality,
				color_palette: monster.traits.color_palette,
				flavor_text: monster.flavor_text ?? "",
				should_email_when_done: false,
			});

			const res = await fetch(`/api/monsters/${monster.id}/generate-image`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formPayload),
			});

			const raw: unknown = await res.json();

			if (!res.ok) {
				const parsedError = nextApiErrorSchema.safeParse(raw);
				const message = parsedError.success
					? parsedError.data.error.message
					: "Image generation failed. Please try again.";
				setRetryState({ status: "failed", message });
				return;
			}

			const parsed = generateImageSuccessSchema.safeParse(raw);
			if (!parsed.success) {
				setRetryState({
					status: "failed",
					message: "Unexpected response from server. Please try again.",
				});
				return;
			}

			// Refetch the updated monster from Django to get the new MonsterImage id/metadata.
			try {
				const monsterRes = await fetch(`/api/monsters/${monster.id}`);
				if (monsterRes.ok) {
					const monsterRaw: unknown = await monsterRes.json();
					const monsterParsed = MonsterSchema.safeParse(
						typeof monsterRaw === "object" &&
							monsterRaw !== null &&
							"monster" in monsterRaw
							? monsterRaw.monster
							: undefined,
					);
					if (monsterParsed.success) {
						dispatch(monsterUpdated(monsterParsed.data));
					}
				}
			} catch {
				// Non-fatal: image was generated, just the refetch failed
			}

			setRetryState({ status: "succeeded" });
		} catch {
			setRetryState({
				status: "failed",
				message: "Network error. Check your connection and try again.",
			});
		}
	}

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
						{/* ── Image + retry UI ───────────────────────────────── */}
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

							{/* Retry section — shown when imageless, or whenever a retry is in progress/done */}
							{(monster.image === null || retryState.status !== "idle") && (
								<div className="mt-4 grid gap-3">
									{retryState.status === "idle" && (
										<Alert>
											<ImageOff aria-hidden="true" />
											<AlertTitle>Image not generated</AlertTitle>
											<AlertDescription className="grid gap-3">
												<p>
													The image for this monster wasn’t generated. You can
													retry using the same traits.
												</p>
												<Button
													size="sm"
													type="button"
													onClick={() => void handleRetryGeneration()}
												>
													<RefreshCw aria-hidden="true" />
													Generate image
												</Button>
											</AlertDescription>
										</Alert>
									)}
									{retryState.status === "running" && (
										<Alert>
											<LoaderCircle
												className="animate-spin"
												aria-hidden="true"
											/>
											<AlertTitle>Generating image…</AlertTitle>
											<AlertDescription className="grid gap-3">
												<p className="text-sm text-muted-foreground">
													This usually takes about 90 seconds.
												</p>
												<ProgressBar durationMs={85_000} />
											</AlertDescription>
										</Alert>
									)}
									{retryState.status === "succeeded" && (
										<Alert>
											<AlertTitle>Image generated!</AlertTitle>
											<AlertDescription>
												The page will update momentarily.
											</AlertDescription>
										</Alert>
									)}
									{retryState.status === "failed" && (
										<Alert variant="destructive">
											<AlertCircle aria-hidden="true" />
											<AlertTitle>Generation failed</AlertTitle>
											<AlertDescription className="grid gap-3">
												<p>{retryState.message}</p>
												<Button
													size="sm"
													variant="outline"
													type="button"
													onClick={() => setRetryState({ status: "idle" })}
												>
													<RefreshCw aria-hidden="true" />
													Try again
												</Button>
											</AlertDescription>
										</Alert>
									)}
								</div>
							)}
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
									{/*
									 * TODO (stretch): Full editing is disabled. Editing is only
									 * supported for imageless monsters via the retry UI above.
									 */}

									{/* Download Picture */}
									<PfpDownloadButton monster={monster} variant="button" />

									<Button
										variant="secondary"
										size="sm"
										type="button"
										onClick={() => void handleRetryGeneration()}
										disabled={retryState.status === "running"}
									>
										<RefreshCw aria-hidden="true" />
										Regenerate image
									</Button>

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
