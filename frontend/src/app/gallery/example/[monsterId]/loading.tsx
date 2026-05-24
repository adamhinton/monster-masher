// _______________
// Next.js route segment loading UI for /gallery/example/[monsterId].
// _______________

import { PageContainer } from "@/components/layout/PageContainer";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExampleDetailLoadingPage() {
	return (
		<PageContainer size="detail">
			<main>
				<div className="mb-6">
					<Skeleton className="h-4 w-28" />
				</div>
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-[480px_1fr]">
					{/* Image skeleton */}
					<Skeleton className="aspect-square w-full max-w-120 rounded-3xl" />

					{/* Dossier skeleton */}
					<div className="flex flex-col gap-4">
						<Skeleton className="h-10 w-2/3" />
						<div className="flex gap-2">
							<Skeleton className="h-6 w-20 rounded-full" />
							<Skeleton className="h-6 w-24 rounded-full" />
						</div>
						<Skeleton className="h-5 w-full" />
						<Separator className="my-2" />
						<Skeleton className="h-32 w-full" />
						<div className="flex gap-3">
							<Skeleton className="h-10 w-40 rounded-lg" />
							<Skeleton className="h-10 w-36 rounded-lg" />
						</div>
					</div>
				</div>
			</main>
		</PageContainer>
	);
}
