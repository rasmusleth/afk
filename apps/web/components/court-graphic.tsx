/** Decorative club motif; all match information is rendered separately as text. */
export function CourtGraphic() {
  return (
    <svg
      viewBox="0 0 600 420"
      fill="none"
      aria-hidden="true"
      className="h-full w-full stroke-current [stroke-width:2]"
    >
      <rect x="35" y="35" width="530" height="350" rx="4" />
      <path d="M300 35v350M35 110c130 0 130 200 0 200M565 110c-130 0-130 200 0 200" />
      <circle cx="300" cy="210" r="65" />
      <circle cx="300" cy="210" r="4" fill="currentColor" />
      <path d="m195 302 100-95 94 48 72-126" strokeDasharray="8 8" />
      <circle cx="195" cy="302" r="12" fill="currentColor" />
      <circle cx="389" cy="255" r="12" fill="currentColor" />
      <path d="m435 138 26-9 4 27" />
    </svg>
  );
}
