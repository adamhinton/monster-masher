import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MonsterDetailPage from "@/app/gallery/[monsterID]/page";
import { TestStoreProvider } from "@/__tests__/__testUtils__/store";
import {
	validMonster,
	validMonsterWithImage,
	validUserProfileWithMonsters,
} from "@/__tests__/__testUtils__/fixtures";
import { ReduxAuthState } from "../../../store/authSlice";

const { mockUseParams } = vi.hoisted(() => ({
	mockUseParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useParams: mockUseParams,
	useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

function renderPage(authState: ReduxAuthState, monsterID?: string | string[]) {
	mockUseParams.mockReturnValue({ monsterID: monsterID ?? validMonster.id });
	return render(
		<TestStoreProvider authState={authState}>
			<MonsterDetailPage />
		</TestStoreProvider>,
	);
}

describe("MonsterDetailPage — loading state", () => {
	it("shows the DetailSkeleton while auth is loading", () => {
		const { container } = renderPage({ status: "loading" });
		// Skeleton renders many Skeleton elements, no heading content
		expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
		const skeletons = container.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons.length).toBeGreaterThanOrEqual(1);
	});

	it("does not render a monster heading in loading state", () => {
		renderPage({ status: "loading" });
		expect(
			screen.queryByRole("heading", { name: validMonster.display_name }),
		).not.toBeInTheDocument();
	});
});

describe("MonsterDetailPage — anonymous state", () => {
	it("shows NotFoundState when user is anonymous", () => {
		renderPage({ status: "anonymous" });
		expect(
			screen.getByRole("heading", { level: 1, name: /monster not found/i }),
		).toBeInTheDocument();
	});

	it("shows the Back to gallery link in NotFoundState", () => {
		renderPage({ status: "anonymous" });
		expect(
			screen.getByRole("link", { name: /back to gallery/i }),
		).toHaveAttribute("href", "/gallery");
	});
});

describe("MonsterDetailPage — monster not found", () => {
	it("shows NotFoundState when monsterId does not match any monster in state", () => {
		renderPage(
			{
				status: "authenticated",
				user: validUserProfileWithMonsters,
			},
			"99999999-9999-9999-9999-999999999999",
		);
		expect(
			screen.getByRole("heading", { level: 1, name: /monster not found/i }),
		).toBeInTheDocument();
	});

	it("shows NotFoundState when monsterID param is an array (not a string)", () => {
		renderPage(
			{
				status: "authenticated",
				user: validUserProfileWithMonsters,
			},
			["array", "value"],
		);
		expect(
			screen.getByRole("heading", { level: 1, name: /monster not found/i }),
		).toBeInTheDocument();
	});

	it("shows NotFoundState when monsterID param is undefined", () => {
		// Call mockUseParams directly to set undefined (bypassing the default param)
		mockUseParams.mockReturnValue({ monsterID: undefined });
		render(
			<TestStoreProvider
				authState={{
					status: "authenticated",
					user: validUserProfileWithMonsters,
				}}
			>
				<MonsterDetailPage />
			</TestStoreProvider>,
		);
		expect(
			screen.getByRole("heading", { level: 1, name: /monster not found/i }),
		).toBeInTheDocument();
	});
});

describe("MonsterDetailPage — monster found", () => {
	it("renders MonsterDetailView with the correct monster name as h1", () => {
		renderPage(
			{
				status: "authenticated",
				user: validUserProfileWithMonsters,
			},
			validMonster.id,
		);
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: validMonster.display_name,
			}),
		).toBeInTheDocument();
	});

	it("renders the second monster from the list when its ID is requested", () => {
		renderPage(
			{
				status: "authenticated",
				user: validUserProfileWithMonsters,
			},
			validMonsterWithImage.id,
		);
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: validMonsterWithImage.display_name,
			}),
		).toBeInTheDocument();
	});

	it("does NOT render NotFoundState when the monster is found", () => {
		renderPage(
			{
				status: "authenticated",
				user: validUserProfileWithMonsters,
			},
			validMonster.id,
		);
		expect(screen.queryByText(/monster not found/i)).not.toBeInTheDocument();
	});

	it("does NOT render DetailSkeleton when the monster is found", () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { container } = renderPage(
			{
				status: "authenticated",
				user: validUserProfileWithMonsters,
			},
			validMonster.id,
		);
		// MonsterDetailView renders the monster name; DetailSkeleton has no headings
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			validMonster.display_name,
		);
	});

	it("renders Back to gallery nav link in detail view", () => {
		renderPage(
			{
				status: "authenticated",
				user: validUserProfileWithMonsters,
			},
			validMonster.id,
		);
		expect(
			screen.getByRole("link", { name: /back to gallery/i }),
		).toHaveAttribute("href", "/gallery");
	});
});
