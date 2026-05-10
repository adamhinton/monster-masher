// ________
// Tests for src/components/layout/MobileNav.tsx
// ________
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestStoreProvider } from "../__testUtils__/store";
import { validUserProfile } from "../__testUtils__/fixtures";
import { MobileNav } from "@/components/layout/MobileNav";
import type { ReduxAuthState } from "../../../store/authSlice";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
		onClick,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
		onClick?: () => void;
	}) => (
		<a href={href} className={className} onClick={onClick}>
			{children}
		</a>
	),
}));

vi.mock("@/components/darkTheming/ThemeToggle", () => ({
	ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

const mockFetch = vi.fn().mockResolvedValue({ ok: true });

const loadingState: ReduxAuthState = { status: "loading" };
const anonymousState: ReduxAuthState = { status: "anonymous" };
const authenticatedState: ReduxAuthState = {
	status: "authenticated",
	user: validUserProfile,
};

describe("MobileNav", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
		vi.stubGlobal("fetch", mockFetch);
		mockFetch.mockResolvedValue({ ok: true });
		mockPush.mockReset();
		mockRefresh.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders the hamburger trigger button", () => {
		render(
			<TestStoreProvider authState={anonymousState}>
				<MobileNav />
			</TestStoreProvider>,
		);
		expect(
			screen.getByRole("button", { name: /open navigation menu/i }),
		).toBeInTheDocument();
	});

	it("shows Create and Gallery links after opening", async () => {
		render(
			<TestStoreProvider authState={anonymousState}>
				<MobileNav />
			</TestStoreProvider>,
		);
		await user.click(
			screen.getByRole("button", { name: /open navigation menu/i }),
		);
		expect(
			await screen.findByRole("link", { name: /^create$/i }),
		).toHaveAttribute("href", "/create");
		expect(
			await screen.findByRole("link", { name: /^gallery$/i }),
		).toHaveAttribute("href", "/gallery");
	});

	it("shows a skeleton in loading state when sheet is open", async () => {
		render(
			<TestStoreProvider authState={loadingState}>
				<MobileNav />
			</TestStoreProvider>,
		);
		await user.click(
			screen.getByRole("button", { name: /open navigation menu/i }),
		);
		// The skeleton doesn't have an accessible role; look for the loading state indirectly
		// by checking that no "Sign in" link or email is shown
		expect(
			screen.queryByRole("link", { name: /sign in/i }),
		).not.toBeInTheDocument();
		expect(screen.queryByText(validUserProfile.email)).not.toBeInTheDocument();
	});

	it("shows Sign in link in anonymous state when sheet is open", async () => {
		render(
			<TestStoreProvider authState={anonymousState}>
				<MobileNav />
			</TestStoreProvider>,
		);
		await user.click(
			screen.getByRole("button", { name: /open navigation menu/i }),
		);
		expect(
			await screen.findByRole("link", { name: /sign in/i }),
		).toHaveAttribute("href", "/auth");
	});

	it("shows the user email in authenticated state when sheet is open", async () => {
		render(
			<TestStoreProvider authState={authenticatedState}>
				<MobileNav />
			</TestStoreProvider>,
		);
		await user.click(
			screen.getByRole("button", { name: /open navigation menu/i }),
		);
		expect(await screen.findByText(validUserProfile.email)).toBeInTheDocument();
	});

	it("shows a Sign out button in authenticated state when sheet is open", async () => {
		render(
			<TestStoreProvider authState={authenticatedState}>
				<MobileNav />
			</TestStoreProvider>,
		);
		await user.click(
			screen.getByRole("button", { name: /open navigation menu/i }),
		);
		expect(
			await screen.findByRole("button", { name: /sign out/i }),
		).toBeInTheDocument();
	});

	it("POSTs to /api/auth/logout and calls router.push('/') on sign out", async () => {
		render(
			<TestStoreProvider authState={authenticatedState}>
				<MobileNav />
			</TestStoreProvider>,
		);
		await user.click(
			screen.getByRole("button", { name: /open navigation menu/i }),
		);
		await user.click(await screen.findByRole("button", { name: /sign out/i }));
		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/auth/logout",
				expect.objectContaining({ method: "POST" }),
			),
		);
		await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
	});
});
