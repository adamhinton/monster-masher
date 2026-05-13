import {
	AlertCircle,
	CheckCircle2,
	LoaderCircle,
	RotateCcw,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GenerationUIState } from "@/lib/monsterGeneration/generationState";

interface GenerationStatusPanelProps {
	generationState: GenerationUIState;
	onReset: () => void;
}

/**Status showing ongoing monster generation */
export function GenerationStatusPanel({
	generationState,
	onReset,
}: GenerationStatusPanelProps) {
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
						Image generation can take up to a minute. Keep this tab open while
						your monster is being generated.
					</p>
				</div>
			);
		case "succeeded":
			return (
				<Alert>
					<CheckCircle2 aria-hidden="true" />
					<AlertTitle>Fake generation complete</AlertTitle>
					<AlertDescription className="grid gap-3">
						<span>
							The local generation flow completed. Real image display will come
							later when the provider flow is wired in.
						</span>
						<Button type="button" variant="outline" size="sm" onClick={onReset}>
							<RotateCcw aria-hidden="true" />
							Create another
						</Button>
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
