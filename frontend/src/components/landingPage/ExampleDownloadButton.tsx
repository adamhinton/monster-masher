// _______________
// Download button for example monster images.
//
// "use client" — wraps the fetch → blob → anchor download flow so it can be
// dropped into any server component that has a LandingExampleMonster.
//
// Disabled when imageUrl is null (schema allows nullable; examples always
// have one, but we guard anyway).

// TODO could probably consolidate this with PfpDownloadButton.tsx
// _______________

"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { downloadMonsterImage } from "@/lib/monsterPictureDownload/downloadPicture";

export interface ExampleDownloadButtonProps {
	/** Public URL of the monster portrait image. Null disables the button. */
	imageUrl: string | null;
	/** Suggested filename for the saved file, e.g. "magleta-fire-portrait.png". */
	filename: string;
	/** Monster name — used in the success toast. */
	monsterName: string;
	/** Extra Tailwind classes. */
	className?: string;
}

/**
 * Downloads the example monster's portrait to the user's device.
 * Shows a toast on success or failure.
 */
export function ExampleDownloadButton({
	imageUrl,
	filename,
	monsterName,
	className,
}: ExampleDownloadButtonProps) {
	const [isDownloading, setIsDownloading] = useState(false);

	async function handleDownload() {
		if (!imageUrl || isDownloading) return;
		setIsDownloading(true);
		try {
			const result = await downloadMonsterImage(imageUrl, filename);
			if (result.outcome === "success") {
				toast.success(`${monsterName} saved to your device.`);
			} else {
				toast.error(result.safeErrorMessage);
			}
		} finally {
			setIsDownloading(false);
		}
	}

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleDownload}
			disabled={!imageUrl || isDownloading}
			className={className}
		>
			<Download className="size-4" aria-hidden="true" />
			{isDownloading ? "Saving…" : "Download portrait"}
		</Button>
	);
}
