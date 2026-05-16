// ______________
// Next.js route segment error boundary for /gallery.
// Shown when an unexpected error is thrown inside the gallery page tree.
// ______________

"use client";

import { useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface GalleryErrorPageProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function GalleryErrorPage({
	error,
	reset,
}: GalleryErrorPageProps) {
	useEffect(() => {
		// Log the opaque digest only — never log error.message, it may contain sensitive data.
		console.error("[GalleryErrorPage] digest:", error.digest ?? "none");
	}, [error]);

	return (
		<PageContainer size="marketing">
			<main>
				<section
					aria-labelledby="gallery-error-heading"
					className="flex flex-col items-center gap-6 py-24 text-center"
				>
					{/* ── Error alert ──────────────────────────────────────────── */}
					<Alert variant="destructive" className="max-w-md text-left">
						<AlertCircle />
						<AlertTitle id="gallery-error-heading">
							Could not load your monsters
						</AlertTitle>
						<AlertDescription>
							This is probably temporary. Try again.
						</AlertDescription>
					</Alert>

					{/* ── Retry action ─────────────────────────────────────────── */}
					<Button variant="outline" onClick={reset}>
						Retry
					</Button>
				</section>
			</main>
		</PageContainer>
	);
}
