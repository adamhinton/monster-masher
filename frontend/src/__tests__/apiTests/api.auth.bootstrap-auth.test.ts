// ________
// Tests for src/app/api/auth/bootstrap-auth/route.ts  (POST /api/auth/bootstrap-auth)
// ________
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClientSSROnly } from "@/lib/supabase/server";
import { fetchLoggedInDjangoUserProfile } from "@/lib/django/fetchFromDjango";
import * as Sentry from "@sentry/nextjs";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
	createClientSSROnly: vi.fn(),
}));

vi.mock("@/lib/django/fetchFromDjango", () => ({
	fetchLoggedInDjangoUserProfile: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
}));

import { POST } from "@/app/api/auth/bootstrap-auth/route";
import {
	validUserProfile,
	validUserProfileWithMonsters,
} from "../__testUtils__/fixtures";

function makeSupabaseClient({
	claimsError = null as Error | null,
	sub = "some-supabase-user-id" as string | null,
	accessToken = "valid-access-token" as string | null,
} = {}) {
	return {
		auth: {
			getClaims: vi.fn().mockResolvedValue({
				data: sub !== null ? { claims: { sub } } : null,
				error: claimsError,
			}),
			getSession: vi.fn().mockResolvedValue({
				data: {
					session: accessToken !== null ? { access_token: accessToken } : null,
				},
				error: null,
			}),
		},
	};
}

describe("POST /api/auth/bootstrap-auth", () => {
	beforeEach(() => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient() as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		vi.mocked(fetchLoggedInDjangoUserProfile).mockResolvedValue(
			validUserProfile,
		);
	});

	it("returns 200 { user } on full success", async () => {
		const res = await POST();
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.user.email).toBe("test@example.com");
	});

	it("returns user with monsters array in body", async () => {
		const res = await POST();
		const body = await res.json();
		expect(Array.isArray(body.user.monsters)).toBe(true);
	});

	it("returns user with populated monsters when Django returns them", async () => {
		vi.mocked(fetchLoggedInDjangoUserProfile).mockResolvedValueOnce(
			validUserProfileWithMonsters,
		);
		const res = await POST();
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.user.monsters).toHaveLength(2);
		expect(body.user.monsters[0].display_name).toBe("Gloomspark");
	});

	it("monster entries include expected fields", async () => {
		vi.mocked(fetchLoggedInDjangoUserProfile).mockResolvedValueOnce(
			validUserProfileWithMonsters,
		);
		const res = await POST();
		const body = await res.json();
		const monster = body.user.monsters[0];
		expect(monster).toHaveProperty("id");
		expect(monster).toHaveProperty("display_name");
		expect(monster).toHaveProperty("traits");
		expect(monster).toHaveProperty("image");
	});

	it("monster image is null when no image has been generated", async () => {
		vi.mocked(fetchLoggedInDjangoUserProfile).mockResolvedValueOnce(
			validUserProfileWithMonsters,
		);
		const res = await POST();
		const body = await res.json();
		// validMonster (second in the list) has image: null
		const monsterWithoutImage = body.user.monsters[1];
		expect(monsterWithoutImage.image).toBeNull();
	});

	it("monster image contains expected fields when present", async () => {
		vi.mocked(fetchLoggedInDjangoUserProfile).mockResolvedValueOnce(
			validUserProfileWithMonsters,
		);
		const res = await POST();
		const body = await res.json();
		// validMonsterWithImage (first in the list) has an image
		const image = body.user.monsters[0].image;
		expect(image).not.toBeNull();
		expect(image).toHaveProperty("id");
		expect(image).toHaveProperty("public_image_url");
		expect(image).toHaveProperty("provider");
	});

	it("returns 401 not_authenticated when getClaims errors", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient({
				claimsError: new Error("bad"),
			}) as unknown as Awaited<ReturnType<typeof createClientSSROnly>>,
		);
		const res = await POST();
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("not_authenticated");
	});

	it("returns 401 not_authenticated when claims has no sub", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient({ sub: null }) as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		const res = await POST();
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("not_authenticated");
	});

	it("returns 401 missing_access_token when session has no token", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient({ accessToken: null }) as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		const res = await POST();
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("missing_access_token");
	});

	it("returns 500 django_fetch_failed when fetchLoggedInDjangoUserProfile throws", async () => {
		vi.mocked(fetchLoggedInDjangoUserProfile).mockRejectedValueOnce(
			new Error("Django down"),
		);
		const res = await POST();
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe("django_fetch_failed");
	});

	it("calls Sentry.captureException when Django fetch throws", async () => {
		vi.mocked(fetchLoggedInDjangoUserProfile).mockRejectedValueOnce(
			new Error("Django down"),
		);
		await POST();
		expect(Sentry.captureException).toHaveBeenCalled();
	});
});
