// _______________
// Email templates for image-generation-done notifications.
//
// All styles are inline — email clients strip external stylesheets and CSS
// variables. Color values approximate the brand tokens defined in globals.css:
//
//   light --primary  ≈ oklch(0.52 0.24 290) → #5533cc  (vivid violet)
//   light --background ≈ oklch(0.98 0.012 90) → #faf8f2 (warm cream)
//   dark  --primary  ≈ oklch(0.66 0.25 285) → #7c55f0  (bright violet)
//   dark  --background ≈ oklch(0.13 0.04 280) → #1a1630 (deep navy)
//
// Dark-mode is handled with a @media (prefers-color-scheme: dark) block as
// best-effort — not all email clients support it, but modern ones (Apple Mail,
// Outlook on iOS) do.
// _______________

import * as React from "react";
import type { ImageGenerationDoneScenario } from "@/lib/api/email/imageGenerationDoneTypes";
import { Monster } from "@/lib/api/schemas/monster/MonsterSchema";

// ─── Brand tokens for email (inline-style approximations) ────────────────────

const brandTokens = {
	// Light mode
	bgLight: "#faf8f2",
	cardLight: "#ffffff",
	borderLight: "#e8e3f5",
	fgLight: "#1b1933",
	mutedLight: "#6b6680",
	footerBorderLight: "#f0ecfa",
	// Dark mode (applied via CSS class + @media block in <style>)
	bgDark: "#1a1630",
	cardDark: "#231e3c",
	borderDark: "#3a3060",
	fgDark: "#f0eeff",
	mutedDark: "#8b84a8",
	footerBorderDark: "#2e2850",
	// Shared
	primaryViolet: "#5533cc",
	primaryVioletDark: "#7c55f0",
	dangerRed: "#9b1c1c",
	white: "#ffffff",
} as const;

// ─── Per-scenario copy ───────────────────────────────────────────────────────

/**
 * All user-visible copy for each scenario, keyed by `ImageGenerationDoneScenario`.
 * `satisfies` ensures exhaustiveness — add copy here when a new scenario is added.
 */
const SCENARIO_CONTENT: Record<
	ImageGenerationDoneScenario,
	{
		headerBg: string;
		emoji: string;
		heading: string;
		body: (monsterName?: string) => string;
		ctaLabel: string;
		ctaPath: (monsterId?: Monster["id"]) => string;
	}
> = {
	succeeded: {
		headerBg: brandTokens.primaryViolet,
		emoji: "🐉",
		heading: "Your monster is ready!",
		body: (monsterName?: string) =>
			monsterName
				? `Great news — your monster "${monsterName}" has been generated and is waiting in your gallery.`
				: "Great news — your monster has been generated and is waiting in your gallery.",
		ctaLabel: "View your monster",
		ctaPath: () => "/gallery",
	},
	"failed/moderation": {
		headerBg: brandTokens.dangerRed,
		emoji: "🚫",
		heading: "We couldn't create your monster",
		body: (monsterName?: string) =>
			monsterName
				? `Your monster "${monsterName}" was blocked by our content policy. Try adjusting the description and generating again.`
				: "Your monster was blocked by our content policy. Try adjusting the description and generating again.",
		ctaLabel: "Try again",
		ctaPath: (monsterId?: string) =>
			monsterId ? `/gallery/${monsterId}` : "/create",
	},
	"failed/network-error": {
		headerBg: brandTokens.dangerRed,
		emoji: "⚡",
		heading: "Generation ran into a problem",
		body: (monsterName?: string) =>
			monsterName
				? `We hit a snag while generating "${monsterName}". This is usually temporary — please try again.`
				: "We hit a temporary snag during generation. Please try again.",
		ctaLabel: "Try again",
		ctaPath: (monsterId?: string) =>
			monsterId ? `/gallery/${monsterId}` : "/create",
	},
	"failed/unspecified": {
		headerBg: brandTokens.dangerRed,
		emoji: "⚠️",
		heading: "Generation didn't complete",
		body: (monsterName?: string) =>
			monsterName
				? `Unfortunately "${monsterName}" couldn't be generated this time. Please try again.`
				: "Unfortunately your monster couldn't be generated this time. Please try again.",
		ctaLabel: "Try again",
		ctaPath: (monsterId?: Monster["id"]) =>
			monsterId ? `/gallery/${monsterId}` : "/create",
	},
};

// ─── Component ───────────────────────────────────────────────────────────────

export interface ImageGenerationDoneEmailProps {
	scenario: ImageGenerationDoneScenario;
	/** When provided, the monster's display name is woven into the email body. */
	monsterName?: Monster["display_name"];
	/**
	 * Optional monster id. When provided, failure email CTAs link to
	 * /gallery/{monsterId} so the user lands directly on the retry UI.
	 */
	monsterId?: Monster["id"];
	/**
	 * Base URL of the app (e.g. "https://monstermash.io").
	 * Used to build the CTA link so the email always points at the right environment.
	 */
	appUrl: string;
}

/**
 * Email template for image-generation-done notifications.
 *
 * Renders appropriate content for each {@link ImageGenerationDoneScenario}.
 * All styles are inline so the email renders correctly in major clients.
 * A best-effort `@media (prefers-color-scheme: dark)` block is included for
 * clients that support it (Apple Mail, Outlook on iOS, Gmail on iOS).
 */
export function ImageGenerationDoneEmail({
	scenario,
	monsterName,
	monsterId,
	appUrl,
}: ImageGenerationDoneEmailProps) {
	const content = SCENARIO_CONTENT[scenario];
	const ctaHref = `${appUrl}${content.ctaPath(monsterId)}`;

	return (
		<html lang="en">
			{/* eslint-disable-next-line @next/next/no-head-element  --- you're not supposed to use <head> in Next, but this is a simple React component sent in an email, not a Next component */}
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				{/* Hint to clients that we support both colour schemes */}
				<meta name="color-scheme" content="light dark" />
				<meta name="supported-color-schemes" content="light dark" />
				<title>{content.heading}</title>
				{/*
				 * Best-effort dark-mode overrides.
				 * Clients that don't support @media (prefers-color-scheme) simply
				 * display the inline light-mode styles, which is the safe fallback.
				 */}
				<style>{`
					@media (prefers-color-scheme: dark) {
						.em-body   { background-color: ${brandTokens.bgDark} !important; }
						.em-card   { background-color: ${brandTokens.cardDark} !important;
						             border-color: ${brandTokens.borderDark} !important; }
						.em-text   { color: ${brandTokens.fgDark} !important; }
						.em-muted  { color: ${brandTokens.mutedDark} !important; }
						.em-footer { border-top-color: ${brandTokens.footerBorderDark} !important; }
						.em-cta    { background-color: ${brandTokens.primaryVioletDark} !important; }
					}
				`}</style>
			</head>
			<body
				className="em-body"
				style={{
					margin: 0,
					padding: "32px 16px",
					backgroundColor: brandTokens.bgLight,
					fontFamily:
						'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
					WebkitTextSizeAdjust: "100%",
				}}
			>
				<main role="main" style={{ maxWidth: 560, margin: "0 auto" }}>
					{/* ── Card ── */}
					<article
						className="em-card"
						style={{
							backgroundColor: brandTokens.cardLight,
							border: `1px solid ${brandTokens.borderLight}`,
							borderRadius: 12,
							overflow: "hidden",
						}}
					>
						{/* ── Header band ── */}
						<header
							style={{
								backgroundColor: content.headerBg,
								padding: "28px 32px 24px",
								textAlign: "center",
							}}
						>
							{/* aria-hidden: the emoji is decorative; the heading conveys meaning */}
							<p
								aria-hidden="true"
								style={{ margin: 0, fontSize: 40, lineHeight: 1 }}
							>
								{content.emoji}
							</p>
							<h1
								style={{
									margin: "12px 0 0",
									color: brandTokens.white,
									fontSize: 22,
									fontWeight: 700,
									letterSpacing: "-0.02em",
									lineHeight: 1.2,
								}}
							>
								{content.heading}
							</h1>
						</header>

						{/* ── Body ── */}
						<section style={{ padding: "32px 32px 8px" }}>
							<p
								className="em-text"
								style={{
									margin: 0,
									color: brandTokens.fgLight,
									fontSize: 16,
									lineHeight: 1.65,
								}}
							>
								{content.body(monsterName)}
							</p>

							{/* CTA */}
							<p style={{ margin: "28px 0 0", textAlign: "center" }}>
								<a
									className="em-cta"
									href={ctaHref}
									style={{
										display: "inline-block",
										backgroundColor: brandTokens.primaryViolet,
										color: brandTokens.white,
										textDecoration: "none",
										fontWeight: 600,
										fontSize: 15,
										padding: "12px 28px",
										borderRadius: 8,
										letterSpacing: "-0.01em",
									}}
								>
									{content.ctaLabel}
								</a>
							</p>
						</section>

						{/* ── Footer ── */}
						<footer
							className="em-footer"
							style={{
								padding: "20px 32px 24px",
								borderTop: `1px solid ${brandTokens.footerBorderLight}`,
								textAlign: "center",
							}}
						>
							<p
								className="em-muted"
								style={{
									margin: 0,
									color: brandTokens.mutedLight,
									fontSize: 12,
									lineHeight: 1.5,
								}}
							>
								You&apos;re receiving this because you opted in to email
								notifications on Monster Masher.
							</p>
						</footer>
					</article>
				</main>
			</body>
		</html>
	);
}
