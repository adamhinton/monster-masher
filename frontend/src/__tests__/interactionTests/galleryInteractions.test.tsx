import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { Provider } from "react-redux";
import GalleryPage from "@/app/gallery/page";
import { DeleteMonsterDialog } from "@/components/monsterGallery/monsterCard/DeleteMonsterDialog";
import { TestStoreProvider, makeTestStore } from "@/__tests__/__testUtils__/store";
import { validMonster, validMonsterWithImage, validUserProfileWithMonsters } from "@/__tests__/__testUtils__/fixtures";

const { mockPush, mockToastError, mockToastSuccess } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockToastError: vi.fn(),
	mockToastSuccess: vi.fn(),
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

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({
	toast: {
		error: mockToastError,
		success: mockToastSuccess,
	},
}));

describe("gallery interactions — pagination", () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockToastError.mockReset();
		mockToastSuccess.mockReset();
		vi.restoreAllMocks();
	});

	it("pagination next and previous change the visible page", async () => {
		const user = userEvent.setup();
		const paginatedUser = {
			...validUserProfileWithMonsters,
			monsters: Array.from({ length: 21 }, (_, index) => ({
				...validMonster,
				id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
				display_name: `Monster ${index + 1}`,
			})),
		};

		render(
			<TestStoreProvider
				authState={{ status: "authenticated", user: paginatedUser }}
			>
				<GalleryPage />
			</TestStoreProvider>,
		);

		await user.click(screen.getAllByRole("button", { name: /next/i })[0]);

		expect(screen.getByText(/showing page 2 of 2/i)).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Monster 21" }),
		).toBeInTheDocument();

		await user.click(screen.getAllByRole("button", { name: /previous/i })[1]);

		expect(screen.getByText(/showing page 1 of 2/i)).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Monster 1" }),
		).toBeInTheDocument();
	});

	it("shows page 1 monsters by default and not page 2 monsters", () => {
		const paginatedUser = {
			...validUserProfileWithMonsters,
			monsters: Array.from({ length: 21 }, (_, index) => ({
				...validMonster,
				id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
				display_name: `Monster ${index + 1}`,
			})),
		};

		render(
			<TestStoreProvider
				authState={{ status: "authenticated", user: paginatedUser }}
			>
				<GalleryPage />
			</TestStoreProvider>,
		);

		expect(screen.getByRole("heading", { name: "Monster 1" })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: "Monster 21" })).not.toBeInTheDocument();
	});
});

describe("gallery interactions — delete dialog", () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockToastError.mockReset();
		mockToastSuccess.mockReset();
		vi.restoreAllMocks();
	});

	it("opens the delete dialog and cancel closes it", async () => {
		const user = userEvent.setup();
		render(
			<TestStoreProvider authState={{ status: "authenticated", user: validUserProfileWithMonsters }}>
				<DeleteMonsterDialog
					monsterId={validMonster.id}
					monsterName={validMonster.display_name}
				/>
			</TestStoreProvider>,
		);

		await user.click(screen.getByRole("button", { name: /delete monster/i }));

		expect(
			screen.getByRole("alertdialog", { name: /delete mucksnout/i }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /cancel/i }));

		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
	});

	it("delete success dispatches the expected state update and redirects", async () => {
		const user = userEvent.setup();
		const store = makeTestStore({
			status: "authenticated",
			user: {
				...validUserProfileWithMonsters,
				monsters: [validMonster],
			},
		});
		const fetchMock = vi
			.spyOn(global, "fetch")
			.mockResolvedValue(new Response(null, { status: 204 }));
		const onDeleted = vi.fn();

		render(
			<Provider store={store}>
				<DeleteMonsterDialog
					monsterId={validMonster.id}
					monsterName={validMonster.display_name}
					onDeleted={onDeleted}
				/>
			</Provider>,
		);

		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(`/api/monsters/${validMonster.id}`, {
				method: "DELETE",
			});
			expect(onDeleted).toHaveBeenCalledTimes(1);
			expect(mockPush).toHaveBeenCalledWith("/gallery");
			expect(mockToastSuccess).toHaveBeenCalledWith(`${validMonster.display_name} deleted.`);
				expect(store.getState().auth.status).toBe("authenticated");
		});

		const authState = store.getState().auth;
		expect(authState.status).toBe("authenticated");
		if (authState.status === "authenticated") {
			expect(authState.user.monsters).toHaveLength(0);
		}
	});

	it("delete failure shows an error toast and does NOT navigate away", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(null, { status: 500 }),
		);

		render(
			<TestStoreProvider authState={{ status: "authenticated", user: validUserProfileWithMonsters }}>
				<DeleteMonsterDialog
					monsterId={validMonster.id}
					monsterName={validMonster.display_name}
				/>
			</TestStoreProvider>,
		);

		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledWith(
				"Failed to delete monster. Please try again.",
			);
		});
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("network error shows a generic error toast and does NOT navigate away", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network failure"));

		render(
			<TestStoreProvider authState={{ status: "authenticated", user: validUserProfileWithMonsters }}>
				<DeleteMonsterDialog
					monsterId={validMonster.id}
					monsterName={validMonster.display_name}
				/>
			</TestStoreProvider>,
		);

		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledWith(
				"Something went wrong. Please try again.",
			);
		});
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("delete failure does NOT remove the monster from Redux state", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(null, { status: 500 }),
		);
		const store = makeTestStore({
			status: "authenticated",
			user: {
				...validUserProfileWithMonsters,
				monsters: [validMonster, validMonsterWithImage],
			},
		});

		render(
			<Provider store={store}>
				<DeleteMonsterDialog
					monsterId={validMonster.id}
					monsterName={validMonster.display_name}
				/>
			</Provider>,
		);

		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalled();
		});

		const auth = store.getState().auth;
		if (auth.status === "authenticated") {
			expect(auth.user.monsters).toHaveLength(2);
		}
	});

	it("deletes only the specified monster when multiple monsters exist in state", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(null, { status: 204 }),
		);
		const store = makeTestStore({
			status: "authenticated",
			user: {
				...validUserProfileWithMonsters,
				monsters: [validMonster, validMonsterWithImage],
			},
		});

		render(
			<Provider store={store}>
				<DeleteMonsterDialog
					monsterId={validMonster.id}
					monsterName={validMonster.display_name}
				/>
			</Provider>,
		);

		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith("/gallery");
		});

		const auth = store.getState().auth;
		if (auth.status === "authenticated") {
			expect(auth.user.monsters).toHaveLength(1);
			expect(auth.user.monsters[0].id).toBe(validMonsterWithImage.id);
		}
	});
});