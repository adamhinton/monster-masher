import "server-only";

import { env } from "@/lib/env/env";
import type { ImageProvider } from "./providersType";
import { FakeImageProvider } from "./fakeProviderType";
import { VercelAIGatewayImageProvider } from "./vercelAIGatewayImageProvider";

/**
 * Returns the correct ImageProvider for the current IMAGE_GENERATION_MODE.
 *
 *   IMAGE_GENERATION_MODE=fake → FakeImageProvider
 *     No real API calls. Safe for development, CI, and all test environments.
 *     Does not require an OpenAI API key.
 *
 *   IMAGE_GENERATION_MODE=real → VercelAIGatewayImageProvider
 *     Live API calls via the OpenAI Images API. Costs money. Requires
 *     OPENAI_API_KEY to be set in the server environment.
 *
 * Route handlers MUST call this factory rather than importing provider classes
 * directly. Keeping provider selection here means:
 *   - Switching modes requires only an env var change, not a code change.
 *   - The route handler stays decoupled from provider implementation details.
 *   - Tests can bypass the factory entirely and pass a FakeImageProvider
 *     (or a custom test double) directly — no process.env gymnastics needed.
 */
export function getImageProvider(): ImageProvider {
	if (env.imageGenerationMode === "fake") {
		return new FakeImageProvider();
	}

	return new VercelAIGatewayImageProvider();
}
