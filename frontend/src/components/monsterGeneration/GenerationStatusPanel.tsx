"use client";

import {
	AlertCircle,
	CheckCircle2,
	LoaderCircle,
	LogIn,
	RefreshCw,
} from "lucide-react";
import Link from "next/link";

import { ProgressBar } from "@/components/ProgressBar";
import { MonsterImageFrame } from "@/components/monsterGallery/monsterCard/helperComponents/MonsterImageFrame";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import type { GenerationUIState } from "@/lib/monsterGeneration/generationState";
import { useAppSelector } from "@/lib/store/hooks";
import type { ImageGensRemaining } from "@/app/api/me/image-gens-remaining/route";

interface GenerationStatusPanelProps {
	generationState: GenerationUIState;
	onReset: () => void;
	/**How many image generations the user has left today */
	imageGensRemaining?: ImageGensRemaining | null;
}

/**Status showing ongoing monster generation */
export function GenerationStatusPanel({
	generationState,
	onReset,
	imageGensRemaining,
}: GenerationStatusPanelProps) {
	const authState = useAppSelector((state) => state.auth);

	switch (generationState.status) {
		case "idle":
			// Hidden until the user starts generation — prevents layout shift on page load.
			return null;
		case "running":
			return (
				<div className="grid gap-4">
					<div className="flex items-start gap-3 text-sm text-muted-foreground">
						<LoaderCircle
							className="mt-0.5 size-4 animate-spin text-primary"
							aria-hidden="true"
						/>
						<p>
							You can leave this page and come back later; we will save your
							monster for you. The image should be ready in about 90 seconds.
						</p>
					</div>
					<ProgressBar durationMs={85_000} />
				</div>
			);
		case "succeeded":
			return (
				<Alert>
					<CheckCircle2 aria-hidden="true" />
					<AlertTitle>Monster ready</AlertTitle>
					<AlertDescription className="grid gap-4">
						{generationState.generatedImage !== null && (
							<MonsterImageFrame
								image={generationState.generatedImage}
								variant="card"
								altText="Generated monster image"
							/>
						)}
						{authState.status === "authenticated" ? (
							<>
								<span>Your monster has been saved to your gallery.</span>
								{imageGensRemaining != null && (
									<span className="text-muted-foreground text-xs">
										{imageGensRemaining.num_remaining} of{" "}
										{imageGensRemaining.max_per_day} generations remaining today
									</span>
								)}
								<div className="flex flex-wrap gap-2">
									<Button variant="outline" size="sm" onClick={onReset}>
										<RefreshCw aria-hidden="true" />
										Generate another
									</Button>
									<Link
										href="/gallery"
										className={buttonVariants({
											variant: "default",
											size: "sm",
										})}
									>
										View in gallery →
									</Link>
								</div>
							</>
						) : authState.status === "anonymous" ? (
							<>
								<span>Sign in to save your monster to your gallery.</span>
								<Link
									href="/auth"
									className={buttonVariants({ variant: "outline", size: "sm" })}
								>
									<LogIn aria-hidden="true" />
									Sign in to save
								</Link>
							</>
						) : (
							// Auth state still loading
							<span className="text-muted-foreground text-sm">
								<LoaderCircle
									className="inline animate-spin mr-1"
									aria-hidden="true"
								/>
								Checking session…
							</span>
						)}
					</AlertDescription>
				</Alert>
			);
		case "failed":
			return (
				<Alert variant="destructive">
					<AlertCircle aria-hidden="true" />
					<AlertTitle>Generation failed</AlertTitle>
					<AlertDescription className="grid gap-3">
						<span>{generationState.safeErrorMessage}</span>
						<Link
							href="#"
							className={buttonVariants({ variant: "outline", size: "sm" })}
							onClick={(e) => {
								e.preventDefault();
								onReset();
							}}
						>
							Try again
						</Link>
					</AlertDescription>
				</Alert>
			);
		case "blocked":
			return (
				<Alert variant="destructive">
					<AlertCircle aria-hidden="true" />
					<AlertTitle>Prompt blocked by content policy</AlertTitle>
					<AlertDescription className="grid gap-3">
						<p>
							Your description was blocked by our content moderation. Try
							editing it to remove graphic, excessively violent, or otherwise
							problematic content.
						</p>
						<Link
							href="#"
							className={buttonVariants({ variant: "outline", size: "sm" })}
							onClick={(e) => {
								e.preventDefault();
								onReset();
							}}
						>
							Edit prompt
						</Link>
					</AlertDescription>
				</Alert>
			);
	}
}
