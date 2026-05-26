"use client";

import { CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Route } from "next";

type EmailAuthFormProps = {
	readonly nextPath: string;
};

type EmailAuthFormState =
	| { readonly status: "idle" }
	| { readonly status: "submitting" }
	| { readonly status: "success" }
	| { readonly status: "validation_error"; readonly message: string }
	| { readonly status: "request_error"; readonly message: string };

const emailSignInSchema = z.object({
	email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export function EmailAuthForm({ nextPath }: EmailAuthFormProps) {
	const emailInputId = useId();
	const emailErrorId = useId();
	const [email, setEmail] = useState("");
	const [formState, setFormState] = useState<EmailAuthFormState>({
		status: "idle",
	});

	const isSubmitting = formState.status === "submitting";
	const isSuccess = formState.status === "success";
	const errorMessage =
		formState.status === "validation_error" ||
		formState.status === "request_error"
			? formState.message
			: null;

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const parsed = emailSignInSchema.safeParse({ email });

		if (!parsed.success) {
			setFormState({
				status: "validation_error",
				message:
					parsed.error.issues[0]?.message ?? "Enter a valid email address.",
			});
			return;
		}

		setFormState({ status: "submitting" });

		try {
			// Won't compile if the route path drifts
			const signInAuthRoute: Route = "/api/auth/sign-in";
			const response = await fetch(signInAuthRoute, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: parsed.data.email,
					next: nextPath,
				}),
			});

			if (!response.ok) {
				setFormState({
					status: "request_error",
					message: "Could not send sign-in link. Please try again.",
				});
				return;
			}

			setFormState({ status: "success" });
		} catch {
			setFormState({
				status: "request_error",
				message: "Could not send sign-in link. Please check your connection.",
			});
		}
	}

	if (isSuccess) {
		return (
			<Alert className="border-primary/30 bg-primary/10 text-foreground">
				<CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
				<AlertDescription className="space-y-1">
					<span className="block font-medium">Check your email.</span>
					<span className="block text-muted-foreground">
						We sent a magic sign-in link to{" "}
						<span className="font-medium text-foreground">{email}</span>.
					</span>
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<form className="space-y-5" onSubmit={handleSubmit} noValidate>
			<div className="space-y-2">
				<Label htmlFor={emailInputId}>Email address</Label>

				<div className="relative">
					<Mail
						className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
					<Input
						id={emailInputId}
						name="email"
						type="email"
						inputMode="email"
						autoComplete="email"
						value={email}
						onChange={(event) => {
							setEmail(event.currentTarget.value);

							if (formState.status === "validation_error") {
								setFormState({ status: "idle" });
							}
						}}
						placeholder="you@example.com"
						disabled={isSubmitting}
						aria-invalid={formState.status === "validation_error"}
						aria-describedby={errorMessage ? emailErrorId : undefined}
						className="h-12 pl-10 text-base"
					/>
				</div>

				{errorMessage ? (
					<p id={emailErrorId} className="text-sm text-destructive">
						{errorMessage}
					</p>
				) : (
					<p className="text-sm text-muted-foreground">
						No password or payment needed. We’ll send you a secure magic link.
					</p>
				)}
			</div>

			<Button
				type="submit"
				className="h-12 w-full text-base"
				disabled={isSubmitting}
			>
				{isSubmitting ? (
					<>
						<Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
						Sending link...
					</>
				) : (
					<>
						<Send className="mr-2 size-4" aria-hidden="true" />
						Send sign-in link
					</>
				)}
			</Button>
		</form>
	);
}
