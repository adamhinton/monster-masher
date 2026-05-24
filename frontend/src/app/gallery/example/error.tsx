// _______________
// Next.js route segment error boundary for /gallery/example.
// _______________

"use client";

import { useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ExampleGalleryErrorPageProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function ExampleGalleryErrorPage({
	error,
	reset,
}: ExampleGalleryErrorPageProps) {
	useEffect(() => {
		console.error("[ExampleGalleryErrorPage] digest:", error.digest ?? "none");
	}, [error]);

	return (
		<PageContainer size="marketing">
			<main>
				<section
					aria-labelledby="example-gallery-error-heading"
					className="flex flex-col items-center gap-6 py-24 text-center"
				>
					<Alert variant="destructive" className="max-w-md text-left">
						<AlertCircle />
						<AlertTitle id="example-gallery-error-heading">
							Could not load the example gallery
						</AlertTitle>
						<AlertDescription>
							This is probably temporary. Try again.
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
