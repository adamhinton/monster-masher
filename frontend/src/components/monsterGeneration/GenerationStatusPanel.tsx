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

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
			return (
				<div className="grid gap-3">
					<Badge variant="secondary" className="w-fit">
						Fake mode
					</Badge>
					<p className="text-sm text-muted-foreground">
						No real provider call yet. Submit the form to exercise the local UI
						flow.
					</p>
				</div>
			);
		case "running":
			return (
				<div className="flex items-start gap-3 text-sm text-muted-foreground">
					<LoaderCircle
						className="mt-0.5 size-4 animate-spin text-primary"
						aria-hidden="true"
					/>
					<p>
						{/* TODO(image-gen-durable-jobs): once generation is durable across page leave/reload, replace this copy with the "you can leave this page and we can email you" variant and align the toggle helper text. */}
						Image generation can take up to a minute. Keep this tab open while
						your monster is being generated.
					</p>
				</div>
			);
		case "succeeded":
			return (
				<Alert>
					<CheckCircle2 aria-hidden="true" />
					<AlertTitle>Monster ready</AlertTitle>
					<AlertDescription className="grid gap-3">
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
