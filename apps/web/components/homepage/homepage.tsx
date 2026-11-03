import Link from "next/link";
import type { MatchRecord } from "@afk/sports/derivation";
import { confirmedScore } from "../../lib/sports";
import { formatKickoff, homepageSports } from "../../lib/homepage";
import type { readEditorial } from "../../lib/editorial-data";
import type { readSports } from "../../lib/sports-data";
import { EditorialImage } from "../editorial-image";
import { DataNotice } from "../data-notice";
import styles from "./homepage.module.css";

type Props = {
  content: Awaited<ReturnType<typeof readEditorial>>;
  sports: Awaited<ReturnType<typeof readSports>>;
};

function MediaPlaceholder({
  label,
  variant = "news",
}: {
  label: string;
  variant?: "news" | "club";
}) {
  return (
    <div
      className={`${styles.mediaPlaceholder} ${styles[variant]}`}
      role="img"
      aria-label={`Billedpladsholder: ${label}`}
    >
      <div className={styles.mediaFrame} aria-hidden="true" />
      <span className={styles.mediaLabel}>
        Billedplads <span aria-hidden="true">↗</span>
      </span>
      <span className={styles.mediaCaption}>{label}</span>
    </div>
  );
}

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
        <p className={styles.matchVenue}>
          {match.venue || "Spillested ikke oplyst"}
        </p>
      )}
      {result && !confirmedScore(match) && (
        <p className={styles.matchVenue}>Resultat ikke bekræftet</p>
      )}
    </>
  );
}

export function Homepage({ content, sports }: Props) {
  const home = content.data?.homepage;
  const news = content.data?.news.slice(0, 3) ?? [];
  const [feature, ...stories] = news;
  const view = homepageSports(
    sports.snapshot,
    sports.rules,
    home?.competitionId,
  );
  const date = (value: string) =>
    new Intl.DateTimeFormat("da-DK", {
      dateStyle: "long",
      timeZone: "Europe/Copenhagen",
    }).format(new Date(value));

  return (
    <main id="indhold" tabIndex={-1} className={styles.home}>
      <section className={styles.hero} aria-labelledby="homepage-title">
        <div className={styles.heroMedia} aria-hidden="true">
          {home?.heroImage && content.imageContext ? (
            <EditorialImage
              image={home.heroImage}
              context={content.imageContext}
              sizes="100vw"
              eager
            />
          ) : (
            <div className={styles.filmPlaceholder}>
              <div className={styles.arenaLines} />
              <span className={styles.heroWord}>AFK</span>
            </div>
          )}
        </div>
        <div className={styles.heroContent}>
          <p className={styles.kicker}>Aalborg Futsal Klub</p>
          <h1 id="homepage-title">
            {home?.heroTitle ?? "Aalborg Futsal"}{" "}
            <span>{home?.heroAccent ?? "Klub"}</span>
          </h1>
          <div className={styles.heroBottom}>
            <div>
              <p className={styles.intro}>
                {home?.heroIntro ??
                  "Følg klubbens kampe, resultater og spillere."}
              </p>
              <Link className={styles.button} href="#kampe">
                Følg holdet <span aria-hidden="true">↓</span>
              </Link>
            </div>
            {!(home?.heroImage && content.imageContext) && (
              <p className={styles.filmLabel}>
                <span className={styles.filmMark} aria-hidden="true" />
                Plads til klubfilm <span>Fra hallen. Helt tæt på.</span>
              </p>
            )}
          </div>
        </div>
        <div className={styles.heroFootnote} aria-hidden="true">
          <span>Spillet er futsal.</span>
          <span>Byen er Aalborg.</span>
        </div>
      </section>
      <DataNotice editorialMode={content.mode} sportsMode={sports.mode} />

      <section
        id="kampe"
        className={styles.matchday}
        aria-labelledby="homepage-matches"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>Følg med</p>
            <h2 id="homepage-matches">På banen.</h2>
          </div>
          <Link className={styles.textLink} href="/kampe/">
            Kampe & resultater <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className={styles.matchGrid}>
          <section
            className={styles.nextMatch}
            aria-labelledby="next-match-title"
          >
            <h3 id="next-match-title" className={styles.matchLabel}>
              <span className={styles.dot} aria-hidden="true" />
              Næste kamp
            </h3>
            {view.next ? (
              <MatchSummary match={view.next} names={view.name} />
            ) : (
              <p className={styles.empty}>
                Den næste kamp med bekræftet dato er endnu ikke tilgængelig.
              </p>
            )}
          </section>
          <section
            className={styles.latest}
            aria-labelledby="latest-match-title"
          >
            <h3 id="latest-match-title" className={styles.matchLabel}>
              Seneste afsluttede kamp
            </h3>
            {view.latest ? (
              <MatchSummary match={view.latest} names={view.name} result />
            ) : (
              <p className={styles.empty}>
                Intet dateret, afsluttet resultat er tilgængeligt endnu.
              </p>
            )}
          </section>
        </div>
        <div className={styles.sportsLinks}>
          <span>{view.competition?.competition.name ?? "Sæsonoverblik"}</span>
          <Link href="/stilling/">
            Se stillingen <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/spillere/">
            Mød spillerne <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section className={styles.newsSection} aria-labelledby="homepage-news">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>Historier fra klubben</p>
            <h2 id="homepage-news">{home?.newsHeading ?? "Nyt fra klubben"}</h2>
          </div>
          <Link className={styles.textLink} href="/nyheder/">
            Alle nyheder <span aria-hidden="true">↗</span>
          </Link>
        </div>
        {feature ? (
          <div className={styles.newsGrid}>
            <article className={styles.feature}>
              <Link
                className={styles.featureMedia}
                href={`/nyheder/${feature.slug}/`}
                aria-label={feature.title}
              >
                {feature.image && content.imageContext ? (
                  <EditorialImage
                    image={feature.image}
                    context={content.imageContext}
                    sizes="(max-width: 760px) 90vw, 60vw"
                  />
                ) : (
                  <MediaPlaceholder label="Kampøjeblikke fra hallen" />
                )}
              </Link>
              <p className={styles.articleDate}>
                <time dateTime={feature.publishedAt}>
                  {date(feature.publishedAt)}
                </time>
              </p>
              <h3>
                <Link href={`/nyheder/${feature.slug}/`}>{feature.title}</Link>
              </h3>
              <p className={styles.excerpt}>{feature.excerpt}</p>
              <Link
                className={styles.textLink}
                href={`/nyheder/${feature.slug}/`}
              >
                Læs historien <span aria-hidden="true">↗</span>
              </Link>
            </article>
            <div className={styles.newsSide}>
              {stories.map((article) => (
                <article className={styles.story} key={article._id}>
                  <Link
                    className={styles.storyMedia}
                    href={`/nyheder/${article.slug}/`}
                    aria-label={article.title}
                  >
                    {article.image && content.imageContext ? (
                      <EditorialImage
                        image={article.image}
                        context={content.imageContext}
                        sizes="(max-width: 760px) 90vw, 30vw"
                      />
                    ) : (
                      <MediaPlaceholder label="Menneskene omkring holdet" />
                    )}
                  </Link>
                  <p className={styles.articleDate}>
                    <time dateTime={article.publishedAt}>
                      {date(article.publishedAt)}
                    </time>
                  </p>
                  <h3>
                    <Link href={`/nyheder/${article.slug}/`}>
                      {article.title} <span aria-hidden="true">↗</span>
                    </Link>
                  </h3>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <p className={styles.empty}>Der er ingen udgivne nyheder endnu.</p>
        )}
      </section>

      <section
        id="klubben"
        className={styles.clubSection}
        aria-labelledby="homepage-club"
      >
        <div className={styles.clubMedia}>
          {home?.clubImage && content.imageContext ? (
            <EditorialImage
              image={home.clubImage}
              context={content.imageContext}
              sizes="(max-width: 760px) 100vw, 55vw"
            />
          ) : (
            <MediaPlaceholder
              variant="club"
              label="Et hold. Også uden for banen."
            />
          )}
        </div>
        <div className={styles.clubContent}>
          <p className={styles.kicker}>Vores klub. Vores by.</p>
          <h2 id="homepage-club">{home?.clubTitle ?? "Aalborg Futsal Klub"}</h2>
          <p>
            {home?.clubText ??
              "Klubbens introduktion er endnu ikke tilgængelig."}
          </p>
          <Link className={styles.textLink} href="#kontakt">
            Lær klubben at kende <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section
        id="kontakt"
        className={styles.contactSection}
        aria-labelledby="homepage-contact"
      >
        <div>
          <p className={styles.kicker}>Der er plads til flere</p>
          <h2 id="homepage-contact">
            {home?.contactTitle ?? "Kontakt klubben"}
          </h2>
          <p className={styles.contactIntro}>
            {home?.contactText ??
              "Kontaktoplysninger er endnu ikke tilgængelige."}
          </p>
        </div>
        {home && (
          <address className={styles.contactDetails}>
            <span>{home.contactName}</span>
            <a href={`mailto:${home.contactEmail}`}>
              {home.contactEmail}
              <span aria-hidden="true">↗</span>
            </a>
            {home.trainingInfo && <p>{home.trainingInfo}</p>}
          </address>
        )}
      </section>
    </main>
  );
}
