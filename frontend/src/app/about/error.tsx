// _______________
// Next.js route segment error boundary for /about.
// Shown when an unexpected error is thrown inside the about page tree.
// _______________

"use client";

import { useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface AboutErrorPageProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function AboutErrorPage({ error, reset }: AboutErrorPageProps) {
	useEffect(() => {
		// Log the opaque digest only — never log error.message, it may contain sensitive data.
		console.error("[AboutErrorPage] digest:", error.digest ?? "none");
	}, [error]);

	return (
		<PageContainer size="marketing">
			<main>
				<section
					aria-labelledby="about-error-heading"
					className="flex flex-col items-center gap-6 py-24 text-center"
				>
					<Alert variant="destructive" className="max-w-md text-left">
						<AlertCircle />
						<AlertTitle id="about-error-heading">
							Could not load the page
						</AlertTitle>
						<AlertDescription>
							Something went wrong. This is probably temporary — try again.
						</AlertDescription>
					</Alert>

					<Button variant="outline" onClick={reset}>
						Retry
					</Button>
				</section>
			</main>
		</PageContainer>
	);
}
