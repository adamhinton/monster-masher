/**
 * Formats an ISO date string into a human-readable date like "May 13, 2026".
 *
 * Returns "Unknown date" for null/undefined input.
 * Returns "Invalid date" for strings that cannot be parsed.
 */
export function formatDate(dateString: string | null | undefined): string {
	if (dateString == null) return "Unknown date";

	const date = new Date(dateString);

	// new Date() sets an invalid date rather than throwing
	if (isNaN(date.getTime())) return "Invalid date";

	// Use UTC to avoid off-by-one-day errors when the input has no time component.
	return new Intl.DateTimeFormat("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	}).format(date);
}
