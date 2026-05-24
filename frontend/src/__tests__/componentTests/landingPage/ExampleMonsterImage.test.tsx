// _______________
// Tests for src/components/landingPage/ExampleMonsterImage.tsx
//
// Covers:
//   - Image renders with correct alt text
//   - Fallback UI (initials + name) shown when image fails to load
//   - Sentry captureMessage fired once on first error for a given monster
//   - Sentry NOT fired again when the same monster re-renders with a broken image
//   - Sentry fired independently for each distinct monster (separate fingerprints)
//   - Sentry NOT fired on successful image load
//   - Square frame is always preserved (no broken-image icon)
// _______________

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExampleMonsterImage } from "@/components/landingPage/ExampleMonsterImage";
import type { LandingExampleMonster } from "@/lib/landingPage/landingExampleData";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockCaptureMessage } = vi.hoisted(() => ({
	mockCaptureMessage: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
	captureMessage: mockCaptureMessage,
}));

vi.mock("next/navigation", () => ({
	usePathname: () => "/gallery/example",
}));

// Mock next/image as a plain <img> so onError fires naturally in jsdom.
vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		onError,
		className,
	}: {
		src: string;
		alt: string;
		onError?: () => void;
		className?: string;
	}) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} onError={onError} className={className} />
	),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMonster(
	overrides: Partial<LandingExampleMonster> = {},
): LandingExampleMonster {
	return {
		id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
		display_name: "Gloomscale",
		traits: {
			element: "Shadow",
			habitat: "Foggy swamp",
			personality: "Mysterious",
			color_palette: "Dark purple and grey",
		},
		flavor_text: "A shadowy creature that lurks in the fog.",
		tagline: "Lurking in every shadow.",
		alt_text: "Cute shadow monster named Gloomscale",
		download_filename: "monster-masher-gloomscale.png",
		image: {
			id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
			public_image_url:
				"https://jspbqekckumhdgqgthxc.supabase.co/storage/v1/object/public/monster-images/test.png",
			image_storage_path: "monster-images/test.png",
			provider: "replicate",
			provider_model: "flux-dev",
			created_at: "2025-01-01T00:00:00.000Z",
		},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests — image rendering
// ---------------------------------------------------------------------------

describe("ExampleMonsterImage — image rendering", () => {
	beforeEach(() => {
		mockCaptureMessage.mockClear();
	});

	it("renders an img with the correct alt text", () => {
		const monster = makeMonster({ id: "test-render-01" });
		render(<ExampleMonsterImage monster={monster} variant="card" />);
		expect(
			screen.getByRole("img", { name: monster.alt_text }),
		).toBeInTheDocument();
	});

	it("renders the card variant at 240 px", () => {
		const monster = makeMonster({ id: "test-render-02" });
		const { container } = render(
			<ExampleMonsterImage monster={monster} variant="card" />,
		);
		const figure = container.querySelector("figure");
		expect(figure).toHaveStyle({ width: "240px", height: "240px" });
	});

	it("renders the detail variant at 480 px", () => {
		const monster = makeMonster({ id: "test-render-03" });
		const { container } = render(
			<ExampleMonsterImage monster={monster} variant="detail" />,
		);
		const figure = container.querySelector("figure");
		expect(figure).toHaveStyle({ width: "480px", height: "480px" });
	});

	it("defaults to card variant when no variant prop is given", () => {
		const monster = makeMonster({ id: "test-render-04" });
		const { container } = render(<ExampleMonsterImage monster={monster} />);
		const figure = container.querySelector("figure");
		expect(figure).toHaveStyle({ width: "240px", height: "240px" });
	});

	it("does NOT show sentry events when image loads successfully", () => {
		const monster = makeMonster({ id: "test-render-success-01" });
		render(<ExampleMonsterImage monster={monster} variant="card" />);
		// No error fired — Sentry must be silent
		expect(mockCaptureMessage).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Tests — fallback UI on image error
// ---------------------------------------------------------------------------

describe("ExampleMonsterImage — fallback UI on error", () => {
	beforeEach(() => {
		mockCaptureMessage.mockClear();
	});

	it("shows the monster name in the fallback after image error", () => {
		const monster = makeMonster({
			id: "test-fallback-01",
			display_name: "Gloomscale",
		});
		render(<ExampleMonsterImage monster={monster} variant="card" />);

		const img = screen.getByRole("img", { name: monster.alt_text });
		fireEvent.error(img);

		expect(screen.getByText("Gloomscale")).toBeInTheDocument();
	});

	it("shows monster initials in the fallback", () => {
		const monster = makeMonster({
			id: "test-fallback-02",
			display_name: "Fire Toad",
		});
		render(<ExampleMonsterImage monster={monster} variant="card" />);

		const img = screen.getByRole("img", { name: monster.alt_text });
		fireEvent.error(img);

		expect(screen.getByText("FT")).toBeInTheDocument();
	});

	it("shows single initial for single-word names", () => {
		const monster = makeMonster({
			id: "test-fallback-03",
			display_name: "Pyrix",
		});
		render(<ExampleMonsterImage monster={monster} variant="card" />);

		const img = screen.getByRole("img", { name: monster.alt_text });
		fireEvent.error(img);

		expect(screen.getByText("P")).toBeInTheDocument();
	});

	it("truncates initials to at most three characters", () => {
		const monster = makeMonster({
			id: "test-fallback-04",
			display_name: "Ancient Forest Dragon King",
		});
		render(<ExampleMonsterImage monster={monster} variant="card" />);

		const img = screen.getByRole("img", { name: monster.alt_text });
		fireEvent.error(img);

		expect(screen.getByText("AFD")).toBeInTheDocument();
	});

	it("fallback preserves the accessible alt text on the figure", () => {
		const monster = makeMonster({
			id: "test-fallback-05",
			alt_text: "Cute shadow monster named Gloomscale",
		});
		render(<ExampleMonsterImage monster={monster} variant="card" />);
		const img = screen.getByRole("img", { name: monster.alt_text });
		fireEvent.error(img);

		// The figure-level aria-label keeps the alt text accessible after the img is replaced.
		const figure = screen.getByRole("figure");
		expect(figure).toHaveAttribute("aria-label", monster.alt_text);
	});

	it("removes the broken <img> element after error — no broken image icon", () => {
		const monster = makeMonster({ id: "test-fallback-06" });
		const { container } = render(
			<ExampleMonsterImage monster={monster} variant="card" />,
		);

		const img = container.querySelector("img");
		expect(img).toBeInTheDocument();
		fireEvent.error(img!);

		expect(container.querySelector("img")).not.toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Tests — Sentry capture (Steps 8c, 8d)
// ---------------------------------------------------------------------------

describe("ExampleMonsterImage — Sentry capture", () => {
	beforeEach(() => {
		mockCaptureMessage.mockClear();
	});

	it("fires captureMessage when the image fails to load", () => {
		const monster = makeMonster({ id: "sentry-test-fire-01" });
		render(<ExampleMonsterImage monster={monster} variant="card" />);

		const img = screen.getByRole("img", { name: monster.alt_text });
		fireEvent.error(img);

		expect(mockCaptureMessage).toHaveBeenCalledOnce();
	});

	it("passes the correct message string", () => {
		const monster = makeMonster({ id: "sentry-test-msg-01" });
		render(<ExampleMonsterImage monster={monster} variant="card" />);

		fireEvent.error(screen.getByRole("img", { name: monster.alt_text }));

		expect(mockCaptureMessage).toHaveBeenCalledWith(
			"Example monster image failed to load",
			expect.objectContaining({}),
		);
	});

	it("passes level: error, feature tag, and monsterId tag", () => {
		const monster = makeMonster({ id: "sentry-test-tags-01" });
		render(<ExampleMonsterImage monster={monster} variant="card" />);

		fireEvent.error(screen.getByRole("img", { name: monster.alt_text }));

		expect(mockCaptureMessage).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				level: "error",
				tags: expect.objectContaining({
					feature: "landing-example-images",
					monsterId: monster.id,
				}),
			}),
		);
	});

	it("includes stable fingerprint with monster id", () => {
		const monster = makeMonster({ id: "sentry-test-fingerprint-01" });
		render(<ExampleMonsterImage monster={monster} variant="card" />);

		fireEvent.error(screen.getByRole("img", { name: monster.alt_text }));

		expect(mockCaptureMessage).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				fingerprint: ["example-monster-image-load-failure", monster.id],
			}),
		);
	});

	it("includes monster context with id, name, and imageUrl", () => {
		const monster = makeMonster({ id: "sentry-test-context-01" });
		render(<ExampleMonsterImage monster={monster} variant="card" />);

		fireEvent.error(screen.getByRole("img", { name: monster.alt_text }));

		expect(mockCaptureMessage).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				contexts: expect.objectContaining({
					monster: expect.objectContaining({
						id: monster.id,
						name: monster.display_name,
						imageUrl: monster.image.public_image_url,
					}),
				}),
			}),
		);
	});
});

// ---------------------------------------------------------------------------
// Tests — Sentry dedup (Step 8d: once per monster per session)
// ---------------------------------------------------------------------------

describe("ExampleMonsterImage — Sentry dedup", () => {
	beforeEach(() => {
		mockCaptureMessage.mockClear();
	});

	it("does NOT fire Sentry a second time when a new component renders with the same monster id", () => {
		// Use an ID that has already been seen from the earlier "fire" test
		// running in the same module instance — but we can't rely on that order.
		// Instead, create a unique ID and trigger error twice via two renders.
		const monster = makeMonster({ id: "sentry-dedup-same-monster" });

		const { unmount } = render(
			<ExampleMonsterImage monster={monster} variant="card" />,
		);
		fireEvent.error(screen.getByRole("img", { name: monster.alt_text }));
		expect(mockCaptureMessage).toHaveBeenCalledOnce();
		mockCaptureMessage.mockClear();

		// Unmount and remount with the same monster id — the module-level Set
		// still has this id from the first render, so no second Sentry event.
		unmount();
		render(<ExampleMonsterImage monster={monster} variant="card" />);
		// The img is still in the DOM after remount (no error fired yet in this render).
		// Find the new img by the alt text.
		const imgs = screen.getAllByRole("img", { name: monster.alt_text });
		// There may be more than one if fallback was shown in previous render's aria,
		// but here we're looking for the actual <img> element.
		const imgEl = imgs.find((el) => el.tagName.toLowerCase() === "img");
		if (imgEl) fireEvent.error(imgEl);

		expect(mockCaptureMessage).not.toHaveBeenCalled();
	});

	it("fires Sentry independently for two different monsters", () => {
		const monsterA = makeMonster({
			id: "sentry-dedup-distinct-A",
			display_name: "AlphaFang",
			alt_text: "Monster AlphaFang",
		});
		const monsterB = makeMonster({
			id: "sentry-dedup-distinct-B",
			display_name: "BetaClaw",
			alt_text: "Monster BetaClaw",
		});

		// Render monsterA, trigger error, then unmount.
		const { unmount: unmountA } = render(
			<ExampleMonsterImage monster={monsterA} variant="card" />,
		);
		fireEvent.error(screen.getByRole("img", { name: monsterA.alt_text }));
		unmountA();

		// Render monsterB fresh (hasError reset to false), trigger error.
		render(<ExampleMonsterImage monster={monsterB} variant="card" />);
		fireEvent.error(screen.getByRole("img", { name: monsterB.alt_text }));

		// Both fires counted
		expect(mockCaptureMessage).toHaveBeenCalledTimes(2);

		const calls = mockCaptureMessage.mock.calls;
		const fingerprintA = (calls[0][1] as { fingerprint: string[] }).fingerprint;
		const fingerprintB = (calls[1][1] as { fingerprint: string[] }).fingerprint;
		expect(fingerprintA[1]).toBe(monsterA.id);
		expect(fingerprintB[1]).toBe(monsterB.id);
	});
});
