import type { ReactNode } from "react";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
	emptyMonsterFormValues,
	type MonsterFormValues,
} from "@/components/monsterGeneration/monsterFormSchema";
import { GenerateMonsterForm } from "@/components/monsterGeneration/GenerateMonsterForm";
import { TestStoreProvider } from "../__testUtils__/store";
import { validUserProfile } from "../__testUtils__/fixtures";

type FormHarnessProps = {
	authState?:
		| { status: "anonymous" }
		| { status: "loading" }
		| { status: "authenticated"; user: typeof validUserProfile };
	initialValues?: MonsterFormValues;
	onClear?: () => void;
	onSubmit?: (formValues: MonsterFormValues) => void;
};

function FormHarness({
	authState = { status: "anonymous" },
	initialValues = emptyMonsterFormValues,
	onClear = vi.fn(),
	onSubmit = vi.fn(),
}: FormHarnessProps) {
	const [formValues, setFormValues] = useState(initialValues);

	return (
		<TestStoreProvider authState={authState}>
			<GenerateMonsterForm
				formValues={formValues}
				isSubmitting={false}
				isSubmitDisabled={false}
				onClear={() => {
					setFormValues(emptyMonsterFormValues);
					onClear();
				}}
				onFormValuesChange={setFormValues}
				onSubmit={onSubmit}
			/>
		</TestStoreProvider>
	);
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
	await user.type(screen.getByLabelText(/monster name/i), "Mossmaw");
	await user.type(screen.getByLabelText(/element/i), "Bogfire");
	await user.type(screen.getByLabelText(/habitat/i), "Cavern marsh");
	await user.type(screen.getByLabelText(/personality/i), "Mischievous");
	await user.type(
		screen.getByLabelText(/color palette/i),
		"Moss green and ember orange",
	);
}

describe("GenerateMonsterForm", () => {
	it("shows required field errors when submitted empty", async () => {
		const user = userEvent.setup();

		render(<FormHarness />);

		await user.click(screen.getByRole("button", { name: /generate monster/i }));

		expect(
			await screen.findByText(/give your monster a name or name inspiration/i),
		).toBeInTheDocument();
		expect(screen.getByText(/describe an element/i)).toBeInTheDocument();
		expect(screen.getByText(/describe a habitat/i)).toBeInTheDocument();
		expect(
			screen.getByText(/describe the monster's personality/i),
		).toBeInTheDocument();
		expect(screen.getByText(/describe the color palette/i)).toBeInTheDocument();
	});

	it("submits valid values for authenticated users and includes the email toggle", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();

		render(
			<FormHarness
				authState={{ status: "authenticated", user: validUserProfile }}
				onSubmit={onSubmit}
			/>,
		);

		expect(
			screen.getByRole("switch", { name: /email me when done/i }),
		).toBeInTheDocument();

		await fillRequiredFields(user);
		await user.click(
			screen.getByRole("switch", { name: /email me when done/i }),
		);
		await user.click(screen.getByRole("button", { name: /generate monster/i }));

		expect(onSubmit).toHaveBeenCalledWith({
			display_name: "Mossmaw",
			element: "Bogfire",
			habitat: "Cavern marsh",
			personality: "Mischievous",
			color_palette: "Moss green and ember orange",
			flavor_text: "",
			should_email_when_done: true,
		});
	});

	it("hides the email toggle for anonymous users", () => {
		render(<FormHarness authState={{ status: "anonymous" }} />);

		expect(
			screen.queryByRole("switch", { name: /email me when done/i }),
		).not.toBeInTheDocument();
	});

	it("forces should_email_when_done to false for anonymous submissions", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();

		render(
			<FormHarness
				authState={{ status: "anonymous" }}
				initialValues={{
					...emptyMonsterFormValues,
					should_email_when_done: true,
				}}
				onSubmit={onSubmit}
			/>,
		);

		await fillRequiredFields(user);
		await user.click(screen.getByRole("button", { name: /generate monster/i }));

		expect(onSubmit).toHaveBeenCalledWith({
			display_name: "Mossmaw",
			element: "Bogfire",
			habitat: "Cavern marsh",
			personality: "Mischievous",
			color_palette: "Moss green and ember orange",
			flavor_text: "",
			should_email_when_done: false,
		});
	});
});
