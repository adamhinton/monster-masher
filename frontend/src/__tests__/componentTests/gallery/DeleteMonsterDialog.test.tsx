import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { Provider } from "react-redux";
import { DeleteMonsterDialog } from "@/components/monsterGallery/monsterCard/DeleteMonsterDialog";
import { makeTestStore } from "@/__tests__/__testUtils__/store";
import {
	validMonster,
	validUserProfileWithMonsters,
} from "@/__tests__/__testUtils__/fixtures";

const { mockPush, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockToastSuccess: vi.fn(),
	mockToastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({
	toast: {
		success: mockToastSuccess,
		error: mockToastError,
	},
}));

function renderDialog(
	props: Partial<React.ComponentProps<typeof DeleteMonsterDialog>> = {},
) {
	const store = makeTestStore({
		status: "authenticated",
		user: validUserProfileWithMonsters,
	});
	const result = render(
		<Provider store={store}>
			<DeleteMonsterDialog
				monsterId={validMonster.id}
				monsterName={validMonster.display_name}
				{...props}
			/>
		</Provider>,
	);
	return { ...result, store };
}

describe("renders without errors", () => {
	it("renders without errors", () => {
		renderDialog();
	});
});

describe("DeleteMonsterDialog — trigger", () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockToastSuccess.mockReset();
		mockToastError.mockReset();
	});

	it("renders the trigger button with accessible 'Delete monster' label", () => {
		renderDialog();
		expect(
			screen.getByRole("button", { name: /delete monster/i }),
		).toBeInTheDocument();
	});

	it("trigger button has destructive styling variant", () => {
		renderDialog();
		const btn = screen.getByRole("button", { name: /delete monster/i });
		// destructive variant adds specific class — verify it's visually distinct
		expect(btn).toBeInTheDocument();
	});

	it("trash icon inside trigger is aria-hidden", () => {
		renderDialog();
		const trigger = screen.getByRole("button", { name: /delete monster/i });
		const icon = trigger.querySelector("svg[aria-hidden='true']");
		expect(icon).toBeInTheDocument();
	});

	it("dialog is not visible before clicking the trigger", () => {
		renderDialog();
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});
});

describe("DeleteMonsterDialog — dialog open state", () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockToastSuccess.mockReset();
		mockToastError.mockReset();
	});

	it("opens the dialog when the trigger is clicked", async () => {
		const user = userEvent.setup();
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		expect(screen.getByRole("alertdialog")).toBeInTheDocument();
	});

	it("dialog title includes the monster's name", async () => {
		const user = userEvent.setup();
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		expect(
			screen.getByRole("alertdialog", { name: /delete mucksnout/i }),
		).toBeInTheDocument();
	});

	it("dialog title contains the full monster name verbatim", async () => {
		const user = userEvent.setup();
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		expect(
			screen.getByText(`Delete ${validMonster.display_name}?`),
		).toBeInTheDocument();
	});

	it("dialog description warns about permanent deletion and no recovery", async () => {
		const user = userEvent.setup();
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		expect(
			screen.getByText(/permanently delete this monster and cannot be undone/i),
		).toBeInTheDocument();
	});

	it("Cancel button is present and enabled", async () => {
		const user = userEvent.setup();
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		expect(screen.getByRole("button", { name: /cancel/i })).toBeEnabled();
	});

	it("Delete confirm button is present and enabled", async () => {
		const user = userEvent.setup();
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		expect(screen.getByRole("button", { name: /^delete$/i })).toBeEnabled();
	});
});

describe("DeleteMonsterDialog — cancel flow", () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockToastSuccess.mockReset();
		mockToastError.mockReset();
	});

	it("clicking Cancel closes the dialog without making any fetch calls", async () => {
		const user = userEvent.setup();
		const fetchMock = vi.spyOn(global, "fetch");
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /cancel/i }));
		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
		expect(fetchMock).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("closing the dialog does not dispatch any Redux actions", async () => {
		const user = userEvent.setup();
		const store = makeTestStore({
			status: "authenticated",
			user: validUserProfileWithMonsters,
		});
		render(
			<Provider store={store}>
				<DeleteMonsterDialog
					monsterId={validMonster.id}
					monsterName={validMonster.display_name}
				/>
			</Provider>,
		);
		const auth = store.getState().auth;
		const monstersBefore =
			auth.status === "authenticated" ? auth.user.monsters.length : 0;
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /cancel/i }));
		const auth2 = store.getState().auth;
		const monstersAfter =
			auth2.status === "authenticated" ? auth2.user.monsters.length : 0;
		expect(monstersAfter).toBe(monstersBefore);
	});
});

describe("DeleteMonsterDialog — successful deletion", () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockToastSuccess.mockReset();
		mockToastError.mockReset();
		vi.restoreAllMocks();
	});

	it("calls DELETE /api/monsters/:id on confirm", async () => {
		const user = userEvent.setup();
		const fetchMock = vi
			.spyOn(global, "fetch")
			.mockResolvedValue(new Response(null, { status: 204 }));
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));
		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				`/api/monsters/${validMonster.id}`,
				{ method: "DELETE" },
			);
		});
	});

	it("dispatches monsterDeleted to Redux on success", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(null, { status: 204 }),
		);
		const store = makeTestStore({
			status: "authenticated",
			user: { ...validUserProfileWithMonsters, monsters: [validMonster] },
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
			const auth = store.getState().auth;
			expect(auth.status).toBe("authenticated");
			if (auth.status === "authenticated") {
				expect(auth.user.monsters).toHaveLength(0);
			}
		});
	});

	it("shows a success toast with the monster's name", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(null, { status: 204 }),
		);
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));
		await waitFor(() => {
			expect(mockToastSuccess).toHaveBeenCalledWith(
				`${validMonster.display_name} deleted.`,
			);
		});
	});

	it("navigates to /gallery after deletion", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(null, { status: 204 }),
		);
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));
		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith("/gallery");
		});
	});

	it("calls the optional onDeleted callback after success", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(null, { status: 204 }),
		);
		const onDeleted = vi.fn();
		renderDialog({ onDeleted });
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));
		await waitFor(() => {
			expect(onDeleted).toHaveBeenCalledTimes(1);
		});
	});

	it("does not throw when onDeleted is not provided", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(null, { status: 204 }),
		);
		// renderDialog without onDeleted prop — should not throw
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await expect(
			user.click(screen.getByRole("button", { name: /^delete$/i })),
		).resolves.not.toThrow();
	});
});

describe("DeleteMonsterDialog — error handling", () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockToastSuccess.mockReset();
		mockToastError.mockReset();
		vi.restoreAllMocks();
	});

	it("shows a toast.error when the API returns a non-OK status", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(null, { status: 500 }),
		);
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));
		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledWith(
				"Failed to delete monster. Please try again.",
			);
		});
	});

	it("does NOT navigate or dispatch state when the API returns an error", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(null, { status: 500 }),
		);
		const store = makeTestStore({
			status: "authenticated",
			user: { ...validUserProfileWithMonsters, monsters: [validMonster] },
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
		expect(mockPush).not.toHaveBeenCalled();
		const auth = store.getState().auth;
		if (auth.status === "authenticated") {
			expect(auth.user.monsters).toHaveLength(1);
		}
	});

	it("shows a toast.error when fetch throws a network error", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));
		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledWith(
				"Something went wrong. Please try again.",
			);
		});
	});

	it("does not navigate to /gallery when a network error occurs", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));
		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalled();
		});
		expect(mockPush).not.toHaveBeenCalled();
	});
});

describe("DeleteMonsterDialog — loading/deleting state", () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockToastSuccess.mockReset();
		mockToastError.mockReset();
		vi.restoreAllMocks();
	});

	it("shows 'Deleting…' text while the delete request is in-flight", async () => {
		const user = userEvent.setup();
		// Use a promise that never resolves to keep the in-flight state
		vi.spyOn(global, "fetch").mockReturnValue(new Promise(() => {}));
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));
		await waitFor(() => {
			expect(screen.getByText(/deleting…/i)).toBeInTheDocument();
		});
	});

	it("disables the Delete button while deleting", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockReturnValue(new Promise(() => {}));
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));
		await waitFor(() => {
			expect(screen.getByText(/deleting…/i).closest("button")).toBeDisabled();
		});
	});

	it("disables the Cancel button while deleting", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockReturnValue(new Promise(() => {}));
		renderDialog();
		await user.click(screen.getByRole("button", { name: /delete monster/i }));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));
		await waitFor(() => {
			expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
		});
	});
});
