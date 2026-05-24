// _______________
// Sample downloads block for the about/landing page.
//
// Shows the first three example monsters as preview cards.
// Each card links to /gallery/example/[id] for the full portrait detail.
//
// MonsterCard is NOT reused here: it requires the full Monster type
// (including created_at), uses redux-backed delete actions, and links to
// /gallery/[id] rather than /gallery/example/[id]. A lightweight local
// ExampleMonsterCard is used instead to avoid all of that coupling.
//
// Server Component — ExampleMonsterImage is the "use client" boundary.
// _______________

import Link from "next/link";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ExampleMonsterImage } from "@/components/landingPage/ExampleMonsterImage";
import { LandingPageBlock } from "@/components/landingPage/LandingPageBlock";
import {
	sampleDownloadMonsters,
	type LandingExampleMonster,
} from "@/lib/landingPage/landingExampleData";

// ---------------------------------------------------------------------------
// Local card component
// ---------------------------------------------------------------------------

interface ExampleMonsterCardProps {
	monster: LandingExampleMonster;
}

/**
 * Compact landing preview card for a single example monster.
 * Links to the example detail page, not the real authenticated gallery.
 */
function ExampleMonsterCard({ monster }: ExampleMonsterCardProps) {
	return (
		<article aria-labelledby={`sample-${monster.id}`}>
			<Card className="flex h-full flex-col overflow-hidden">
				{/* Monster portrait */}
				<div className="flex items-center justify-center bg-muted/30 py-6">
					<ExampleMonsterImage monster={monster} variant="card" />
				</div>

				<CardContent className="flex flex-1 flex-col gap-3 p-4">
					{/* Name */}
					<h3
						id={`sample-${monster.id}`}
						className="truncate text-base font-semibold text-card-foreground"
					>
						{monster.display_name}
					</h3>

					{/* Element badge */}
					<Badge variant="secondary" className="w-fit">
						{monster.traits.element}
					</Badge>

					{/* Tagline */}
					<p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
						{monster.tagline}
					</p>

					{/* Download filename hint */}
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<Download size={12} aria-hidden="true" className="shrink-0" />
						<span className="truncate">{monster.download_filename}</span>
					</div>
				</CardContent>

				<CardFooter className="p-4 pt-0">
					<Link
						href={`/gallery/example/${monster.id}`}
						className={buttonVariants({
							variant: "outline",
							size: "sm",
							className: "w-full",
						})}
					>
						See full portrait
					</Link>
				</CardFooter>
			</Card>
		</article>
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Showcases the first three example monsters as preview cards.
 * Gives visitors something tangible to evaluate before clicking through.
 */
export function SampleDownloadsBlock() {
	return (
		<LandingPageBlock
			id="sample-downloads"
			eyebrow="Examples"
			title="Sample downloads"
			description="These are real results from Monster Masher. Click any portrait to see the full specimen."
		>
			<ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
				{sampleDownloadMonsters.map((monster) => (
					<li key={monster.id}>
						<ExampleMonsterCard monster={monster} />
					</li>
				))}
			</ul>
		</LandingPageBlock>
	);
}
