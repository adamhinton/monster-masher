// This is for testing
// here I will display various gallery components with complete monster data, so i know what htey look like
// TODO delete this when testing is done; but this route is blocked in prod in proxy.ts so it's not a big deal if it stays in
// Base fake monsters on MonsterSchema.ts

export default function DevGalleryPage() {
	return (
		<div className="flex h-screen items-center justify-center">
			<h1 className="text-4xl font-bold">Gallery Page</h1>
		</div>
	);
}
