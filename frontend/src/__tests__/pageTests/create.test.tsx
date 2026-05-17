// ________
// Integration tests for /create — the CreateMonsterExperience full flow.
//
// These tests use real timers and findBy* queries to wait out the 900 ms fake
// generation delay without fake-timer complexity. The generation timeout fires
// in the real event loop; findByRole(…, { timeout: 2000 }) gives it room.
// ________
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreatePage from "@/app/create/page";
import { TestStoreProvider } from "../__testUtils__/store";
import { validUserProfile } from "../__testUtils__/fixtures";

vi.mock("next/navigation", () => ({
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

describe("CreatePage", () => {
	const mockFetch = vi.fn<typeof fetch>();

	beforeEach(() => {
		vi.stubGlobal("fetch", mockFetch);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		mockFetch.mockReset();
		window.localStorage.clear();
	});
	function renderCreatePage(
		authState: Parameters<typeof TestStoreProvider>[0]["authState"] = {
			status: "anonymous",
		},
	) {
		return render(
			<TestStoreProvider authState={authState}>
				<CreatePage />
			</TestStoreProvider>,
		);
	}

	async function fillRequiredFields(
		user: ReturnType<typeof userEvent.setup>,
		overrides?: { display_name?: string; personality?: string },
	) {
		await user.type(
			screen.getByLabelText(/monster name/i),
			overrides?.display_name ?? "Mossmaw",
		);
		await user.type(screen.getByLabelText(/element/i), "Bogfire");
		await user.type(screen.getByLabelText(/habitat/i), "Cavern marsh");
		await user.type(
			screen.getByLabelText(/personality/i),
			overrides?.personality ?? "Mischievous",
		);
		await user.type(
			screen.getByLabelText(/color palette/i),
			"Moss green and ember orange",
		);
	}

	it("renders without crashing", () => {
		renderCreatePage();
	});

	it("shows the fake mode status state", () => {
		renderCreatePage();
		expect(screen.getByText(/fake mode/i)).toBeInTheDocument();
		expect(screen.getByText(/no real provider call yet/i)).toBeInTheDocument();
	});

	it("renders the generation form fields", () => {
		renderCreatePage();
		expect(screen.getByLabelText(/monster name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/element/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/habitat/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /generate monster/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /clear form/i }),
		).toBeInTheDocument();
	});

	it("submits the fake create flow through running to succeeded for authenticated users", async () => {
		const user = userEvent.setup();

		renderCreatePage({
			status: "authenticated",
			user: validUserProfile,
		});

		await fillRequiredFields(user);
		await user.click(screen.getByRole("button", { name: /generate monster/i }));

		// Running state visible immediately
		expect(
			screen.getByText(
				/keep this tab open while your monster is being generated/i,
			),
		).toBeInTheDocument();
		expect(mockFetch).not.toHaveBeenCalled();

		// Wait for the 900 ms fake generation delay to complete.
		// AlertTitle renders as a <div>, not a heading — use findByText.
		expect(
			await screen.findByText(/monster ready/i, {}, { timeout: 2000 }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /save to gallery/i }),
		).toBeInTheDocument();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("shows the failed state and returns to idle when retrying", async () => {
		const user = userEvent.setup();

		renderCreatePage();

		await fillRequiredFields(user, { display_name: "error" });
		await user.click(screen.getByRole("button", { name: /generate monster/i }));

		expect(
			await screen.findByText(/generation failed/i, {}, { timeout: 2000 }),
		).toBeInTheDocument();
		expect(screen.getByText(/pretend snag/i)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /try again/i }));

		expect(screen.getByText(/fake mode/i)).toBeInTheDocument();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("shows the blocked state and returns to idle when editing the prompt", async () => {
		const user = userEvent.setup();

		renderCreatePage();

		await fillRequiredFields(user, { personality: "graphic menace" });
		await user.click(screen.getByRole("button", { name: /generate monster/i }));

		expect(
			await screen.findByText(
				/prompt needs a softer touch/i,
				{},
				{ timeout: 2000 },
			),
		).toBeInTheDocument();
		expect(screen.getByText(/your prompt was not allowed/i)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /edit prompt/i }));

		expect(screen.getByText(/fake mode/i)).toBeInTheDocument();
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
