"use client";

import { ThemeProvider } from "next-themes";
import { Provider as ReduxProvider } from "react-redux";
import { Toaster } from "@/components/ui/sonner";
import { store } from "@/lib/store";
import { AuthWatcher } from "../auth/AuthWatcher";

interface ProvidersProps {
	children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<ReduxProvider store={store}>
				<AuthWatcher />
				{children}
				<Toaster richColors position="bottom-right" />
			</ReduxProvider>
		</ThemeProvider>
	);
}
