import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrintX · Simple printing, wherever you are",
  description: "Send documents to a nearby printer in just a few steps.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
