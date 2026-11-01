import Image from "next/image";
import Link from "next/link";
import { SiteNavigation } from "./site-navigation";

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-6 bg-brand px-[max(5vw,calc((100vw-1160px)/2))] py-6 text-on-brand max-sm:px-6">
      <Link
        className="flex items-center gap-3 no-underline"
        href="/"
        aria-label="Aalborg Futsal Klub – forside"
      >
        <Image
          src="/afk-logo-white-small.png"
          width={320}
          height={320}
          unoptimized
          loading="eager"
          alt=""
          className="h-14 w-14 shrink-0 sm:h-16 sm:w-16"
        />
        <span className="max-w-28 text-[14px] leading-tight font-medium">
          Aalborg Futsal Klub
        </span>
      </Link>
      <SiteNavigation />
    </header>
  );
}
