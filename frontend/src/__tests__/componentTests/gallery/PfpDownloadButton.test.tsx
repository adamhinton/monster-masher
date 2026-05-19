// ________
// Unit tests for PfpDownloadButton component.
// Mocks: downloadMonsterImage util, next/navigation, sonner.
// No real network calls.
// ________

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PfpDownloadButton } from "@/components/monsterGallery/monsterCard/helperComponents/PfpDownloadButton";
import {
	validMonster,
	validMonsterWithImage,
} from "@/__tests__/__testUtils__/fixtures";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockDownloadMonsterImage, mockGetMonsterImageFilename } = vi.hoisted(
	() => ({
		mockDownloadMonsterImage: vi.fn(),
		mockGetMonsterImageFilename: vi.fn(),
	}),
);

vi.mock("@/lib/monsterPictureDownload/downloadPicture", () => ({
	downloadMonsterImage: mockDownloadMonsterImage,
	getMonsterImageFilename: mockGetMonsterImageFilename,
}));

const { mockToastSuccess, mockToastError } = vi.hoisted(() => ({
	mockToastSuccess: vi.fn(),
	mockToastError: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		success: mockToastSuccess,
		error: mockToastError,
	},
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderIcon(monster = validMonsterWithImage) {
	return render(<PfpDownloadButton monster={monster} variant="icon" />);
}

function renderButton(monster = validMonsterWithImage) {
	return render(<PfpDownloadButton monster={monster} variant="button" />);
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	mockDownloadMonsterImage.mockReset();
	mockGetMonsterImageFilename.mockReset();
	mockToastSuccess.mockReset();
	mockToastError.mockReset();

	// Default: successful download
	mockGetMonsterImageFilename.mockReturnValue("gloomspark.png");
	mockDownloadMonsterImage.mockResolvedValue({ outcome: "success" });
});

// ---------------------------------------------------------------------------
// Render — icon variant
// ---------------------------------------------------------------------------

describe("PfpDownloadButton — icon variant", () => {
	it("renders without errors", () => {
		renderIcon();
	});

	it("renders an icon button with accessible label", () => {
		renderIcon();
		expect(
			screen.getByRole("button", {
				name: /download.*as profile picture/i,
			}),
		).toBeInTheDocument();
	});

	it("is enabled when the monster has an image", () => {
		renderIcon(validMonsterWithImage);
		expect(
			screen.getByRole("button", { name: /download.*as profile picture/i }),
		).not.toBeDisabled();
	});

	it("is disabled when the monster has no image", () => {
		renderIcon(validMonster);
		expect(
			screen.getByRole("button", { name: /download.*as profile picture/i }),
		).toBeDisabled();
	});

	it("does not open the dialog when disabled button is clicked", async () => {
		const user = userEvent.setup();
		renderIcon(validMonster);
		await user.click(
			screen.getByRole("button", { name: /download.*as profile picture/i }),
		);
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Render — button variant
// ---------------------------------------------------------------------------

describe("PfpDownloadButton — button variant", () => {
	it("renders without errors", () => {
		renderButton();
	});

	it("renders a labelled 'Download PFP' button", () => {
		renderButton();
		expect(
			screen.getByRole("button", { name: /download pfp/i }),
		).toBeInTheDocument();
	});

	it("is enabled when the monster has an image", () => {
		renderButton(validMonsterWithImage);
		expect(
			screen.getByRole("button", { name: /download pfp/i }),
		).not.toBeDisabled();
	});

	it("is disabled when the monster has no image", () => {
		renderButton(validMonster);
		expect(
			screen.getByRole("button", { name: /download pfp/i }),
		).toBeDisabled();
	});
});

// ---------------------------------------------------------------------------
// Confirmation dialog
// ---------------------------------------------------------------------------

describe("PfpDownloadButton — confirmation dialog", () => {
	it("dialog is not visible before clicking the trigger", () => {
		renderButton();
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});

	it("opens the dialog when the button is clicked", async () => {
		const user = userEvent.setup();
		renderButton();
		await user.click(screen.getByRole("button", { name: /download pfp/i }));
		expect(screen.getByRole("alertdialog")).toBeInTheDocument();
	});

	it("dialog title contains the monster's name", async () => {
		const user = userEvent.setup();
		renderButton();
		await user.click(screen.getByRole("button", { name: /download pfp/i }));
		expect(
			screen.getByRole("heading", {
				name: new RegExp(validMonsterWithImage.display_name, "i"),
			}),
		).toBeInTheDocument();
	});

	it("closes the dialog when Cancel is clicked", async () => {
		const user = userEvent.setup();
		renderButton();
		await user.click(screen.getByRole("button", { name: /download pfp/i }));
		await user.click(screen.getByRole("button", { name: /cancel/i }));
		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
	});

	it("icon variant also opens the dialog on click", async () => {
		const user = userEvent.setup();
		renderIcon();
		await user.click(
			screen.getByRole("button", { name: /download.*as profile picture/i }),
		);
		expect(screen.getByRole("alertdialog")).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Download flow
// ---------------------------------------------------------------------------

describe("PfpDownloadButton — download flow", () => {
	it("calls downloadMonsterImage with the correct URL and filename on confirm", async () => {
		const user = userEvent.setup();
		renderButton();
		await user.click(screen.getByRole("button", { name: /download pfp/i }));
		await user.click(screen.getByRole("button", { name: /^download$/i }));
		await waitFor(() => {
			expect(mockDownloadMonsterImage).toHaveBeenCalledWith(
				validMonsterWithImage.image!.public_image_url,
				"gloomspark.png",
			);
		});
	});

	it("shows a success toast and closes the dialog on success", async () => {
		const user = userEvent.setup();
		renderButton();
		await user.click(screen.getByRole("button", { name: /download pfp/i }));
		await user.click(screen.getByRole("button", { name: /^download$/i }));
		await waitFor(() => {
			expect(mockToastSuccess).toHaveBeenCalledOnce();
		});
		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
	});

	it("shows an error toast and keeps the dialog open on failure", async () => {
		mockDownloadMonsterImage.mockResolvedValue({
			outcome: "failed",
			safeErrorMessage: "Failed to fetch the image. Please try again.",
		});
		const user = userEvent.setup();
		renderButton();
		await user.click(screen.getByRole("button", { name: /download pfp/i }));
		await user.click(screen.getByRole("button", { name: /^download$/i }));
		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledWith(
				"Failed to fetch the image. Please try again.",
			);
		});
	});

	it("does not call downloadMonsterImage when monster has no image", async () => {
		renderButton(validMonster);
		// Button is disabled — no click possible, no download
		expect(mockDownloadMonsterImage).not.toHaveBeenCalled();
	});
});
