// _______________
// Gallery teaser block for the about/landing page.
//
// Shows a compact grid of all six example monster portraits as a preview.
// Keeps the gallery pitch secondary — this is about saving and revisiting
// your own creations, not the gallery as a CRUD tool.
//
// Uses LandingPageBlock for consistent section structure.
// Server Component — ExampleMonsterImage is the "use client" boundary.
// _______________

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ExampleMonsterImage } from "@/components/landingPage/ExampleMonsterImage";
import { LandingPageBlock } from "@/components/landingPage/LandingPageBlock";
import { exampleGalleryMonsters } from "@/lib/landingPage/landingExampleData";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Teaser for the example gallery at /gallery/example.
 * Emphasises revisiting and saving favourites, not the gallery as a core feature.
 */
export function GalleryTeaserBlock() {
	return (
		<LandingPageBlock
			id="example-gallery"
			eyebrow="Gallery"
			title="Keep your favourites"
			description="Every monster you create is saved to your personal gallery. Revisit them any time, browse the collection, and download again whenever you need a fresh avatar."
		>
			{/* Compact portrait grid */}
			<ul
				aria-label="Example monster portraits"
				className="grid grid-cols-3 gap-3 sm:grid-cols-6"
			>
				{exampleGalleryMonsters.map((monster) => (
					<li key={monster.id}>
						<Link
							href={`/gallery/example/${monster.id}`}
							aria-label={monster.alt_text}
							className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							<ExampleMonsterImage
								monster={monster}
								variant="compact"
								className="transition-opacity hover:opacity-80"
							/>
						</Link>
					</li>
				))}
			</ul>

			{/* CTA */}
			<div>
				<Link
					href="/gallery/example"
					className={buttonVariants({ variant: "outline", size: "lg" })}
				>
					See example gallery
				</Link>
			</div>
		</LandingPageBlock>
	);
}
