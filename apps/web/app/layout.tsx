import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
