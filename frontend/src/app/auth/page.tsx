import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { getSafeNextPath } from "@/lib/auth/redirects";
import { createClientSSROnly } from "@/lib/supabase/server";
import { Route } from "next";

export const dynamic = "force-dynamic";

type AuthPageSearchParams = {
	readonly next?: string | readonly string[];
	readonly error?: string | readonly string[];
};

type AuthPageProps = {
	readonly searchParams: Promise<AuthPageSearchParams>;
};

function getSingleSearchParam(
	value: string | readonly string[] | undefined,
): string | null {
	if (typeof value === "string") {
		return value;
	}

	if (Array.isArray(value)) {
		return value[0] ?? null;
	}

	return null;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
	const params = await searchParams;

	const next = getSafeNextPath(getSingleSearchParam(params.next));
	const errorCode = getSingleSearchParam(params.error) ?? undefined;

	const supabase = await createClientSSROnly();
	const { data } = await supabase.auth.getUser();

	if (data.user) {
		// Statically generated nextjs urls aren't smart enough to recognize this dynamic auth link
		redirect(next as unknown as Route);
	}

	return <AuthCard nextPath={next} errorCode={errorCode} />;
}
