import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Void of Course Moon Scheduler",
  description: "A moon-aware scheduling widget that blocks bookings during VOC Moon windows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-100 text-slate-950">{children}</body>
    </html>
  );
}
