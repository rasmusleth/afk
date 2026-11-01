import Link from "next/link";
import type { MatchRecord } from "@afk/sports/derivation";
import { confirmedScore } from "../../lib/sports";
import { formatKickoff, homepageSports } from "../../lib/homepage";
import type { readEditorial } from "../../lib/editorial-data";
import type { readSports } from "../../lib/sports-data";
import { CourtGraphic } from "../court-graphic";
import { EditorialImage } from "../editorial-image";
import { DataNotice } from "../data-notice";
import styles from "./homepage.module.css";

type Props = {
  content: Awaited<ReturnType<typeof readEditorial>>;
  sports: Awaited<ReturnType<typeof readSports>>;
};
function MatchSummary({
  match,
  names,
  result = false,
}: {
  match: MatchRecord;
  names: (ref: MatchRecord["homeTeam"]) => string;
  result?: boolean;
}) {
  return (
    <>
      <div className={styles.matchTeams}>
        <strong>{names(match.homeTeam)}</strong>
        <span className={result ? styles.score : styles.versus}>
          {result ? (confirmedScore(match) ?? "–") : "vs"}
        </span>
        <strong>{names(match.awayTeam)}</strong>
      </div>
      <p className={styles.matchDate}>{formatKickoff(match)}</p>
      {!result && (
        <p className={styles.small}>
          {match.venue || "Spillested ikke oplyst"}
        </p>
      )}
      {result && !confirmedScore(match) && (
        <p className={styles.small}>Resultat ikke bekræftet</p>
      )}
    </>
  );
}
export function Homepage({ content, sports }: Props) {
  const home = content.data?.homepage;
  const news = content.data?.news.slice(0, 4) ?? [];
  const [feature, ...stories] = news;
  const view = homepageSports(
    sports.snapshot,
    sports.rules,
    home?.competitionId,
  );
  const table = view.competition?.standings;
  return (
    <main id="indhold" tabIndex={-1} className={styles.home}>
      <DataNotice editorialMode={content.mode} sportsMode={sports.mode} />
      <section className={styles.hero} aria-labelledby="homepage-title">
        {home?.heroImage && content.imageContext && (
          <div className={styles.heroMedia} aria-hidden="true">
            <EditorialImage
              image={home.heroImage}
              context={content.imageContext}
              sizes="100vw"
              eager
            />
          </div>
        )}
        <div className={styles.lead}>
          <p className="eyebrow">Aalborg Futsal Klub · På banen</p>
          <h1 id="homepage-title">
            {home?.heroTitle ?? "Aalborg Futsal"}{" "}
            <span>{home?.heroAccent ?? "Klub"}</span>
          </h1>
          <p className={styles.intro}>
            {home?.heroIntro ?? "Følg klubbens kampe, resultater og spillere."}
          </p>
          <Link className={styles.action} href="/kampe/">
            Følg holdet <span>↗</span>
          </Link>
        </div>
        <div className={styles.heroSide}>
          <div className={styles.court}>
            <CourtGraphic />
            <span>FUTSAL / AALBORG</span>
          </div>
          <section className={styles.nextMatch}>
            <h2 className={styles.label}>Næste kamp</h2>
            {view.next ? (
              <MatchSummary match={view.next} names={view.name} />
            ) : (
              <p className={styles.noMatch}>
                Ingen kommende kamp med bekræftet dato er tilgængelig.
              </p>
            )}
            <Link className={styles.action} href="/kampe/">
              Se kampprogrammet <span>↗</span>
            </Link>
          </section>
        </div>
      </section>
      <section className={styles.news} aria-labelledby="homepage-news">
        <div className={styles.sectionHeading}>
          <div>
            <p className="eyebrow">01 / Fra klubben</p>
            <h2 id="homepage-news">{home?.newsHeading ?? "Nyt fra klubben"}</h2>
          </div>
          <Link href="/nyheder/">Alle nyheder ↗</Link>
        </div>
        {feature ? (
          <div className={styles.newsGrid}>
            <article className={styles.feature}>
              {feature.image && content.imageContext ? (
                <Link
                  href={`/nyheder/${feature.slug}/`}
                  aria-label={feature.title}
                >
                  <EditorialImage
                    image={feature.image}
                    context={content.imageContext}
                  />
                </Link>
              ) : (
                <div className={styles.featureArt} aria-hidden="true">
                  <span>
                    AALBORG.
                    <br />
                    PÅ BANEN.
                  </span>
                  <CourtGraphic />
                </div>
              )}
              <p className={styles.articleDate}>
                <time dateTime={feature.publishedAt}>
                  {new Intl.DateTimeFormat("da-DK", {
                    dateStyle: "long",
                    timeZone: "Europe/Copenhagen",
                  }).format(new Date(feature.publishedAt))}
                </time>
              </p>
              <h3>
                <Link href={`/nyheder/${feature.slug}/`}>{feature.title}</Link>
              </h3>
              <p>{feature.excerpt}</p>
              <Link
                className={styles.readMore}
                href={`/nyheder/${feature.slug}/`}
              >
                Læs historien <span>↗</span>
              </Link>
            </article>
            <div className={styles.newsRows}>
              {stories.map((article) => (
                <article key={article._id}>
                  <p className={styles.articleDate}>
                    <time dateTime={article.publishedAt}>
                      {new Intl.DateTimeFormat("da-DK", {
                        dateStyle: "medium",
                        timeZone: "Europe/Copenhagen",
                      }).format(new Date(article.publishedAt))}
                    </time>
                  </p>
                  <h3>
                    <Link href={`/nyheder/${article.slug}/`}>
                      {article.title}
                      <span aria-hidden="true">↗</span>
                    </Link>
                  </h3>
                  <p>{article.excerpt}</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <p className={styles.empty}>Der er ingen udgivne nyheder endnu.</p>
        )}
      </section>
      <section className={styles.season} aria-labelledby="homepage-season">
        <div className={styles.seasonIntro}>
          <p className="eyebrow">02 / På banen</p>
          <h2 id="homepage-season">
            Sæsonen.
            <br />
            Kort fortalt.
          </h2>
          <p>
            {view.competition
              ? `${view.competition.competition.name ?? "Turnering"} · ${view.competition.season?.name ?? "Sæson ikke oplyst"}`
              : "Sæsonoverblikket er ikke tilgængeligt endnu."}
          </p>
          <Link className={styles.action} href="/kampe/">
            Alle kampe & resultater <span>↗</span>
          </Link>
        </div>
        <section className={styles.latest}>
          <h3 className={styles.label}>Seneste afsluttede kamp</h3>
          {view.latest ? (
            <MatchSummary match={view.latest} names={view.name} result />
          ) : (
            <p>Ingen dateret, afsluttet kamp er tilgængelig.</p>
          )}
          <Link href="/kampe/">Alle resultater ↗</Link>
        </section>
        <section className={styles.standings}>
          <h3>Stillingen</h3>
          {table && table.rows.length ? (
            <>
              <div
                className={styles.tableScroll}
                role="region"
                aria-label="Foreløbig stilling"
                tabIndex={0}
              >
                <table>
                  <caption>
                    Foreløbig, beregnet stilling ·{" "}
                    {table.includedMatchIds.length} bekræftede resultater
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Pl.</th>
                      <th scope="col">Hold</th>
                      <th scope="col">K</th>
                      <th scope="col">Pt.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => (
                      <tr
                        key={row.teamId}
                        className={
                          view.competition?.clubTeams.some(
                            (team) => team._id === row.teamId,
                          )
                            ? styles.clubRow
                            : undefined
                        }
                      >
                        <td>
                          {row.rank}
                          {row.sharedRank ? " =" : ""}
                        </td>
                        <th scope="row">{row.name}</th>
                        <td>{row.played}</td>
                        <td>{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={styles.small}>
                K: kampe · Pt.: point · =: delt placering. Tabellen kan være
                ufuldstændig.
                {table.issues.length > 0
                  ? " Uafklarede forhold kan påvirke placeringen."
                  : ""}
              </p>
            </>
          ) : (
            <p>Stillingen afventer kampdata og bekræftede turneringsregler.</p>
          )}
          <Link href="/stilling/">
            Se hele stillingen <span>↗</span>
          </Link>
        </section>
      </section>
      <section
        id="klubben"
        className={styles.club}
        aria-labelledby="homepage-club"
      >
        <div>
          <p className="eyebrow">03 / Vores klub</p>
          <h2 id="homepage-club">{home?.clubTitle ?? "Aalborg Futsal Klub"}</h2>
          <p>
            {home?.clubText ??
              "Klubbens introduktion er endnu ikke tilgængelig."}
          </p>
          <Link href="/spillere/">Mød spillerne ↗</Link>
        </div>
        {home?.clubImage && content.imageContext ? (
          <EditorialImage
            image={home.clubImage}
            context={content.imageContext}
          />
        ) : (
          <span className={styles.clubWord} aria-hidden="true">
            AFK.
          </span>
        )}
      </section>
      <section
        id="kontakt"
        className={styles.contact}
        aria-labelledby="homepage-contact"
      >
        <div>
          <p className="eyebrow">04 / Kontakt & fællesskab</p>
          <h2 id="homepage-contact">
            {home?.contactTitle ?? "Kontakt klubben"}
          </h2>
          <p>
            {home?.contactText ??
              "Kontaktoplysninger er endnu ikke tilgængelige."}
          </p>
        </div>
        {home && (
          <address>
            <h3>{home.contactName}</h3>
            <a href={`mailto:${home.contactEmail}`}>{home.contactEmail} ↗</a>
            {home.trainingInfo && <p>{home.trainingInfo}</p>}
          </address>
        )}
      </section>
    </main>
  );
}
