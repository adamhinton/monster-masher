// ____________
// Root route — redirects to /about (the recruiter-facing landing page).
// ____________

import { redirect } from "next/navigation";

export default function Home() {
	redirect("/about");
}
