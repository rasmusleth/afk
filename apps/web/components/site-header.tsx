"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import styles from "./site-header.module.css";

const links = [
  { href: "/kampe/", label: "På banen" },
  { href: "/nyheder/", label: "Nyheder" },
  { href: "/#klubben", label: "Klubben" },
  { href: "/#kontakt", label: "Kontakt" },
];
const sportsPaths = ["/kampe/", "/stilling/", "/spillere/"];

export function SiteHeader() {
  const pathname = usePathname();
  // Route changes also close the disclosure, including browser back/forward.
  return <HeaderNavigation key={pathname} pathname={pathname} />;
}

function HeaderNavigation({ pathname }: { pathname: string }) {
  const currentPath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <header
      className={`site-header ${styles.header} ${pathname === "/" ? styles.overlay : ""} ${open ? styles.open : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <Link
        className={styles.crest}
        href="/"
        aria-label="Aalborg Futsal Klub – forside"
        onClick={() => setOpen(false)}
      >
        <Image
          src="/afk-logo-white-small.png"
          width={320}
          height={320}
          unoptimized
          loading="eager"
          alt=""
        />
      </Link>
      <Link
        className={styles.contact}
        href="/#kontakt"
        aria-label="Kontakt klubben"
        onClick={() => setOpen(false)}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          aria-hidden="true"
        >
          <rect x="2" y="4" width="20" height="16" rx="1" />
          <path d="m3 5 9 8 9-8" />
        </svg>
      </Link>
      <button
        ref={menuButton}
        type="button"
        className={styles.toggle}
        aria-label={open ? "Luk menu" : "Åbn menu"}
        aria-expanded={open}
        aria-controls="site-navigation"
        onClick={() => setOpen(!open)}
      >
        <span />
        <span />
      </button>
      <nav
        id="site-navigation"
        aria-label="Hovednavigation"
        className={styles.navigation}
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
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
