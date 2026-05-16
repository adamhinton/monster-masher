// _______________
// Confirmation dialog for permanent monster deletion.
// Calls DELETE /api/monsters/[monsterId], dispatches monsterDeleted to Redux,
// then navigates back to /gallery.
// _______________

"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/lib/store/hooks";
import { monsterDeleted } from "../../../../store/authSlice";

export interface DeleteMonsterDialogProps {
	/** UUID of the monster to delete. */
	monsterId: string;
	/** Display name shown in the confirmation copy. */
	monsterName: string;
	/** Called after Redux state has been updated. Useful for redirecting. */
	onDeleted?: () => void;
}

/**
 * Renders a destructive "Delete monster" button that opens an AlertDialog
 * confirmation before calling the delete API route.
 */
export function DeleteMonsterDialog({
	monsterId,
	monsterName,
	onDeleted,
}: DeleteMonsterDialogProps) {
	const [open, setOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const dispatch = useAppDispatch();
	const router = useRouter();

	async function handleConfirmDelete() {
		setIsDeleting(true);
		try {
			// TODO write helper for this
			const response = await fetch(`/api/monsters/${monsterId}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				toast.error("Failed to delete monster. Please try again.");
				return;
			}

			dispatch(monsterDeleted(monsterId));
			setOpen(false);
			toast.success(`${monsterName} deleted.`);
			onDeleted?.();
			router.push("/gallery");
		} catch {
			toast.error("Something went wrong. Please try again.");
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
				<Trash2 aria-hidden="true" />
				Delete monster
			</AlertDialogTrigger>

			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete {monsterName}?</AlertDialogTitle>
					<AlertDialogDescription>
						This will permanently delete this monster and cannot be undone.
						There is no recovery option.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>

					<Button
						variant="destructive"
						onClick={handleConfirmDelete}
						disabled={isDeleting}
					>
						{isDeleting ? "Deleting…" : "Delete"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
