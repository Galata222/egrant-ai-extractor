import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { InlineScript } from "@/components/inline-script";
import { LocaleProvider } from "@/lib/locale";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "eGrant extrakcia",
  description: "Overenie údajov z dokladu pred uložením do žiadosti",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sk" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700&f[]=general-sans@400,500,600&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <InlineScript html='try{var l=localStorage.getItem("egrant-lang");if(l==="en"||l==="sk")document.documentElement.lang=l;if(localStorage.getItem("egrant-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}' />
        <ThemeProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
