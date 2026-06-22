import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeetingMind",
  description: "A simple personal meeting memory assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
