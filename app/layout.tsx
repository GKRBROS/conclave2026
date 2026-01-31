import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arcane AI Image Generator",
  description: "Transform your photos into Arcane-style illustrations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Cal+Sans&display=swap');
          .cal-sans-regular {
            font-family: "Cal Sans", sans-serif;
            font-weight: 400;
            font-style: normal;
          }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
