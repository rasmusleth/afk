"use client";

// Throwaway: homepage directions on /?variant=A|B|C|D. Not a production homepage.
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./visual-directions.module.css";

const variants = ["A", "B", "C", "D", "E"] as const;
type Variant = (typeof variants)[number];
const names = { A: "Matchday", B: "Klubjournal", C: "På banen", D: "C + A / Split hero", E: "Ro & bevægelse" };

function Brand() {
  return <Link className={styles.brand} href="/">AFK<span>Aalborg<br />Futsal Klub</span></Link>;
}
function Navigation() {
  return <nav aria-label="Hovednavigation"><Link href="/kampe/">Kampe & resultater</Link><Link href="/stilling/">Stilling</Link><Link href="/spillere/">Spillere</Link><Link href="#klubben">Klubben ↗</Link></nav>;
}
function Court() {
  return <svg viewBox="0 0 600 420" fill="none" aria-hidden="true"><rect x="35" y="35" width="530" height="350" rx="4" /><path d="M300 35v350M35 110c130 0 130 200 0 200M565 110c-130 0-130 200 0 200" /><circle cx="300" cy="210" r="65" /><circle cx="300" cy="210" r="4" fill="currentColor" /><path d="m195 302 100-95 94 48 72-126" strokeDasharray="8 8" /><circle cx="195" cy="302" r="12" fill="currentColor" /><circle cx="389" cy="255" r="12" fill="currentColor" /><path d="m435 138 26-9 4 27" /></svg>;
}
function NextMatch() {
  return <><p className={styles.kicker}>Næste kamp · Eksempel</p><div className={styles.fixture}><strong>Aalborg FK</strong><span>vs</span><strong>Gæsteholdet</strong></div><p>Søndag 15. november · 14.00</p><p className={styles.detail}>Hjemmebane · Spillested kommer her</p><Link className={styles.action} href="/kampe/">Se kampprogrammet <span>↗</span></Link></>;
}
function LatestResult() {
  return <><p className={styles.kicker}>Seneste resultat · Eksempel</p><div className={styles.result}><span>Aalborg FK</span><strong>4–2</strong><span>Udeholdet</span></div><Link href="/kampe/">Alle resultater ↗</Link></>;
}
function ClubStory() {
  return <section id="klubben" className={styles.story}><p className={styles.kicker}>Klubben bag kampene</p><h2>Et hold på banen.<br />En klub omkring det.</h2><p>Her får klubben plads til at fortælle sin historie. Om menneskerne, ambitionerne og fællesskabet i Aalborg.</p><p className={styles.detail}>Forslag til fortælling — den endelige klubtekst aftales senere.</p><Link href="/spillere/">Mød spillerne ↗</Link></section>;
}
export function VariantA() {
  return <div className={styles.matchday}><header><Brand /><Navigation /></header><main id="indhold" tabIndex={-1}><section className={styles.aHero}><div><p className={styles.kicker}>Aalborg Futsal Klub / På banen</p><h1>LILLE BANE.<br />STORT<br /><em>AALBORG.</em></h1><p className={styles.intro}>Tæt på spillet. Tæt på holdet.<br />Følg Aalborg fra første fløjt.</p><Link className={styles.action} href="/kampe/">Følg holdet <span>↗</span></Link></div><div className={styles.aSide}><div className={styles.court}><Court /><span>FUTSAL / AALBORG</span></div><section className={styles.next}><NextMatch /></section></div></section><div className={styles.aLower}><LatestResult /><ClubStory /></div></main><footer>AALBORG FUTSAL KLUB <span>Spillet er kun begyndelsen.</span></footer></div>;
}
export function VariantB() {
  return <div className={styles.journal}><header><span className={styles.edition}>AALBORG, DANMARK<br />KLUBJOURNALEN</span><Brand /><Link href="#klubben">Lær klubben at kende ↗</Link></header><Navigation /><main id="indhold" tabIndex={-1}><section className={styles.bHero}><div><p className={styles.kicker}>Spillet. Holdet. Byen.</p><h1>Futsal med<br />Aalborg i hjertet.</h1><p className={styles.intro}>De næste kampe. De seneste resultater.<br />Og alt det, der binder klubben sammen.</p><Link href="/kampe/">Følg sæsonen ↗</Link></div><div className={styles.bPoster}><span>FEM PÅ BANEN.<br />HELE BYEN BAG.</span><Court /><small>AALBORG FUTSAL KLUB</small></div></section><section className={styles.bMatches}><div><p className={styles.kicker}>Fra sidelinjen</p><h2>Det sker på banen</h2></div><section><NextMatch /></section><section><LatestResult /></section></section><ClubStory /></main><footer><Brand /><span>Futsal. Fællesskab. Aalborg.</span></footer></div>;
}
export function VariantC() {
  return <div className={styles.scoreboard}><header><Brand /><Navigation /></header><main id="indhold" tabIndex={-1}><section className={styles.cHero}><p className={styles.kicker}>Aalborg Futsal Klub</p><h1>HELE VEJEN.<br /><span>HELE HOLDET.</span></h1><div className={styles.cIntro}><p>Dit overblik over Aalborg på banen.<br />Kampe, resultater og menneskerne bag.</p><Link href="/kampe/">Se sæsonens kampe ↗</Link></div></section><div className={styles.cGrid}><section className={styles.cNext}><span className={styles.number}>01 / KAMPPROGRAM</span><NextMatch /></section><section className={styles.cResult}><span className={styles.number}>02 / SIDSTE FLØJT</span><LatestResult /><div className={styles.motif} aria-hidden="true">↗</div></section><div className={styles.cStory}><span className={styles.number}>03 / VORES KLUB</span><ClubStory /></div></div></main><footer>AALBORG FUTSAL KLUB<span>Fra første fløjt. Til sidste sekund.</span></footer></div>;
}

export function VariantD() {
  return (
    <div className={`${styles.scoreboard} ${styles.hybrid}`}>
      <header><Brand /><Navigation /></header>
      <main id="indhold" tabIndex={-1}>
        <section className={styles.dHero}>
          <div className={styles.dLead}>
            <p className={styles.kicker}>Aalborg Futsal Klub / På banen</p>
            <h1>LILLE BANE.<br />STORT<br /><span>AALBORG.</span></h1>
            <p className={styles.intro}>Tæt på spillet. Tæt på holdet.<br />Følg Aalborg fra første fløjt.</p>
            <Link className={styles.action} href="/kampe/">Følg holdet <span>↗</span></Link>
          </div>
          <div className={styles.dSide}>
            <div className={styles.court}><Court /><span>FUTSAL / AALBORG</span></div>
            <section className={styles.dNext}><NextMatch /></section>
          </div>
        </section>
        <div className={styles.dLower}>
          <section className={styles.cResult}><span className={styles.number}>01 / SIDSTE FLØJT</span><LatestResult /></section>
          <div className={styles.dStory}><span className={styles.number}>02 / VORES KLUB</span><ClubStory /></div>
        </div>
      </main>
      <footer>AALBORG FUTSAL KLUB<span>Fra første fløjt. Til sidste sekund.</span></footer>
    </div>
  );
}

export function VariantE() {
  return (
    <div className={styles.refined}>
      <header><Brand /><Navigation /></header>
      <main id="indhold" tabIndex={-1}>
        <section className={styles.eHero}>
          <div className={styles.eOpening}>
            <p className={styles.kicker}>Aalborg Futsal Klub</p>
            <h1>Et lille spil.<br /><span>En stor følelse.</span></h1>
            <p>Tempoet. Samspillet. Øjeblikket.<br />Kom tættere på futsal i Aalborg.</p>
            <Link className={styles.eButton} href="/kampe/">Følg holdet <span>↗</span></Link>
          </div>
          <div className={styles.eStage}>
            <div className={styles.eStageLabel}><span>Spillet, helt tæt på.</span><span>AALBORG / FUTSAL</span></div>
            <div className={styles.eCourt}><Court /></div>
            <span className={styles.eStageCaption}>Små rum. Store øjeblikke.</span>
          </div>
        </section>
        <section className={styles.eMatchStrip} aria-label="Kampoverblik">
          <div><p className={styles.kicker}>Næste kamp · Eksempel</p><h2>Aalborg FK <span>vs</span> Gæsteholdet</h2><p>Søndag 15. november · 14.00 · Hjemmebane</p></div>
          <Link href="/kampe/">Se kampprogrammet <span>↗</span></Link>
        </section>
        <section className={`${styles.eChapter} ${styles.eReveal}`}>
          <div className={styles.eChapterIntro}><p className={styles.kicker}>01 / Følg sæsonen</p><h2>Fra første fløjt.<br /><span>Til næste gang.</span></h2><p>Det næste opgør at glæde sig til. Det seneste resultat at tale om. Følg holdet gennem sæsonen.</p></div>
          <div className={styles.eResult}><LatestResult /><Link className={styles.eSecondary} href="/stilling/">Se stillingen <span>↗</span></Link></div>
        </section>
        <section id="klubben" className={`${styles.eClub} ${styles.eReveal}`}>
          <p className={styles.kicker}>02 / Mere end kampen</p>
          <h2>Fem på banen.<br /><span>En klub omkring.</span></h2>
          <div className={styles.eClubBottom}><p>Bag hver aflevering er der et menneske. Her skal du møde holdet og historien om Aalborg Futsal Klub.</p><Link className={styles.eButton} href="/spillere/">Mød spillerne <span>↗</span></Link></div>
          <div className={styles.eClubLine} aria-hidden="true"><span /><span /><span /><span /><span /></div>
        </section>
        <section className={`${styles.eEnd} ${styles.eReveal}`}><p className={styles.kicker}>Aalborg Futsal Klub</p><h2>Vi ses til næste kamp.</h2><Link href="/kampe/">Find næste kamp <span>↗</span></Link></section>
      </main>
      <footer><Brand /><span>Visuelt studie · Forslag til tekst og identitet</span><Link href="/kampe/">Kampe & resultater ↗</Link></footer>
    </div>
  );
}

export function VisualDirections() {
  const [variant, setVariant] = useState<Variant>("A");
  useEffect(() => {
    const read = () => {
      const value = new URLSearchParams(window.location.search).get("variant");
      setVariant(variants.find((key) => key === value) ?? "A");
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  function change(direction: number) {
    const next = variants[(variants.indexOf(variant) + direction + variants.length) % variants.length];
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next);
    window.history.replaceState(null, "", url);
    setVariant(next);
  }
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        change(event.key === "ArrowLeft" ? -1 : 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return <div className={styles.prototype}><div className={styles.disclaimer}>DESIGNSTUDIE · Ikke officielle farver eller logo · Kampdata og tekst er illustrative</div>{variant === "A" ? <VariantA /> : variant === "B" ? <VariantB /> : variant === "C" ? <VariantC /> : variant === "D" ? <VariantD /> : <VariantE />}{process.env.NODE_ENV !== "production" && <aside className={styles.switcher} aria-label="Vælg designretning"><button onClick={() => change(-1)} aria-label="Forrige design">←</button><div><small>VISUEL RETNING · {variants.indexOf(variant) + 1} / {variants.length}</small><strong aria-live="polite">{variant} / {names[variant]}</strong></div><button onClick={() => change(1)} aria-label="Næste design">→</button></aside>}</div>;
}
