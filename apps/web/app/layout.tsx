import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";

export const metadata: Metadata = {
  title: "Aalborg Futsal Klub",
  description:
    "Kampe, resultater, stilling og spillere fra Aalborg Futsal Klub.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="da" className={`h-full antialiased`}>
      <body>
        <a className="skip-link" href="#indhold">
          Spring til indhold
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
