import { cn } from "@/lib/utils";

type ContainerSize = "marketing" | "form" | "detail" | "prose";

interface PageContainerProps {
	children: React.ReactNode;
	size?: ContainerSize;
	className?: string;
}

const sizeClasses: Record<ContainerSize, string> = {
	marketing: "max-w-7xl", // landing sections
	form: "max-w-5xl", // create/auth pages
	detail: "max-w-6xl", // gallery detail
	prose: "max-w-3xl", // text-heavy content
};

export function PageContainer({
	children,
	size = "marketing",
	className,
}: PageContainerProps) {
	return (
		<div
			className={cn(
				"mx-auto w-full px-4 py-8 sm:px-6 lg:py-12",
				sizeClasses[size],
				className,
			)}
		>
			{children}
		</div>
	);
}
