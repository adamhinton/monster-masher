// ________
// Tests for src/app/gallery/page.tsx (/gallery)
// ________
import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";
import type { UserProfile } from "@/lib/api/schemas/UserProfileSchema";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GalleryPage from "@/app/gallery/page";
import { TestStoreProvider } from "../__testUtils__/store";
import { ReduxAuthState } from "../../../store/authSlice";

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

const testMonster: Monster = {
	id: "00000000-0000-0000-0000-000000000101",
	display_name: "Flamox",
	traits: {
		element: "Fire",
		habitat: "Volcano",
		personality: "Chaotic",
		color_palette: "Crimson and ash",
	},
	flavor_text: "A tiny menace with a warm glow.",
	created_at: "2026-05-14T10:00:00.000Z",
	updated_at: "2026-05-14T10:00:00.000Z",
	image: null,
};

const authenticatedUser: UserProfile = {
	id: "00000000-0000-0000-0000-000000000201",
	supabase_user_id: "00000000-0000-0000-0000-000000000301",
	email: "tester@example.com",
	display_name: "Tester",
	created_at: "2026-05-14T10:00:00.000Z",
	updated_at: "2026-05-14T10:00:00.000Z",
	monsters: [testMonster],
};

function renderGalleryPageWithAuthState(authState: ReduxAuthState) {
	return render(
		<TestStoreProvider authState={authState}>
			<GalleryPage />
		</TestStoreProvider>,
	);
}

describe("GalleryPage", () => {
	it("renders without crashing", () => {
		renderGalleryPageWithAuthState({ status: "anonymous" });
	});

	it("renders the gallery heading and create CTA", () => {
		renderGalleryPageWithAuthState({ status: "anonymous" });
		expect(
			screen.getByRole("heading", { name: /my monster gallery/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /create monster/i }),
		).toHaveAttribute("href", "/create");
	});

	it("shows the empty state when no monsters are available", () => {
		renderGalleryPageWithAuthState({ status: "anonymous" });
		expect(screen.getByText(/no monsters here yet/i)).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /create your first monster/i }),
		).toHaveAttribute("href", "/create");
	});

	it("shows the saved monsters grid and summary strip for authenticated users", () => {
		renderGalleryPageWithAuthState({
			status: "authenticated",
			user: authenticatedUser,
		});

		const summaryStrip = screen
			.getByText(/showing page 1 of 1/i)
			.closest('[data-slot="card-content"]');

		expect(summaryStrip).not.toBeNull();
		expect(summaryStrip).toHaveTextContent(/1 monster saved/i);
		expect(screen.getByText(/showing page 1 of 1/i)).toBeInTheDocument();
		expect(screen.getByText(/images immutable/i)).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /flamox/i }),
		).toBeInTheDocument();
	});
});
