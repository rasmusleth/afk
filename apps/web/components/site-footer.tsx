import Link from "next/link";
export function SiteFooter() {
  return (
    <footer className="site-footer flex flex-wrap items-center justify-between gap-5 bg-brand-ink px-[5vw] py-7 text-[13px] text-on-brand">
      <strong>Aalborg Futsal Klub</strong>
      <span>Kampdata fra DBU og klubbens registreringer</span>
      <Link href="/#kontakt">Kontakt klubben ↗</Link>
    </footer>
  );
}
