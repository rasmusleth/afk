import Link from "next/link";

const links = [
  { view: "kampe", href: "/kampe/", label: "Kampe & resultater" },
  { view: "stilling", href: "/stilling/", label: "Stilling" },
  { view: "spillere", href: "/spillere/", label: "Spillere" },
] as const;

export function SportsNavigation({
  current,
}: {
  current: (typeof links)[number]["view"];
}) {
  return (
    <nav
      aria-label="På banen"
      className="mb-7 flex flex-wrap gap-x-7 gap-y-2 border-b border-[var(--border)] text-[13px] font-semibold"
    >
      {links.map((link) => (
        <Link
          key={link.view}
          href={link.href}
          aria-current={current === link.view ? "page" : undefined}
          className="border-b-2 border-transparent py-3 no-underline aria-[current=page]:border-brand-accent aria-[current=page]:text-brand-accent"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
