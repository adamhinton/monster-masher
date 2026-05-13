// ________
// Tests for src/app/create/page.tsx  (/create)
// ________
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CreatePage from "@/app/create/page";

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

describe("CreatePage", () => {
	function renderCreatePage() {
		return render(<CreatePage />);
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
});
