// _______________
// How it works block for the about/landing page.
//
// Shows the four-step process as polished cards:
//   1. Describe the creature
//   2. Generate the monster
//   3. Download the portrait
//   4. Save your favorites
//
// Uses LandingPageBlock for consistent section structure.
// Server Component — no interactivity needed.
// _______________

import {
	BookMarked,
	Download,
	PenLine,
	Sparkles,
	type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { LandingPageBlock } from "@/components/landingPage/LandingPageBlock";

// ---------------------------------------------------------------------------
// Steps data
// ---------------------------------------------------------------------------

interface Step {
	number: 1 | 2 | 3 | 4;
	icon: LucideIcon;
	title: string;
	copy: string;
}

const STEPS: Step[] = [
	{
		number: 1,
		icon: PenLine,
		title: "Describe the creature",
		copy: "Pick a few traits — element, habitat, personality — and give your monster a name.",
	},
	{
		number: 2,
		icon: Sparkles,
		title: "Generate the monster",
		copy: "Our AI paints an original portrait just for you. Every result is unique.",
	},
	{
		number: 3,
		icon: Download,
		title: "Download the portrait",
		copy: "Save the square PNG to your device. Drop it straight into Discord, Slack, or LinkedIn.",
	},
	{
		number: 4,
		icon: BookMarked,
		title: "Save your favorites",
		copy: "Revisit your creations any time from your personal gallery and download again whenever you need them.",
	},
];

// ---------------------------------------------------------------------------
// Step card
// ---------------------------------------------------------------------------

interface StepCardProps {
	step: Step;
}

function StepCard({ step }: StepCardProps) {
	const Icon = step.icon;
	return (
		<Card className="flex flex-col gap-4 p-6">
			<CardContent className="flex flex-col gap-3 p-0">
				<div className="flex items-center gap-3">
					<span
						aria-hidden="true"
						className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
					>
						{step.number}
					</span>
					<Icon
						size={18}
						aria-hidden="true"
						className="shrink-0 text-muted-foreground"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<p className="font-semibold text-foreground">{step.title}</p>
					<p className="text-sm leading-relaxed text-muted-foreground">
						{step.copy}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Four-step process block for the about/landing page.
 * Explains the core creation loop: describe → generate → download → save.
 */
export function HowItWorksBlock() {
	return (
		<LandingPageBlock
			id="how-it-works"
			eyebrow="Process"
			title="How it works"
			description="From a few traits to a downloadable monster portrait in minutes."
		>
			<ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{STEPS.map((step) => (
					<li key={step.number}>
						<StepCard step={step} />
					</li>
				))}
			</ol>
		</LandingPageBlock>
	);
}
