// ____________
// About / landing page — the recruiter-facing entry point for Monster Masher.
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
			<main className="flex flex-col gap-24 py-2 sm:py-2">
				{/* ── Hero ──────────────────────────────────────────────────── */}
				<section aria-label="Introduction" className="flex flex-col gap-6">
					<LandingHero />

					<aside
						aria-label="Pricing"
						className="rounded-2xl border border-border/60 bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm"
					>
						<strong className="font-semibold text-foreground">
							100% free.
						</strong>{" "}
						Create, save, and download monsters without subscriptions, paid
						tiers, or checkout.
					</aside>
				</section>

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
