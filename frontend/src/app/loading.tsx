import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
	return (
		<div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6">
			<Skeleton className="h-12 w-64 rounded-lg" />
			<Skeleton className="h-4 w-96 rounded" />
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} className="aspect-square rounded-xl" />
				))}
			</div>
		</div>
	);
}
