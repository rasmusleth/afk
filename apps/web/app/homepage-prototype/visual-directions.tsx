"use client";

// Throwaway: homepage directions on /?variant=A|B|C|D|E. Not a production homepage.
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./visual-directions.module.css";

const variants = ["A", "B", "C", "D", "E"] as const;
type Variant = (typeof variants)[number];
const names = { A: "Matchday", B: "Klubjournal", C: "På banen", D: "Åben klubside", E: "Klubhub" };

function Brand() {
  return <Link className={styles.brand} href="/">AFK<span>Aalborg<br />Futsal Klub</span></Link>;
}
function Navigation({ showContact = false }: { showContact?: boolean }) {
  return <nav aria-label="Hovednavigation"><Link href="/kampe/">Kampe & resultater</Link><Link href="/stilling/">Stilling</Link><Link href="/spillere/">Spillere</Link><Link href="#klubben">Klubben ↗</Link>{showContact && <Link href="#kontakt">Kontakt ↗</Link>}</nav>;
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
      <header><Brand /><Navigation showContact /></header>
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
        <section className={styles.dNews} aria-labelledby="d-news-title">
          <div className={styles.dSectionHeading}><div><p className={styles.kicker}>01 / Fra klubben</p><h2 id="d-news-title">Tæt på Aalborg.</h2></div><span className={styles.detail}>Forslag til redaktionelt indhold</span></div>
          <div className={styles.dNewsGrid}>
            <article className={styles.dFeature}>
              <div className={styles.dFeatureArt} aria-hidden="true"><span>INDE PÅ BANEN.<br />HELT TÆT PÅ.</span><Court /><small>AALBORG / FUTSAL</small></div>
              <p className={styles.kicker}>Holdet / Indholdsforslag</p>
              <h3>Spillet er kun halvdelen<br />af historien.</h3>
              <p>Mød spillerne og menneskene omkring holdet. Her er plads til klubbens vigtigste historie lige nu.</p>
              <Link href="/spillere/">Mød holdet <span>↗</span></Link>
            </article>
            <div className={styles.dNewsRows}>{hubStories.map((story) => <details key={story.number}><summary><span className={styles.number}>{story.number}</span><span><small>{story.category} / Indholdsforslag</small><strong>{story.title}</strong></span><span className={styles.dExpand}>+</span></summary><p>{story.text}</p></details>)}<p className={styles.dEditorialNote}>Optakter, portrætter og nyt fra hverdagen. En plads til det, der sker mellem kampene.</p></div>
          </div>
        </section>
        <section className={styles.dSeason} aria-labelledby="d-season-title">
          <div className={styles.dSeasonIntro}><p className={styles.kicker}>02 / På banen</p><h2 id="d-season-title">Sæsonen.<br />Kort fortalt.</h2><p>Seneste resultat og ligaens overblik, samlet ét sted.</p><Link className={styles.action} href="/kampe/">Alle kampe & resultater <span>↗</span></Link></div>
          <section className={styles.dSeasonResult}><LatestResult /></section>
          <section className={styles.dStandings}><h3>Stillingen</h3><table><caption>Eksempeltabel · Ikke aktuelle klubdata</caption><thead><tr><th scope="col">Pl.</th><th scope="col">Hold</th><th scope="col">K</th><th scope="col">Pt.</th></tr></thead><tbody>{[["1", "Eksempelhold A", "6", "15"], ["2", "Aalborg FK", "6", "12"], ["3", "Eksempelhold B", "6", "10"], ["4", "Eksempelhold C", "6", "9"]].map(([rank, name, played, points]) => <tr key={rank} className={rank === "2" ? styles.dClubRow : undefined}><td>{rank}</td><th scope="row">{name}</th><td>{played}</td><td>{points}</td></tr>)}</tbody></table><Link href="/stilling/">Se hele stillingen <span>↗</span></Link></section>
        </section>
        <div className={styles.dClub}><p className={styles.number}>03 / VORES KLUB</p><ClubStory /><span className={styles.dClubWord} aria-hidden="true">AFK.</span></div>
        <section id="kontakt" className={styles.dContact} aria-labelledby="d-contact-title">
          <div><p className={styles.kicker}>04 / Kontakt & fællesskab</p><h2 id="d-contact-title">Vil du være<br />en del af klubben?</h2><p>Nysgerrig på at spille futsal, hjælpe til eller høre mere om Aalborg Futsal Klub? Start med en snak med klubben.</p></div>
          <div className={styles.dContactInfo}><h3>Kontakt klubben</h3><p>Her kommer klubbens kontaktperson og e-mail samt oplysninger om, hvordan du hører mere om træning.</p><p className={styles.detail}>Indholdsforslag · Kontaktoplysninger er endnu ikke tilføjet.</p></div>
        </section>
      </main>
      <footer>AALBORG FUTSAL KLUB<span>Fra første fløjt. Til sidste sekund.</span><Link href="#kontakt">Kontakt klubben ↗</Link></footer>
    </div>
  );
}

// Illustrative editorial content and standings; no club news or results are asserted.
const hubStories = [
  { category: "Optakt", title: "Det næste opgør starter her", text: "Plads til modstanderen, kampens betydning og alt det praktiske før næste kamp.", number: "01" },
  { category: "Holdet", title: "Menneskene bag trøjen", text: "Spillerportrætter, samtaler og små historier fra hverdagen i klubben.", number: "02" },
  { category: "Fra klubben", title: "Livet mellem kampene", text: "Her kan klubben dele nyt fra træning, arrangementer og fællesskabet omkring holdet.", number: "03" },
];
export function VariantE() {
  return (
    <div className={styles.hub}>
      <header><Brand /><Navigation /></header>
      <main id="indhold" tabIndex={-1}>
        <div className={styles.hubTicker}>
          <span className={styles.hubTag}>På banen</span>
          <Link href="/kampe/"><small>NÆSTE KAMP · EKSEMPEL</small><strong>Aalborg FK – Gæsteholdet</strong><span>15. nov. / 14.00 ↗</span></Link>
          <Link href="/kampe/"><small>SENEST AFSLUTTET · EKSEMPEL</small><strong>Aalborg FK <b>4–2</b> Udeholdet</strong></Link>
        </div>
        <div className={styles.hubTop}>
          <section className={styles.hubLead}>
            <div className={styles.hubLeadCopy}><p className={styles.kicker}>Aalborg Futsal Klub / Klubben. Kampene. Menneskene.</p><h1>HELE BYEN.<br /><span>HELE HOLDET.</span></h1><p>Følg Aalborg på banen og kom tættere på klubben bag.</p><Link className={styles.action} href="/kampe/">Følg sæsonen <span>↗</span></Link></div>
            <div className={styles.hubCourt}><Court /></div>
          </section>
          <section className={styles.hubNext}><NextMatch /></section>
        </div>
        <div className={styles.hubColumns}>
          <div>
            <section className={styles.hubNews}>
              <div className={styles.hubHeading}><h2>Fra klubben</h2><span>Forslag til indhold</span></div>
              <article className={styles.hubFeature}>
                <div className={styles.hubFeatureArt} aria-hidden="true"><span>AFK</span><Court /></div>
                <div><p className={styles.kicker}>Tæt på holdet / Indholdsforslag</p><h3>En klub at følge.<br />Et hold at samles om.</h3><p>Her får den vigtigste klubhistorie sin plads. En optakt, et interview eller et indblik bag kulisserne.</p><Link href="/spillere/">Mød spillerne <span>↗</span></Link></div>
              </article>
              <div className={styles.hubStories}>{hubStories.map((story) => <details key={story.number}><summary><span className={styles.hubStoryNumber}>{story.number}</span><span><small>{story.category} / Indholdsforslag</small><strong>{story.title}</strong></span><span className={styles.hubExpand}>+</span></summary><p>{story.text}</p></details>)}</div>
            </section>
            <section id="klubben" className={styles.hubAbout}><div><p className={styles.kicker}>Mere end kampene</p><h2>Aalborg. Også uden for banen.</h2><p>Klubbens historie, mennesker og fællesskab får plads her.</p></div><Link href="/spillere/">Mød holdet ↗</Link></section>
          </div>
          <aside className={styles.hubRail} aria-label="Sæsonoverblik">
            <section className={styles.hubStandings}><div className={styles.hubHeading}><h2>Stillingen</h2><span>Eksempeltabel</span></div><table><caption>Illustrativ tabel — ikke aktuelle klubdata</caption><thead><tr><th scope="col">Pl.</th><th scope="col">Hold</th><th scope="col">K</th><th scope="col">Pt.</th></tr></thead><tbody>{[["1", "Eksempelhold A", "6", "15"], ["2", "Aalborg FK", "6", "12"], ["3", "Eksempelhold B", "6", "10"], ["4", "Eksempelhold C", "6", "9"]].map(([rank, name, played, points]) => <tr key={rank} className={rank === "2" ? styles.hubClubRow : undefined}><td>{rank}</td><th scope="row">{name}</th><td>{played}</td><td>{points}</td></tr>)}</tbody></table><Link className={styles.hubRailLink} href="/stilling/">Se hele stillingen <span>↗</span></Link></section>
            <section className={styles.hubResult}><LatestResult /></section>
            <section className={styles.hubQuick}><h2>Følg klubben</h2><Link href="/kampe/">Kampprogram <span>↗</span></Link><Link href="/spillere/">Spillere & statistik <span>↗</span></Link><Link href="#klubben">Om klubben <span>↓</span></Link></section>
          </aside>
        </div>
      </main>
      <footer><Brand /><span>Klubben. Kampene. Menneskene.</span><Link href="/kampe/">Kampe & resultater ↗</Link></footer>
    </div>
  );
}

export function VisualDirections() {
  const [variant, setVariant] = useState<Variant>("D");
  useEffect(() => {
    const read = () => {
      const value = new URLSearchParams(window.location.search).get("variant");
      setVariant(variants.find((key) => key === value) ?? "D");
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
