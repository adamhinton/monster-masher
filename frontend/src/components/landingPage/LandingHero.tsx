// _______________
// Landing page hero — the first thing visitors see on /about.
//
// Left column (lg+): headline, subheadline, two CTA buttons.
// Right column (lg+): featured monster portrait + download hint + feature badges.
// Mobile: stacked, copy first then visual.
//
// Server Component — ExampleMonsterImage is a "use client" child that holds
// its own client boundary. No need to promote this whole component.
// _______________

import Link from "next/link";
import { Download, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ExampleMonsterImage } from "@/components/landingPage/ExampleMonsterImage";
import { featuredExampleMonster } from "@/lib/landingPage/landingExampleData";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full-bleed hero section for the about/landing page.
 * Sells the core concept: describe a creature → get a portrait → download it.
 */
export function LandingHero() {
	return (
		<header
			aria-labelledby="hero-heading"
			className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16"
		>
			{/* ── Copy ──────────────────────────────────────────────────── */}
			<div className="flex flex-col gap-6 lg:max-w-xl">
				<div className="flex flex-col gap-4">
					<h1
						id="hero-heading"
						className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl"
					>
						Your next profile picture
						<br className="hidden sm:block" /> should have fangs.
					</h1>
					<p className="max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">
						Describe a weird little creature, generate an original monster
						portrait, then download it as a share-ready image or save your
						favorites for later.
					</p>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row">
					<Link href="/create" className={buttonVariants({ size: "lg" })}>
						<Sparkles aria-hidden="true" className="size-4" />
						Try it yourself
					</Link>
					<Link
						href="/gallery/example"
						className={buttonVariants({ variant: "outline", size: "lg" })}
					>
						See example gallery
					</Link>
				</div>
			</div>

			{/* ── Hero visual ───────────────────────────────────────────── */}
			<div
				className="flex shrink-0 flex-col items-center gap-4 sm:items-start lg:items-center"
				aria-hidden="true"
			>
				{/* Monster portrait */}
				<ExampleMonsterImage monster={featuredExampleMonster} variant="card" />

				{/* Download filename hint */}
				<div className="flex w-full max-w-60 items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 shadow-sm">
					<Download
						size={14}
						className="shrink-0 text-muted-foreground"
						aria-hidden="true"
					/>
					<span className="truncate text-xs font-medium text-foreground">
						{featuredExampleMonster.download_filename}
					</span>
				</div>

				{/* Feature badges */}
				<div className="flex flex-wrap gap-1.5">
					<Badge variant="secondary">PNG</Badge>
					<Badge variant="secondary">Profile-ready</Badge>
					<Badge variant="secondary">Save favorite</Badge>
				</div>
			</div>
		</header>
	);
}
