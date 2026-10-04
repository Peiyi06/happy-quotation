import type { Metadata } from "next";
import "./globals.css";
import "./quotation-pricing.css";

export const metadata: Metadata = {
  title: "Happy Express Quotation Calculator",
  description: "Travel quotation calculator for Happy Express Travel"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hans">
      <body>{children}</body>
    </html>
  );
}
