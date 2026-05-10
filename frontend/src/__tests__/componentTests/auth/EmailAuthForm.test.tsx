// ________
// Tests for src/components/auth/EmailAuthForm.tsx
// ________
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailAuthForm } from "@/components/auth/EmailAuthForm";

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

function makeOkResponse(body: unknown = { ok: true }) {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

function makeErrorResponse(status = 500) {
	return new Response(
		JSON.stringify({ error: { code: "err", message: "fail" } }),
		{
			status,
			headers: { "Content-Type": "application/json" },
		},
	);
}

describe("EmailAuthForm", () => {
	const user = userEvent.setup();
	const mockFetch = vi.fn<typeof fetch>();

	beforeEach(() => {
		vi.stubGlobal("fetch", mockFetch);
		mockFetch.mockResolvedValue(makeOkResponse());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		mockFetch.mockReset();
	});

	it("renders without crashing", () => {
		render(<EmailAuthForm nextPath="/gallery" />);
	});

	it("renders the email input and submit button", () => {
		render(<EmailAuthForm nextPath="/gallery" />);
		expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /send sign-in link/i }),
		).toBeInTheDocument();
	});

	it("shows a validation error when submitted with an empty field", async () => {
		render(<EmailAuthForm nextPath="/gallery" />);
		await user.click(
			screen.getByRole("button", { name: /send sign-in link/i }),
		);
		expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
	});

	it("shows a validation error for an invalid email format", async () => {
		render(<EmailAuthForm nextPath="/gallery" />);
		await user.type(
			screen.getByRole("textbox", { name: /email/i }),
			"notanemail",
		);
		await user.click(
			screen.getByRole("button", { name: /send sign-in link/i }),
		);
		expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
	});

	it("clears the validation error when the user starts typing again", async () => {
		render(<EmailAuthForm nextPath="/gallery" />);
		const input = screen.getByRole("textbox", { name: /email/i });
		await user.click(
			screen.getByRole("button", { name: /send sign-in link/i }),
		);
		await screen.findByText(/valid email/i);
		await user.type(input, "a");
		expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
	});

	it("POSTs to /api/auth/sign-in with the email and nextPath on valid submit", async () => {
		render(<EmailAuthForm nextPath="/gallery" />);
		await user.type(
			screen.getByRole("textbox", { name: /email/i }),
			"user@example.com",
		);
		await user.click(
			screen.getByRole("button", { name: /send sign-in link/i }),
		);
		await waitFor(() => expect(mockFetch).toHaveBeenCalled());
		expect(mockFetch).toHaveBeenCalledWith(
			"/api/auth/sign-in",
			expect.objectContaining({
				method: "POST",
				body: expect.stringContaining('"user@example.com"'),
			}),
		);
		const body = JSON.parse(
			(mockFetch.mock.calls[0]![1] as RequestInit).body as string,
		);
		expect(body.next).toBe("/gallery");
	});

	it("sends the email normalised to lowercase", async () => {
		render(<EmailAuthForm nextPath="/gallery" />);
		await user.type(
			screen.getByRole("textbox", { name: /email/i }),
			"USER@Example.COM",
		);
		await user.click(
			screen.getByRole("button", { name: /send sign-in link/i }),
		);
		await waitFor(() => expect(mockFetch).toHaveBeenCalled());
		const body = JSON.parse(
			(mockFetch.mock.calls[0]![1] as RequestInit).body as string,
		);
		expect(body.email).toBe("user@example.com");
	});

	it("disables the button and shows Sending... while the request is in flight", async () => {
		// Never resolve so we can inspect mid-flight state
		mockFetch.mockReturnValueOnce(new Promise(() => {}));
		render(<EmailAuthForm nextPath="/gallery" />);
		await user.type(
			screen.getByRole("textbox", { name: /email/i }),
			"user@example.com",
		);
		await user.click(
			screen.getByRole("button", { name: /send sign-in link/i }),
		);
		expect(
			await screen.findByRole("button", { name: /sending/i }),
		).toBeDisabled();
	});

	it("shows Check your email success state with the submitted email", async () => {
		render(<EmailAuthForm nextPath="/gallery" />);
		await user.type(
			screen.getByRole("textbox", { name: /email/i }),
			"user@example.com",
		);
		await user.click(
			screen.getByRole("button", { name: /send sign-in link/i }),
		);
		expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
		expect(screen.getByText("user@example.com")).toBeInTheDocument();
	});

	it("shows a generic error message when the response is not ok", async () => {
		mockFetch.mockResolvedValueOnce(makeErrorResponse(500));
		render(<EmailAuthForm nextPath="/gallery" />);
		await user.type(
			screen.getByRole("textbox", { name: /email/i }),
			"user@example.com",
		);
		await user.click(
			screen.getByRole("button", { name: /send sign-in link/i }),
		);
		expect(
			await screen.findByText(/could not send sign-in link/i),
		).toBeInTheDocument();
	});

	it("shows a connection error message when fetch throws", async () => {
		mockFetch.mockRejectedValueOnce(new TypeError("Network error"));
		render(<EmailAuthForm nextPath="/gallery" />);
		await user.type(
			screen.getByRole("textbox", { name: /email/i }),
			"user@example.com",
		);
		await user.click(
			screen.getByRole("button", { name: /send sign-in link/i }),
		);
		expect(
			await screen.findByText(/check your connection/i),
		).toBeInTheDocument();
	});
});
