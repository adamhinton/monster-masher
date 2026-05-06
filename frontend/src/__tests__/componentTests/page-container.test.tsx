import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageContainer } from "@/components/layout/PageContainer";

describe("PageContainer", () => {
	it("renders children", () => {
		render(<PageContainer>Hello world</PageContainer>);
		expect(screen.getByText("Hello world")).toBeInTheDocument();
	});

	it("accepts a custom className", () => {
		const { container } = render(
			<PageContainer className="my-custom-class">content</PageContainer>,
		);
		expect(container.firstChild).toHaveClass("my-custom-class");
	});
});
