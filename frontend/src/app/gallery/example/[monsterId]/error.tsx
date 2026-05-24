// _______________
// Next.js route segment error boundary for /gallery/example/[monsterId].
// _______________

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ExampleDetailErrorPageProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function ExampleDetailErrorPage({
	error,
	reset,
}: ExampleDetailErrorPageProps) {
	useEffect(() => {
		console.error("[ExampleDetailErrorPage] digest:", error.digest ?? "none");
	}, [error]);

	return (
		<PageContainer size="detail">
			<main>
				<section
					aria-labelledby="example-detail-error-heading"
					className="flex flex-col items-center gap-6 py-24 text-center"
				>
					<Alert variant="destructive" className="max-w-md text-left">
						<AlertCircle />
						<AlertTitle id="example-detail-error-heading">
							Could not load this monster
						</AlertTitle>
						<AlertDescription>
							This is probably temporary. Try again.
						</AlertDescription>
					</Alert>

					<div className="flex gap-3">
						<Button variant="outline" onClick={reset}>
							Retry
						</Button>
						<Link
							href="/gallery/example"
							className={buttonVariants({ variant: "ghost" })}
						>
							<ArrowLeft aria-hidden="true" className="size-4" />
							Back to examples
						</Link>
					</div>
				</section>
			</main>
		</PageContainer>
	);
}
