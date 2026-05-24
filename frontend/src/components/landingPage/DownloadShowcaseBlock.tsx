// _______________
// Download showcase block for the about/landing page.
//
// Purpose: make the "downloadable PNG portrait" output tangible before the
// gallery. Shows the three-stage flow:
//   Generated monster → Framed square portrait → Downloaded PNG
//
// Uses real example monster imagery. Download behavior for example monsters
// links to /create — do not overpromise real downloads from example data.
//
// Server Component — no interactivity needed.
// _______________

import Link from "next/link";
import { ChevronRight, Download, ImageIcon, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ExampleMonsterImage } from "@/components/landingPage/ExampleMonsterImage";
import { LandingPageBlock } from "@/components/landingPage/LandingPageBlock";
import {
	featuredExampleMonster,
	sampleDownloadMonsters,
} from "@/lib/landingPage/landingExampleData";

// ---------------------------------------------------------------------------
// Feature chips
// ---------------------------------------------------------------------------

const FEATURE_CHIPS = [
	"Square PNG export",
	"Profile-picture frame",
	"Works from generated result",
	"Works from saved monsters later",
] as const;

// ---------------------------------------------------------------------------
// Flow stage card
// ---------------------------------------------------------------------------

interface FlowStageProps {
	icon: React.ReactNode;
	label: string;
	description: string;
	visual: React.ReactNode;
}

function FlowStageCard({ icon, label, description, visual }: FlowStageProps) {
	return (
		<Card className="flex flex-1 flex-col items-center gap-4 p-6 text-center">
			<CardContent className="flex flex-col items-center gap-4 p-0">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
					{icon}
				</div>
				<div className="flex flex-col gap-1">
					<p className="text-sm font-semibold text-foreground">{label}</p>
					<p className="text-xs text-muted-foreground">{description}</p>
				</div>
				<div className="flex items-center justify-center">{visual}</div>
			</CardContent>
		</Card>
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Shows the "generated monster → portrait → PNG download" flow using real
 * example imagery. Feature chips reinforce what the output format is.
 * The CTA links to /create — example monsters are preview only.
 */
export function DownloadShowcaseBlock() {
	const showcase = sampleDownloadMonsters[0] ?? featuredExampleMonster;
	const filename = showcase.download_filename;

	return (
		<LandingPageBlock
			id="download-ready"
			eyebrow="Output"
			title="Download-ready portraits"
			description="Every monster is generated as a square portrait — ready to drop into Discord, Slack, LinkedIn, or anywhere you need a profile picture."
		>
			{/* ── Three-stage flow ──────────────────────────────────────── */}
			<ol
				aria-label="Portrait generation flow"
				className="flex flex-col gap-4 sm:flex-row sm:items-stretch"
			>
				{/* Stage 1: Monster generated */}
				<li className="flex flex-1 flex-col">
					<FlowStageCard
						icon={<Sparkles size={18} aria-hidden="true" />}
						label="Monster generated"
						description="Describe a creature and get a unique AI portrait"
						visual={
							<ExampleMonsterImage
								monster={showcase}
								variant="compact"
								className="rounded-2xl"
							/>
						}
					/>
				</li>

				{/* Arrow — visible on sm+ between stages */}
				<li aria-hidden="true" className="hidden items-center sm:flex">
					<ChevronRight
						size={20}
						className="shrink-0 text-muted-foreground/60"
					/>
				</li>

				{/* Stage 2: Framed portrait */}
				<li className="flex flex-1 flex-col">
					<FlowStageCard
						icon={<ImageIcon size={18} aria-hidden="true" />}
						label="Framed square portrait"
						description="Displayed in a polished square frame — perfect for profile pictures"
						visual={
							<ExampleMonsterImage
								monster={sampleDownloadMonsters[1] ?? showcase}
								variant="compact"
								className="rounded-2xl"
							/>
						}
					/>
				</li>

				{/* Arrow */}
				<li aria-hidden="true" className="hidden items-center sm:flex">
					<ChevronRight
						size={20}
						className="shrink-0 text-muted-foreground/60"
					/>
				</li>

				{/* Stage 3: Downloaded PNG */}
				<li className="flex flex-1 flex-col">
					<FlowStageCard
						icon={<Download size={18} aria-hidden="true" />}
						label="Downloaded PNG"
						description="Save it to your device with one click — or create your own"
						visual={
							/* File card mockup */
							<div className="flex w-full max-w-40 items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2.5">
								<Download
									size={14}
									className="shrink-0 text-primary"
									aria-hidden="true"
								/>
								<span className="truncate text-xs font-medium text-foreground">
									{filename}
								</span>
							</div>
						}
					/>
				</li>
			</ol>

			{/* ── Feature chips ─────────────────────────────────────────── */}
			<ul aria-label="Download features" className="flex flex-wrap gap-2">
				{FEATURE_CHIPS.map((chip) => (
					<li key={chip}>
						<Badge variant="outline">{chip}</Badge>
					</li>
				))}
			</ul>

			{/* ── CTA ───────────────────────────────────────────────────── */}
			<div>
				<Link href="/create" className={buttonVariants({ size: "lg" })}>
					<Sparkles aria-hidden="true" className="size-4" />
					Create my monster
				</Link>
			</div>
		</LandingPageBlock>
	);
}
