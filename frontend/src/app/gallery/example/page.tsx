// _______________
// Example gallery — static grid of six example monsters at /gallery/example.
//
// Public: no auth required. Uses static example data — no backend calls.
// Structured like /gallery but without pagination, deletion, or generation.
//
// Sub-components for the example-specific presentation live in:
//   src/components/landingPage/
// _______________

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { ExampleMonsterImage } from "@/components/landingPage/ExampleMonsterImage";
import { MonsterBadges } from "@/components/monsterGallery/monsterCard/helperComponents/MonsterBadges";
import { exampleGalleryMonsters } from "@/lib/landingPage/landingExampleData";

export const metadata = {
	title: "Example Monsters — Monster Masher",
	description:
		"Browse six example Monster Masher portraits to see what the generator can create.",
};

export default function ExampleGalleryPage() {
	return (
		<PageContainer size="marketing">
			<main>
				{/* ── Header ──────────────────────────────────────────────────── */}
				<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div className="flex flex-col gap-2">
						<Link
							href="/about"
							className={buttonVariants({
								variant: "ghost",
								size: "sm",
								className: "mb-1 w-fit",
							})}
						>
							<ArrowLeft aria-hidden="true" className="size-4" />
							Back to about
						</Link>
						<h1
							id="example-gallery-title"
							className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
						>
							Example Monsters
						</h1>
						<p className="max-w-prose text-base text-muted-foreground">
							Six real Monster Masher portraits. Each one was created using the
							same generator you can try right now.
						</p>
					</div>
					<Link
						href="/create"
						className={buttonVariants({
							size: "lg",
							className: "shrink-0 self-start sm:self-auto",
						})}
					>
						<Sparkles aria-hidden="true" className="size-4" />
						Create my monster
					</Link>
				</header>

				{/* ── Monster grid ──────────────────────────────────────────── */}
				<section aria-labelledby="example-gallery-title" className="mt-10">
					<ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{exampleGalleryMonsters.map((monster) => (
							<li key={monster.id} className="flex justify-center">
								<article
									aria-labelledby={`example-monster-${monster.id}`}
									className="flex w-60 flex-col gap-3"
								>
									<Link
										href={`/gallery/example/${monster.id}`}
										className="block transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-3xl"
										aria-label={`View ${monster.display_name} detail`}
									>
										<ExampleMonsterImage monster={monster} variant="card" />
									</Link>

									<div className="flex flex-col gap-1.5 px-1">
										<h2
											id={`example-monster-${monster.id}`}
											className="text-base font-semibold text-foreground"
										>
											<Link
												href={`/gallery/example/${monster.id}`}
												className="hover:underline focus-visible:outline-none focus-visible:underline"
											>
												{monster.display_name}
											</Link>
										</h2>
										<MonsterBadges traits={monster.traits} variant="card" />
										{monster.tagline && (
											<p className="text-sm text-muted-foreground line-clamp-2">
												{monster.tagline}
											</p>
										)}
									</div>
								</article>
							</li>
						))}
					</ul>
				</section>

				{/* ── Bottom CTA ────────────────────────────────────────────── */}
				<aside
					className="mt-16 flex flex-col items-center gap-4 rounded-3xl border border-border/60 bg-card px-6 py-12 text-center"
					aria-label="Create your own monster"
				>
					<p className="text-lg font-semibold text-foreground">
						Like what you see?
					</p>
					<p className="max-w-sm text-sm text-muted-foreground">
						Your monster is waiting. Takes less than a minute to generate.
					</p>
					<Link href="/create" className={buttonVariants({ size: "lg" })}>
						<Sparkles aria-hidden="true" className="size-4" />
						Create my monster
					</Link>
				</aside>
			</main>
		</PageContainer>
	);
}
