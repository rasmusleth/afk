import Link from "next/link";
import { SiteNavigation } from "./site-navigation";

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-6 bg-brand px-[max(5vw,calc((100vw-1160px)/2))] py-6 text-on-brand max-sm:px-6">
      <Link className="flex items-center gap-4 text-[34px] font-black tracking-[-1px] no-underline" href="/">
        AFK
        <span className="max-w-25 text-[13px] leading-tight font-medium tracking-normal">Aalborg Futsal Klub</span>
      </Link>
      <SiteNavigation />
    </header>
  );
}
