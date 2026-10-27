import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "TodoLizt — Your tasks, a little clearer",
  icons: {
    icon: [{ url: "/todolizt-icon-32.png", type: "image/png", sizes: "32x32" }],
    shortcut: "/favicon.ico",
    apple: [{ url: "/todolizt-apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  description: "Organize tasks, categories, and deadlines with a private browser-saved to-do list.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="font-sans antialiased"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}