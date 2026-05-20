"use client";

import {
	AlertCircle,
	CheckCircle2,
	LoaderCircle,
	LogIn,
	RotateCcw,
	Save,
} from "lucide-react";
import Link from "next/link";

import { ProgressBar } from "@/components/ProgressBar";
import { MonsterImageFrame } from "@/components/monsterGallery/monsterCard/helperComponents/MonsterImageFrame";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import type { GenerationUIState } from "@/lib/monsterGeneration/generationState";
import { useAppSelector } from "@/lib/store/hooks";

interface GenerationStatusPanelProps {
	generationState: GenerationUIState;
	onReset: () => void;
	onSave: () => void;
	isSaving: boolean;
}

/**Status showing ongoing monster generation */
export function GenerationStatusPanel({
	generationState,
	onReset,
	onSave,
	isSaving,
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
								<span>Save your monster to your gallery.</span>
								<Button
									type="button"
									size="sm"
									onClick={onSave}
									disabled={isSaving}
								>
									{isSaving ? (
										<LoaderCircle className="animate-spin" aria-hidden="true" />
									) : (
										<Save aria-hidden="true" />
									)}
									{isSaving ? "Saving…" : "Save to gallery"}
								</Button>
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
							// Auth state still loading — show disabled save button
							<Button type="button" size="sm" disabled>
								<LoaderCircle className="animate-spin" aria-hidden="true" />
								Save to gallery
							</Button>
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
						<Button type="button" variant="outline" size="sm" onClick={onReset}>
							<RotateCcw aria-hidden="true" />
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			);
		case "blocked":
			return (
				<Alert>
					<AlertCircle aria-hidden="true" />
					<AlertTitle>Prompt needs a softer touch</AlertTitle>
					<AlertDescription className="grid gap-3">
						<span>
							Your prompt was not allowed. Try a friendly monster concept with
							safe traits and non-graphic details.
						</span>
						<span>{generationState.safeErrorMessage}</span>
						<Button type="button" variant="outline" size="sm" onClick={onReset}>
							<RotateCcw aria-hidden="true" />
							Edit prompt
						</Button>
					</AlertDescription>
				</Alert>
			);
	}
}
