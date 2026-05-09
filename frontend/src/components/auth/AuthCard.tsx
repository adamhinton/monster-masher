import {
	GalleryHorizontalEnd,
	Mail,
	ShieldCheck,
	Sparkles,
	WandSparkles,
	type LucideIcon,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmailAuthForm } from "./EmailAuthForm";

// TODO uncomment this (and the implementation of it) when we write EmailAuthForm
// import { EmailAuthForm } from "./EmailAuthForm";

type AuthCardProps = {
	readonly nextPath: string;
	readonly errorCode?: string;
};

type AuthBenefit = {
	readonly Icon: LucideIcon;
	readonly label: string;
	readonly description: string;
};

const authBenefits: readonly AuthBenefit[] = [
	{
		Icon: ShieldCheck,
		label: "Secure sign-in",
		description: "Magic links keep the flow simple without storing passwords.",
	},
	{
		Icon: GalleryHorizontalEnd,
		label: "Save your gallery",
		description: "Keep your favorite monsters tied to your account.",
	},
];

function shouldShowGenericAuthError(errorCode: string | undefined): boolean {
	return typeof errorCode === "string" && errorCode.trim().length > 0;
}

//  nextPath will be used when we write and uncomment EmailAuthForm
export function AuthCard({ nextPath, errorCode }: AuthCardProps) {
	const hasAuthError = shouldShowGenericAuthError(errorCode);

	return (
		<section
			aria-labelledby="auth-card-title"
			className="relative mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-6xl items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8"
		>
			<div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,var(--brand-primary-glow),transparent_34rem),radial-gradient(circle_at_bottom_right,var(--brand-accent-glow),transparent_30rem)]" />
			<div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

			<Card className="grid w-full overflow-hidden border-border/70 bg-card/90 shadow-2xl shadow-primary/10 backdrop-blur md:grid-cols-[1.05fr_0.95fr]">
				<div className="relative hidden min-h-full overflow-hidden border-r border-border/70 bg-secondary/35 p-8 md:block lg:p-10">
					<div className="absolute -left-16 top-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
					<div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-accent/60 blur-3xl" />

					<div className="relative flex h-full flex-col justify-between gap-10">
						<div>
							<Badge
								variant="secondary"
								className="mb-6 w-fit border border-border/70 bg-card/70 px-3 py-1 text-sm shadow-sm"
							>
								<Sparkles className="mr-1.5 size-3.5" aria-hidden="true" />
								Monster Masher account
							</Badge>

							<div className="space-y-4">
								<h2 className="max-w-sm text-4xl font-semibold tracking-tight text-foreground lg:text-5xl">
									Keep the weird little legends you create.
								</h2>
								<p className="max-w-md text-base text-muted-foreground">
									Sign in once, then save your favorite generated monsters,
									build a gallery, and come back to them later.
								</p>
							</div>
						</div>

						<div className="space-y-4">
							{authBenefits.map(({ Icon, label, description }) => (
								<div
									key={label}
									className="flex gap-3 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur"
								>
									<div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
										<Icon className="size-5" aria-hidden="true" />
									</div>
									<div>
										<p className="font-medium text-card-foreground">{label}</p>
										<p className="text-sm leading-6 text-muted-foreground">
											{description}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				<div className="p-5 sm:p-8 lg:p-10">
					<CardHeader className="px-0 pb-6">
						<div className="mb-5 flex size-14 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
							<WandSparkles className="size-7" aria-hidden="true" />
						</div>

						<div className="space-y-2">
							<CardTitle
								id="auth-card-title"
								className="text-3xl font-semibold tracking-tight sm:text-4xl"
							>
								Sign in to save your monsters.
							</CardTitle>
							<CardDescription className="text-base leading-7">
								Enter your email and we will send you a sign-in link.
							</CardDescription>
						</div>
					</CardHeader>

					<CardContent className="px-0">
						{hasAuthError ? (
							<Alert variant="destructive" className="mb-6">
								<Mail className="size-4" aria-hidden="true" />
								<AlertDescription>
									Could not complete sign-in. Please try again.
								</AlertDescription>
							</Alert>
						) : null}

						<EmailAuthForm nextPath={nextPath} />

						<Separator className="my-6" />
					</CardContent>
				</div>
			</Card>
		</section>
	);
}
