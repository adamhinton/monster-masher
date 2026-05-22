import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MonsterImageFrame } from "@/components/monsterGallery/monsterCard/helperComponents/MonsterImageFrame";
import { validMonsterWithImage } from "@/__tests__/__testUtils__/fixtures";

const altText = "Bogfire monster named Gloomspark";
const nullAlt = "Monster with no image";

describe("MonsterImageFrame — null image (no image generated)", () => {
	it("renders without errors", () => {
		render(<MonsterImageFrame image={null} variant="card" altText={nullAlt} />);
	});
	it("renders the ghost placeholder with correct accessible role and label", () => {
		render(<MonsterImageFrame image={null} variant="card" altText={nullAlt} />);
		expect(
			screen.getByRole("img", { name: /monster image — not yet available/i }),
		).toBeInTheDocument();
	});

	it("does NOT render an actual <img> element when there is no image", () => {
		const { container } = render(
			<MonsterImageFrame image={null} variant="card" altText={nullAlt} />,
		);
		expect(container.querySelector("img")).not.toBeInTheDocument();
	});

	it("shows the 'Image pending' label text in card variant", () => {
		render(<MonsterImageFrame image={null} variant="card" altText={nullAlt} />);
		expect(screen.getByText(/image pending/i)).toBeInTheDocument();
	});

	it("shows the 'Image pending' label text in detail variant", () => {
		render(
			<MonsterImageFrame image={null} variant="detail" altText={nullAlt} />,
		);
		expect(screen.getByText(/image pending/i)).toBeInTheDocument();
	});

	it("does NOT show 'Image pending' text in compact variant", () => {
		render(
			<MonsterImageFrame image={null} variant="compact" altText={nullAlt} />,
		);
		expect(screen.queryByText(/image pending/i)).not.toBeInTheDocument();
	});

	it("placeholder is NOT aria-hidden when no image is loaded — it is the only img", () => {
		render(<MonsterImageFrame image={null} variant="card" altText={nullAlt} />);
		const placeholder = screen.getByRole("img", {
			name: /monster image — not yet available/i,
		});
		expect(placeholder).not.toHaveAttribute("aria-hidden", "true");
	});
});

describe("MonsterImageFrame — with image URL, before load", () => {
	const image = validMonsterWithImage.image!;

	it("renders the <img> element with the correct alt text", () => {
		render(
			<MonsterImageFrame image={image} variant="card" altText={altText} />,
		);
		expect(screen.getByRole("img", { name: altText })).toBeInTheDocument();
	});

	it("the real <img> starts with opacity-0 (not yet loaded)", () => {
		render(
			<MonsterImageFrame image={image} variant="card" altText={altText} />,
		);
		const img = screen.getByRole("img", { name: altText });
		expect(img).toHaveClass("opacity-0");
	});

	it("the placeholder is still in the DOM while the image is loading", () => {
		render(
			<MonsterImageFrame image={image} variant="card" altText={altText} />,
		);
		// placeholder has role="img" but its name is the placeholder label
		expect(
			screen.getByRole("img", { name: /monster image — not yet available/i }),
		).toBeInTheDocument();
	});
});

describe("MonsterImageFrame — expandable preview", () => {
	const image = validMonsterWithImage.image!;

	it("does NOT render an expand button unless expansion is enabled", () => {
		render(
			<MonsterImageFrame image={image} variant="card" altText={altText} />,
		);
		expect(
			screen.queryByRole("button", {
				name: new RegExp(`expand image: ${altText}`, "i"),
			}),
		).not.toBeInTheDocument();
	});

	it("does NOT render an expand button when expansion is enabled but image is null", () => {
		render(
			<MonsterImageFrame
				image={null}
				variant="card"
				altText={nullAlt}
				isExpandable
			/>,
		);
		expect(
			screen.queryByRole("button", { name: /expand image/i }),
		).not.toBeInTheDocument();
	});

	it("opens a large accessible dialog preview for generated images", async () => {
		const user = userEvent.setup();

		render(
			<MonsterImageFrame
				image={image}
				variant="card"
				altText={altText}
				isExpandable
			/>,
		);

		await user.click(
			screen.getByRole("button", {
				name: new RegExp(`expand image: ${altText}`, "i"),
			}),
		);

		const dialog = await screen.findByRole("dialog", {
			name: /expanded monster image/i,
		});
		expect(dialog).toBeInTheDocument();
		expect(within(dialog).getByRole("img", { name: altText })).toHaveAttribute(
			"src",
			image.public_image_url,
		);
		expect(within(dialog).getByText(/press escape/i)).toHaveClass("sr-only");
	});

	it("removes the expand button after the source image errors", () => {
		const { container } = render(
			<MonsterImageFrame
				image={image}
				variant="card"
				altText={altText}
				isExpandable
			/>,
		);

		expect(
			screen.getByRole("button", {
				name: new RegExp(`expand image: ${altText}`, "i"),
			}),
		).toBeInTheDocument();

		const img = container.querySelector("img")!;
		fireEvent.error(img);

		expect(
			screen.queryByRole("button", { name: /expand image/i }),
		).not.toBeInTheDocument();
	});
});

describe("MonsterImageFrame — after load event fires", () => {
	const image = validMonsterWithImage.image!;

	it("renders without errors", () => {
		render(
			<MonsterImageFrame image={image} variant="card" altText={altText} />,
		);
	});

	it("real image becomes visible (opacity-100) after onLoad fires", () => {
		render(
			<MonsterImageFrame image={image} variant="card" altText={altText} />,
		);
		const img = screen.getByRole("img", { name: altText });
		fireEvent.load(img);
		expect(img).toHaveClass("opacity-100");
		expect(img).not.toHaveClass("opacity-0");
	});

	it("placeholder becomes aria-hidden after the image loads successfully", () => {
		render(
			<MonsterImageFrame image={image} variant="card" altText={altText} />,
		);
		const img = screen.getByRole("img", { name: altText });
		fireEvent.load(img);
		// placeholder is now aria-hidden so it's excluded from role queries — query by selector
		const { container } = render(
			<MonsterImageFrame image={image} variant="card" altText={altText} />,
		);
		const realImg = container.querySelector("img")!;
		fireEvent.load(realImg);
		const placeholder = container.querySelector("[role='img'][aria-label]");
		expect(placeholder).toHaveAttribute("aria-hidden", "true");
	});
});

describe("MonsterImageFrame — after error event fires", () => {
	const image = validMonsterWithImage.image!;

	it("removes the <img> element after an error and shows the placeholder", () => {
		const { container } = render(
			<MonsterImageFrame image={image} variant="card" altText={altText} />,
		);
		const img = container.querySelector("img")!;
		fireEvent.error(img);
		expect(container.querySelector("img")).not.toBeInTheDocument();
		// placeholder remains visible
		expect(
			screen.getByRole("img", { name: /monster image — not yet available/i }),
		).toBeInTheDocument();
	});
});

describe("MonsterImageFrame — variant sizing and decoration", () => {
	it("renders as a <figure> element", () => {
		const { container } = render(
			<MonsterImageFrame image={null} variant="card" altText={nullAlt} />,
		);
		expect(container.querySelector("figure")).toBeInTheDocument();
	});

	it("card variant renders corner markers (non-compact)", () => {
		const { container } = render(
			<MonsterImageFrame image={null} variant="card" altText={nullAlt} />,
		);
		const corners = container.querySelectorAll("span[aria-hidden='true']");
		// 4 corner markers + any others; at minimum the 4 corner spans are present
		expect(corners.length).toBeGreaterThanOrEqual(4);
	});

	it("detail variant renders corner markers (non-compact)", () => {
		const { container } = render(
			<MonsterImageFrame image={null} variant="detail" altText={nullAlt} />,
		);
		const corners = container.querySelectorAll("span[aria-hidden='true']");
		expect(corners.length).toBeGreaterThanOrEqual(4);
	});

	it("compact variant does NOT render corner markers", () => {
		const { container } = render(
			<MonsterImageFrame image={null} variant="compact" altText={nullAlt} />,
		);
		// CornerMarkers are conditionally rendered only when variant !== "compact"
		// each has aria-hidden="true" — there should be zero corner spans
		const corners = container.querySelectorAll("span[aria-hidden='true']");
		expect(corners).toHaveLength(0);
	});

	it("forwards a custom className to the outer figure", () => {
		const { container } = render(
			<MonsterImageFrame
				image={null}
				variant="card"
				altText={nullAlt}
				className="my-custom-class"
			/>,
		);
		expect(container.querySelector("figure")).toHaveClass("my-custom-class");
	});
});
