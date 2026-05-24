// ____________
// About / landing page — the recruiter-facing entry point for Monster Masher.
//
// Core hook: Your next profile picture should have fangs.
//
// Block order (each has a stable anchor id for the page guide):
//   #download-ready   — download showcase: portraits as PNGs
//   #how-it-works     — four-step process
//   #sample-downloads — three example monsters
//   #example-gallery  — gallery teaser linking to /gallery/example
//   #tech-stack       — credibility badges
//   #try-it           — final CTA to /create
//
// Server Component by default. Client interactivity is scoped to
// ExampleMonsterImage (Sentry image error reporting).
// ____________

import { PageContainer } from "@/components/layout/PageContainer";
import { LandingHero } from "@/components/landingPage/LandingHero";
import { TableOfContents } from "@/components/landingPage/TableOfContents";
import { DownloadShowcaseBlock } from "@/components/landingPage/DownloadShowcaseBlock";
import { HowItWorksBlock } from "@/components/landingPage/HowItWorksBlock";
import { SampleDownloadsBlock } from "@/components/landingPage/SampleDownloadsBlock";
import { GalleryTeaserBlock } from "@/components/landingPage/GalleryTeaserBlock";
import { TechStackBadgeBlock } from "@/components/landingPage/TechStackBadgeBlock";
import { FinalCtaBlock } from "@/components/landingPage/FinalCtaBlock";

export default function AboutPage() {
	return (
		<PageContainer size="marketing">
			<main className="flex flex-col gap-24 py-8 sm:py-16">
				{/* ── Hero ──────────────────────────────────────────────────── */}
				<LandingHero />

				{/* ── Page guide ────────────────────────────────────────────── */}
				<TableOfContents />

				{/* ── Download showcase ─────────────────────────────────────── */}
				<DownloadShowcaseBlock />

				{/* ── How it works ──────────────────────────────────────────── */}
				<HowItWorksBlock />

				{/* ── Sample downloads ──────────────────────────────────────── */}
				<SampleDownloadsBlock />

				{/* ── Gallery teaser ────────────────────────────────────────── */}
				<GalleryTeaserBlock />

				{/* ── Tech stack ────────────────────────────────────────────── */}
				<TechStackBadgeBlock />

				{/* ── Final CTA ─────────────────────────────────────────────── */}
				<FinalCtaBlock />
			</main>
		</PageContainer>
	);
}
