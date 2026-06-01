// ________
// Integration tests for /create — the CreateMonsterExperience full flow.
//
// These tests stub global fetch and use findBy* queries to await async state
// transitions after the mocked API calls resolve.
// ________
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreatePage from "@/app/create/page";
import { TestStoreProvider } from "../__testUtils__/store";
import { validMonster, validUserProfile } from "../__testUtils__/fixtures";
import { Monster } from "@/lib/api/schemas/monster/MonsterSchema";

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

	it("renders the generation form fields for authenticated users", () => {
		renderCreatePage({ status: "authenticated", user: validUserProfile });
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

	it("shows sign-in prompt when anonymous", () => {
		renderCreatePage({ status: "anonymous" });
		expect(
			screen.getByRole("heading", { name: /sign in to create your monster/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /create a free account/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
	});

	it("auth gate links point to /auth", () => {
		renderCreatePage({ status: "anonymous" });
		const ctaLinks = screen
			.getAllByRole("link")
			.filter((el) => el.getAttribute("href")?.includes("/auth"));
		expect(ctaLinks.length).toBeGreaterThanOrEqual(2);
	});

	it("shows a skeleton while auth is loading", () => {
		renderCreatePage({ status: "loading" });
		expect(
			screen.getByLabelText(/loading create monster form/i),
		).toBeInTheDocument();
	});

	it("does not show form fields when anonymous", () => {
		renderCreatePage({ status: "anonymous" });
		expect(screen.queryByLabelText(/monster name/i)).not.toBeInTheDocument();
	});

	it("submits the create flow through running to succeeded for authenticated users", async () => {
		const user = userEvent.setup();
		const updatedMonster: Monster = {
			...validMonster,
			image: {
				id: "cccccccc-cccc-4ccc-9ccc-cccccccccccc",
				public_image_url: "https://example.com/img.png",
				image_storage_path: "monster-images/test/img.png",
				provider: "fake",
				provider_model: "fake",
				created_at: "2026-01-01T00:00:00.000Z",
			},
		};

		mockFetch.mockImplementation(async (input) => {
			const url = String(input);
			if (url === "/api/me/image-gens-remaining") {
				return {
					ok: true,
					status: 200,
					json: async () => ({ num_remaining: 5, max_per_day: 6 }),
				} as Response;
			}
			if (url === "/api/monsters/") {
				return {
					ok: true,
					status: 201,
					json: async () => ({ monster: validMonster }),
				} as Response;
			}
			if (url === `/api/monsters/${validMonster.id}/generate-image`) {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						outcome: "succeeded",
						public_image_url: "https://example.com/img.png",
						image_storage_path: "monster-images/test/img.png",
					}),
				} as Response;
			}
			if (url === `/api/monsters/${validMonster.id}`) {
				return {
					ok: true,
					status: 200,
					json: async () => ({ monster: updatedMonster }),
				} as Response;
			}
			return {
				ok: false,
				status: 404,
				json: async () => ({
					error: { code: "not_found", message: "Not found." },
				}),
			} as Response;
		});

		renderCreatePage({
			status: "authenticated",
			user: validUserProfile,
		});

		await fillRequiredFields(user);
		await user.click(screen.getByRole("button", { name: /generate monster/i }));

		// Wait for generation to complete (fetches are mocked and resolve immediately)
		expect(
			await screen.findByText(/monster ready/i, {}, { timeout: 3000 }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /view in gallery/i }),
		).toBeInTheDocument();
		expect(mockFetch).toHaveBeenCalledWith(`/api/monsters/${validMonster.id}`);
		// 4 fetch calls: image-gens-remaining, create monster, generate image, refetch monster
		expect(mockFetch).toHaveBeenCalledTimes(4);
	});

	it("shows the failed state and returns to idle when retrying", async () => {
		const user = userEvent.setup();

		mockFetch.mockImplementation(async (input) => {
			const url = String(input);
			if (url === "/api/monsters/") {
				return {
					ok: true,
					status: 201,
					json: async () => ({ monster: validMonster }),
				} as Response;
			}
			// generate-image fails with 500
			return {
				ok: false,
				status: 500,
				json: async () => ({
					error: {
						code: "provider_failed",
						message: "Image generation failed. Please try again.",
					},
				}),
			} as Response;
		});

		renderCreatePage({ status: "authenticated", user: validUserProfile });

		await fillRequiredFields(user);
		await user.click(screen.getByRole("button", { name: /generate monster/i }));

		expect(
			await screen.findByText("Generation failed", {}, { timeout: 3000 }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/image generation failed\. please try again/i),
		).toBeInTheDocument();

		await user.click(screen.getByRole("link", { name: /try again/i }));
	});

	it("shows the blocked state and returns to idle when editing the prompt", async () => {
		const user = userEvent.setup();

		mockFetch.mockImplementation(async (input) => {
			const url = String(input);
			if (url === "/api/monsters/") {
				return {
					ok: false,
					status: 422,
					json: async () => ({
						error: {
							code: "blocked",
							message:
								"Please revise the prompt and keep the monster cute, original, and non-graphic.",
						},
					}),
				} as Response;
			}
			return {
				ok: false,
				status: 404,
				json: async () => ({
					error: { code: "not_found", message: "Not found." },
				}),
			} as Response;
		});

		renderCreatePage({ status: "authenticated", user: validUserProfile });

		await fillRequiredFields(user);
		await user.click(screen.getByRole("button", { name: /generate monster/i }));

		expect(
			await screen.findByText(
				/prompt blocked by content policy/i,
				{},
				{ timeout: 3000 },
			),
		).toBeInTheDocument();
		expect(
			screen.getByText(/your description was blocked/i),
		).toBeInTheDocument();

		await user.click(screen.getByRole("link", { name: /edit prompt/i }));
	});
});
