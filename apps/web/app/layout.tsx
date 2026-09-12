import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";

import "./globals.css";

const siteUrl = "https://www.masterstcg.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "MastersTCG",
  title: {
    default: "MastersTCG | Sua coleção. Sua arena.",
    template: "%s | MastersTCG",
  },
  description:
    "Organize sua coleção de cartas, monte decks, participe de torneios e negocie com outros colecionadores no MastersTCG.",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/icon.png",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-icon.png",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "MastersTCG",
    title: "MastersTCG | Sua coleção. Sua arena.",
    description:
      "Organize sua coleção de cartas, monte decks, participe de torneios e negocie com outros colecionadores.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "MastersTCG — Sua coleção. Sua arena.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MastersTCG | Sua coleção. Sua arena.",
    description:
      "Organize sua coleção de cartas, monte decks, participe de torneios e negocie com outros colecionadores.",
    images: ["/twitter-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
