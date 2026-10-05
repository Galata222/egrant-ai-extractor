import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { InlineScript } from "@/components/inline-script";
import { LocaleProvider } from "@/lib/locale";
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
      <body className="min-h-full flex flex-col font-sans">
        <InlineScript html='try{var l=localStorage.getItem("egrant-lang");if(l==="en"||l==="sk")document.documentElement.lang=l}catch(e){}' />
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
