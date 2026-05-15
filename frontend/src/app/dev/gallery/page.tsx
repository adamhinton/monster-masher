/**
 * Dev-only testing page — displays MonsterImageFrame, MonsterBadges,
 * MonsterTraitList, and MonsterCard in all variants and edge-case states.
 * Blocked in production via proxy.ts.
 * Fake data typed against MonsterSchema.ts / MonsterImageSchema.ts.
 */

"use client";

import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";
import type { MonsterImage } from "@/lib/api/schemas/monster/MonsterImageSchema";
import { MonsterImageFrame } from "@/components/monsterGallery/monsterCard/helperComponents/MonsterImageFrame";
import { MonsterBadges } from "@/components/monsterGallery/monsterCard/helperComponents/MonsterBadges";
import { MonsterTraitList } from "@/components/monsterGallery/monsterCard/helperComponents/MonsterTraitList";
import { MonsterCard } from "@/components/monsterGallery/monsterCard/MonsterCard";

// ─── Fake image fixtures ──────────────────────────────────────────────────────

/** Happy path: a working image URL. */
const fakeImageAvailable: MonsterImage = {
	id: "00000000-0000-0000-0000-000000000001",
	public_image_url: "https://picsum.photos/seed/flamox/480/480",
	image_storage_path: "monsters/dev/flamox.png",
	provider: "openai",
	provider_model: "dall-e-3",
	created_at: "2026-05-14T10:00:00.000Z",
};

/** Image record exists but URL returns 404 — triggers the onError fallback to placeholder. */
const fakeImageBrokenUrl: MonsterImage = {
	id: "00000000-0000-0000-0000-000000000002",
	public_image_url: "https://example.invalid/this-does-not-exist.png",
	image_storage_path: "monsters/dev/broken.png",
	provider: "openai",
	provider_model: "dall-e-3",
	created_at: "2026-05-14T10:00:00.000Z",
};

// ─── Fake monster fixtures ────────────────────────────────────────────────────

/** Typical short traits. */
const monsterShortTraits: Monster["traits"] = {
	element: "Fire",
	habitat: "Volcano",
	personality: "Chaotic",
	color_palette: "Crimson and ash",
};

/**
 * All traits at or near their schema maximums to stress-test wrapping.
 * element max=20, habitat max=60, personality max=60, color_palette max=80.
 */
const monsterLongTraits: Monster["traits"] = {
	element: "Crystalvoidflame",
	habitat: "The deep subterranean caverns beneath the shattered obsidian coast",
	personality:
		"Intensely curious, easily startled, and prone to collecting shiny rocks",
	color_palette:
		"Deep indigo fading into iridescent teal with flecks of burnished copper and soft rose",
};

/** Traits with no spaces at all — worst-case overflow scenario. */
const monsterNoSpaceTraits: Monster["traits"] = {
	element: "Shadowcrystal",
	habitat: "PetrifiedForestOfTheAncientOnes",
	personality: "CalmYetUnpredictableAndDistantlyWistful",
	color_palette: "CharcoalBlackWithBrightGreenLuminescenceAndDeepGoldAccents",
};

/** Full monster with image and flavor text — used for TraitList detail examples. */
const monsterFull: Monster = {
	id: "00000000-0000-0000-0000-000000000010",
	display_name: "Flamox",
	traits: monsterShortTraits,
	flavor_text:
		"Born in the caldera of an ancient volcano, Flamox subsists entirely on sulfur crystals and warm compliments.",
	created_at: "2026-05-14T10:00:00.000Z",
	updated_at: "2026-05-14T10:00:00.000Z",
	image: fakeImageAvailable,
};

/** Monster with no flavor text. */
const monsterNoFlavor: Monster = {
	id: "00000000-0000-0000-0000-000000000011",
	display_name: "Bogsworth",
	traits: monsterLongTraits,
	flavor_text: undefined,
	created_at: "2026-05-14T10:00:00.000Z",
	updated_at: "2026-05-14T10:00:00.000Z",
	image: null,
};

/** Monster with a display name at the 80-character schema maximum — tests name truncation in card. */
const monsterLongName: Monster = {
	id: "00000000-0000-0000-0000-000000000012",
	display_name:
		"Glorpthix the Magnificent Eater of Worlds and Occasional Light Snacker",
	traits: monsterShortTraits,
	flavor_text: "Bigger than advertised.",
	created_at: "2025-01-01T00:00:00.000Z",
	updated_at: "2025-01-01T00:00:00.000Z",
	image: fakeImageAvailable,
};

/** Monster with a broken image URL and no-space traits — combined stress test for card layout. */
const monsterStressCard: Monster = {
	id: "00000000-0000-0000-0000-000000000013",
	display_name: "Voidcrawler",
	traits: monsterNoSpaceTraits,
	flavor_text: undefined,
	created_at: "2024-11-30T08:30:00.000Z",
	updated_at: "2024-11-30T08:30:00.000Z",
	image: fakeImageBrokenUrl,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevGalleryPage() {
	return (
		<main className="min-h-screen bg-background px-8 py-12">
			<header className="mb-10 border-b border-border pb-6">
				<h1 className="text-2xl font-bold text-foreground">
					Dev Gallery — Steps 6, 7 &amp; 8
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Visual tests for MonsterImageFrame, MonsterBadges, MonsterTraitList,
					and MonsterCard. Not rendered in production.{" "}
				</p>
			</header>
			{/* ── MonsterImageFrame ─────────────────────────────────────────────── */}
			<section className="mb-16">
				<h2 className="mb-6 text-xl font-semibold text-foreground">
					MonsterImageFrame
				</h2>

				<div className="mb-8">
					<h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
						variant=&quot;card&quot;
					</h3>
					<ul className="flex flex-wrap items-start gap-10" role="list">
						<li className="flex flex-col gap-2">
							<span className="text-xs text-muted-foreground">With image</span>
							<MonsterImageFrame
								image={fakeImageAvailable}
								variant="card"
								altText="Cute fire monster named Flamox"
							/>
						</li>
						<li className="flex flex-col gap-2">
							<span className="text-xs text-muted-foreground">image=null</span>
							<MonsterImageFrame
								image={null}
								variant="card"
								altText="Cute swamp monster named Bogsworth"
							/>
						</li>
						<li className="flex flex-col gap-2">
							<span className="text-xs text-muted-foreground">Broken URL</span>
							<MonsterImageFrame
								image={fakeImageBrokenUrl}
								variant="card"
								altText="Cute void monster named Glitchling"
							/>
						</li>
					</ul>
				</div>

				<div className="mb-8">
					<h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
						variant=&quot;detail&quot;
					</h3>
					<ul className="flex flex-wrap items-start gap-10" role="list">
						<li className="flex flex-col gap-2">
							<span className="text-xs text-muted-foreground">With image</span>
							<MonsterImageFrame
								image={fakeImageAvailable}
								variant="detail"
								altText="Cute fire monster named Flamox"
							/>
						</li>
						<li className="flex flex-col gap-2">
							<span className="text-xs text-muted-foreground">image=null</span>
							<MonsterImageFrame
								image={null}
								variant="detail"
								altText="Cute swamp monster named Bogsworth"
							/>
						</li>
					</ul>
				</div>

				<div>
					<h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
						variant=&quot;compact&quot;
					</h3>
					<ul className="flex flex-wrap items-center gap-8" role="list">
						<li className="flex flex-col gap-2">
							<span className="text-xs text-muted-foreground">With image</span>
							<MonsterImageFrame
								image={fakeImageAvailable}
								variant="compact"
								altText="Cute fire monster named Flamox"
							/>
						</li>
						<li className="flex flex-col gap-2">
							<span className="text-xs text-muted-foreground">image=null</span>
							<MonsterImageFrame
								image={null}
								variant="compact"
								altText="Cute swamp monster"
							/>
						</li>
					</ul>
				</div>
			</section>

			{/* ── MonsterBadges ─────────────────────────────────────────────────── */}
			<section className="mb-16">
				<h2 className="mb-6 text-xl font-semibold text-foreground">
					MonsterBadges
				</h2>

				<div className="space-y-8">
					{/* Card variant — short traits */}
					<div className="flex flex-col gap-2">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							variant=&quot;card&quot; — short traits
						</span>
						<MonsterBadges variant="card" traits={monsterShortTraits} />
					</div>

					{/* Card variant — long traits (truncation test) */}
					<div className="flex flex-col gap-2">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							variant=&quot;card&quot; — long traits (truncation)
						</span>
						<MonsterBadges variant="card" traits={monsterLongTraits} />
					</div>

					{/* Card variant — no-space traits (worst-case overflow) */}
					<div className="flex flex-col gap-2">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							variant=&quot;card&quot; — no spaces (overflow stress test)
						</span>
						<MonsterBadges variant="card" traits={monsterNoSpaceTraits} />
					</div>

					{/* Detail variant — short traits */}
					<div className="flex flex-col gap-2">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							variant=&quot;detail&quot; — short traits (all four badges)
						</span>
						<MonsterBadges variant="detail" traits={monsterShortTraits} />
					</div>

					{/* Detail variant — long traits */}
					<div className="max-w-xl flex flex-col gap-2">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							variant=&quot;detail&quot; — long traits (wrapping)
						</span>
						<MonsterBadges variant="detail" traits={monsterLongTraits} />
					</div>
				</div>
			</section>

			{/* ── MonsterTraitList ──────────────────────────────────────────────── */}
			<section className="mb-16">
				<h2 className="mb-6 text-xl font-semibold text-foreground">
					MonsterTraitList
				</h2>

				<div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-3">
					{/* Short traits, with flavor text */}
					<article>
						<h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
							Short traits + flavor text
						</h3>
						<MonsterTraitList
							traits={monsterFull.traits}
							flavorText={monsterFull.flavor_text}
						/>
					</article>

					{/* Long traits, no flavor text */}
					<article>
						<h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
							Long traits, no flavor text
						</h3>
						<MonsterTraitList traits={monsterNoFlavor.traits} />
					</article>

					{/* No-space traits — overflow stress test */}
					<article>
						<h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
							No-space traits (overflow stress test)
						</h3>
						<MonsterTraitList traits={monsterNoSpaceTraits} />
					</article>
				</div>
			</section>

			{/* ── MonsterCard ───────────────────────────────────────────────────── */}
			<section className="mb-16">
				<h2 className="mb-6 text-xl font-semibold text-foreground">
					MonsterCard
				</h2>

				<ul className="flex flex-wrap items-start gap-8" role="list">
					{/* Full data — image, flavor text, Edit + Delete callbacks */}
					<li className="flex flex-col gap-2">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Full data · callbacks enabled
						</span>
						<MonsterCard
							monster={monsterFull}
							onEdit={() => alert("Edit clicked")}
							onDelete={() => alert("Delete clicked")}
						/>
					</li>

					{/* Null image, no flavor text — placeholder + fallback copy */}
					<li className="flex flex-col gap-2">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Null image · no flavor text
						</span>
						<MonsterCard monster={monsterNoFlavor} />
					</li>

					{/* Long display name — truncation test */}
					<li className="flex flex-col gap-2">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Long display name (truncation)
						</span>
						<MonsterCard
							monster={monsterLongName}
							onDelete={() => alert("Delete clicked")}
						/>
					</li>

					{/* Broken image URL + no-space traits — combined stress test */}
					<li className="flex flex-col gap-2">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Broken image · no-space traits
						</span>
						<MonsterCard monster={monsterStressCard} />
					</li>
				</ul>
			</section>
		</main>
	);
}
