// _______________
// Tests for src/app/gallery/example/[monsterId]/page.tsx
//
// Covers:
//   - generateStaticParams returns all six monster IDs
//   - Page renders the correct monster for a known ID
//   - Page calls notFound() for an unknown ID
//   - Rendered detail includes heading, tagline, flavor text, badges, CTA
//   - Back link goes to /gallery/example
// _______________

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExampleDetailPage, {
	generateStaticParams,
	generateMetadata,
} from "@/app/gallery/example/[monsterId]/page";
import { exampleMonsterIds } from "@/lib/landingPage/landingExampleData";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockNotFound } = vi.hoisted(() => ({
	mockNotFound: vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
}));

vi.mock("next/navigation", () => ({
	notFound: mockNotFound,
	usePathname: () => "/gallery/example/some-id",
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...rest
	}: {
		href: string;
		children: ReactNode;
		[key: string]: unknown;
	}) => (
		<a href={href} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("@sentry/nextjs", () => ({
	captureMessage: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderDetailPage(monsterId: string) {
	const jsx = await ExampleDetailPage({
		params: Promise.resolve({ monsterId }),
	});
	return render(jsx);
}

// ---------------------------------------------------------------------------
// Tests — generateStaticParams
// ---------------------------------------------------------------------------

describe("generateStaticParams", () => {
	it("returns all six monster IDs", async () => {
		const params = await generateStaticParams();
		expect(params).toHaveLength(6);
	});

	it("returns objects with monsterId keys matching exampleMonsterIds", async () => {
		const params = await generateStaticParams();
		const ids = params.map((p) => p.monsterId);
		expect(ids).toEqual([...exampleMonsterIds]);
	});
});

// ---------------------------------------------------------------------------
// Tests — generateMetadata
// ---------------------------------------------------------------------------

describe("generateMetadata", () => {
	it("returns title and description for a known monster", async () => {
		const metadata = await generateMetadata({
			params: Promise.resolve({
				monsterId: "49e01917-6db8-5c2c-9f2e-a52f80f246d5",
			}),
		});
		expect((metadata as { title?: string }).title).toContain("Magleta");
		expect((metadata as { description?: string }).description).toBeTruthy();
	});

	it("returns an empty object for an unknown monster id", async () => {
		const metadata = await generateMetadata({
			params: Promise.resolve({
				monsterId: "00000000-0000-0000-0000-000000000000",
			}),
		});
		expect(metadata).toEqual({});
	});
});

// ---------------------------------------------------------------------------
// Tests — notFound for unknown ID
// ---------------------------------------------------------------------------

describe("ExampleDetailPage — unknown monster ID", () => {
	it("calls notFound() for an unknown id", async () => {
		await expect(
			ExampleDetailPage({
				params: Promise.resolve({
					monsterId: "00000000-0000-0000-0000-000000000000",
				}),
			}),
		).rejects.toThrow("NEXT_NOT_FOUND");

		expect(mockNotFound).toHaveBeenCalled();
	});

	it("calls notFound() for an empty string id", async () => {
		await expect(
			ExampleDetailPage({
				params: Promise.resolve({ monsterId: "" }),
			}),
		).rejects.toThrow("Monster ID needs to be a UUID");
	});
});

// ---------------------------------------------------------------------------
// Tests — renders correctly for known ID
// ---------------------------------------------------------------------------

describe("ExampleDetailPage — Magleta (known id)", () => {
	it("renders without crashing", async () => {
		await renderDetailPage("49e01917-6db8-5c2c-9f2e-a52f80f246d5");
	});

	it("renders the monster name as heading", async () => {
		await renderDetailPage("49e01917-6db8-5c2c-9f2e-a52f80f246d5");
		expect(
			screen.getByRole("heading", { name: /magleta/i }),
		).toBeInTheDocument();
	});

	it("renders the monster tagline", async () => {
		await renderDetailPage("49e01917-6db8-5c2c-9f2e-a52f80f246d5");
		expect(
			screen.getByText(/outlet muncher with a taste for spare voltage/i),
		).toBeInTheDocument();
	});

	it("renders the flavor text", async () => {
		await renderDetailPage("49e01917-6db8-5c2c-9f2e-a52f80f246d5");
		expect(screen.getByText(/lives in power outlets/i)).toBeInTheDocument();
	});

	it("renders the element badge", async () => {
		await renderDetailPage("49e01917-6db8-5c2c-9f2e-a52f80f246d5");
		const badges = screen.getAllByText("Electricity / Steel");
		expect(badges.length).toBeGreaterThanOrEqual(1);
	});

	it("renders the Example monster badge", async () => {
		await renderDetailPage("49e01917-6db8-5c2c-9f2e-a52f80f246d5");
		expect(screen.getByText(/example monster/i)).toBeInTheDocument();
	});

	it("renders a CTA link to /create", async () => {
		await renderDetailPage("49e01917-6db8-5c2c-9f2e-a52f80f246d5");
		const createLink = screen.getByRole("link", { name: /create my monster/i });
		expect(createLink).toHaveAttribute("href", "/create");
	});

	it("renders a back link to /gallery/example", async () => {
		await renderDetailPage("49e01917-6db8-5c2c-9f2e-a52f80f246d5");
		// There may be multiple back links (nav + article), use the one that says "Back to examples"
		const backLinks = screen.getAllByRole("link", {
			name: /back to examples/i,
		});
		expect(backLinks.length).toBeGreaterThanOrEqual(1);
		expect(backLinks[0]).toHaveAttribute("href", "/gallery/example");
	});

	it("renders the monster image with correct alt text", async () => {
		await renderDetailPage("49e01917-6db8-5c2c-9f2e-a52f80f246d5");
		expect(
			screen.getByRole("img", {
				name: /cute electricity and steel monster named magleta/i,
			}),
		).toBeInTheDocument();
	});
});

describe("ExampleDetailPage — Ventanilla (last monster)", () => {
	it("renders the correct name", async () => {
		await renderDetailPage("433ad09c-203f-53dc-8a0e-1f21143e4e7e");
		expect(
			screen.getByRole("heading", { name: /ventanilla/i }),
		).toBeInTheDocument();
	});

	it("renders the element badge", async () => {
		await renderDetailPage("433ad09c-203f-53dc-8a0e-1f21143e4e7e");
		const badges = screen.getAllByText("Wind / Heights / Flying");
		expect(badges.length).toBeGreaterThanOrEqual(1);
	});
});
