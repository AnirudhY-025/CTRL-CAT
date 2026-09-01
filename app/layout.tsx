import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caterpillar Rental Ops",
  description: "Equipment movement and utilization control for rental operations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
