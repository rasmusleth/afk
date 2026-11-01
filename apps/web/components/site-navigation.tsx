"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

const links = [
  { href: "/kampe/", label: "På banen" },
  { href: "/nyheder/", label: "Nyheder" },
  { href: "/#klubben", label: "Klubben" },
  { href: "/#kontakt", label: "Kontakt" },
];
const sportsPaths = ["/kampe/", "/stilling/", "/spillere/"];

export function SiteNavigation() {
  const pathname = usePathname();
  const currentPath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <div
      className="max-sm:contents"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <button
        ref={menuButton}
        type="button"
        className="border border-current px-4 py-2 text-[13px] font-semibold sm:hidden"
        aria-expanded={open}
        aria-controls="site-navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? "Luk menu" : "Åbn menu"}
      </button>
      <nav
        id="site-navigation"
        aria-label="Hovednavigation"
        className={`${open ? "flex" : "hidden"} flex-wrap gap-7 max-sm:w-full max-sm:flex-col max-sm:gap-2 max-sm:pt-4 sm:flex`}
      >
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={
              currentPath === href
                ? "page"
                : href === "/kampe/" && sportsPaths.includes(currentPath)
                  ? "true"
                  : undefined
            }
            className="border-b-2 border-transparent py-2 text-[13px] font-semibold no-underline aria-[current=page]:border-brand-accent aria-[current=true]:border-brand-accent"
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
