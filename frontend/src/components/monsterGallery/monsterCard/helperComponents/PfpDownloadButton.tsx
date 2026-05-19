// _______________
// Profile-picture download button.
//
// Two variants:
//   "icon"   — compact icon-only button for the MonsterCard footer.
//              Wrapped in a Tooltip so the action is discoverable.
//   "button" — labelled button for the MonsterDetailView actions panel.
//
// Both variants show a confirmation AlertDialog before triggering the download.
// Disabled and non-interactive when monster.image is null.
// _______________

"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";
import {
	downloadMonsterImage,
	getMonsterImageFilename,
} from "@/lib/monsterPictureDownload/downloadPicture";

export interface PfpDownloadButtonProps {
	monster: Monster;
	/**
	 * Visual style:
	 * - `"icon"` — icon-only ghost button; intended for the MonsterCard footer.
	 * - `"button"` — labelled outline button; intended for the detail page actions.
	 * @default "icon"
	 */
	variant?: "icon" | "button";
}

/**
 * Download icon button that prompts for confirmation before saving the
 * monster's image to the user's device.
 *
 * Disabled when `monster.image` is null — there is nothing to download.
 */
export function PfpDownloadButton({
	monster,
	variant = "icon",
}: PfpDownloadButtonProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);

	const hasImage = monster.image !== null;

	async function handleConfirmDownload() {
		if (!monster.image?.public_image_url) return;
		setIsDownloading(true);
		try {
			const filename = getMonsterImageFilename(
				monster as Monster & { image: NonNullable<Monster["image"]> },
			);
			const result = await downloadMonsterImage(
				monster.image.public_image_url,
				filename,
			);
			if (result.outcome === "success") {
				setIsOpen(false);
				toast.success(`${monster.display_name} saved to your device.`);
			} else {
				toast.error(result.safeErrorMessage);
			}
		} finally {
			setIsDownloading(false);
		}
	}

	const confirmDialog = (
		<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Download {monster.display_name}?</AlertDialogTitle>
					<AlertDialogDescription>
						Save {monster.display_name} as a profile picture. This will download
						the image to your device.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDownloading}>Cancel</AlertDialogCancel>
					<Button onClick={handleConfirmDownload} disabled={isDownloading}>
						{isDownloading ? "Downloading…" : "Download"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);

	if (variant === "button") {
		return (
			<>
				<Button
					variant="outline"
					size="sm"
					disabled={!hasImage}
					onClick={() => setIsOpen(true)}
				>
					<Download aria-hidden="true" />
					Download PFP
				</Button>
				{confirmDialog}
			</>
		);
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={!hasImage}
							aria-label={`Download ${monster.display_name} as profile picture`}
							onClick={() => setIsOpen(true)}
						/>
					}
				>
					<Download size={14} aria-hidden="true" />
				</TooltipTrigger>
				<TooltipContent>
					{hasImage
						? "Download as profile picture"
						: "No image to download yet"}
				</TooltipContent>
			</Tooltip>
			{confirmDialog}
		</TooltipProvider>
	);
}
