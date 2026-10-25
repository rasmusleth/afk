import Link from "next/link";
import type { MatchRecord } from "@afk/sports/derivation";
import { referenceId } from "@afk/sports/derivation";
import { confirmedScore, publicCompetitions } from "../lib/sports";
import { loadSports } from "../lib/sports-data";

const statuses = {
  unknown: "Status ukendt",
  scheduled: "Planlagt",
  completed: "Afsluttet",
  postponed: "Udsat",
  cancelled: "Aflyst",
  abandoned: "Afbrudt",
};
function kickoff(match: MatchRecord) {
  const value = match.kickoff;
  if (
    value?.precision === "time" &&
    value.dateTime &&
    Number.isFinite(Date.parse(value.dateTime))
  ) {
    return new Intl.DateTimeFormat("da-DK", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Copenhagen",
    }).format(new Date(value.dateTime));
  }
  if (
    value?.precision === "date" &&
    value.date &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date)
  ) {
    return `${value.date.split("-").reverse().join(".")} · Tid ikke fastlagt`;
  }
  return "Dato og tid ikke fastlagt";
}
function MatchList({
  matches,
  names,
}: {
  matches: MatchRecord[];
  names: Map<string, string>;
}) {
  if (!matches.length)
    return <p className="empty">Ingen kampe registreret i denne kategori.</p>;
  return (
    <ul className="matches">
      {matches.map((match) => (
        <li key={match._id}>
          <div className="match-meta">
            {kickoff(match)}
            <span>{match.venue || "Spillested ikke oplyst"}</span>
          </div>
          <div className="match-teams">
            <strong>
              {names.get(referenceId(match.homeTeam) ?? "") ??
                "Hold ikke oplyst"}
            </strong>
            <span className="score">{confirmedScore(match) ?? "–"}</span>
            <strong>
              {names.get(referenceId(match.awayTeam) ?? "") ??
                "Hold ikke oplyst"}
            </strong>
          </div>
          <p className="match-status">
            {statuses[match.status ?? "unknown"] ?? "Status ukendt"}
            {match.status === "completed" && !confirmedScore(match)
              ? " · Resultat ikke bekræftet"
              : match.score && match.status !== "completed"
                ? " · Foreløbigt resultat afventer bekræftelse"
                : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

export async function SportsView({
  view,
}: {
  view: "kampe" | "stilling" | "spillere";
}) {
  const { snapshot, rules, mode } = await loadSports();
  const competitions = publicCompetitions(snapshot, rules);
  const names = new Map(
    snapshot.teams.map((team) => [team._id, team.name ?? "Hold ikke oplyst"]),
  );
  const title = {
    kampe: "Kampe & resultater",
    stilling: "Stillingen",
    spillere: "Aalborgs spillere",
  }[view];
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          AFK<span>Aalborg Futsal Klub</span>
        </Link>
        <nav aria-label="Hovednavigation">
          <Link
            href="/kampe/"
            aria-current={view === "kampe" ? "page" : undefined}
          >
            Kampe
          </Link>
          <Link
            href="/stilling/"
            aria-current={view === "stilling" ? "page" : undefined}
          >
            Stilling
          </Link>
          <Link
            href="/spillere/"
            aria-current={view === "spillere" ? "page" : undefined}
          >
            Spillere
          </Link>
        </nav>
      </header>
      <main id="indhold">
        <div className="hero">
          <p className="eyebrow">Aalborg Futsal Klub · På banen</p>
          <h1>{title}</h1>
          <p>
            {view === "kampe"
              ? "Følg Aalborg gennem sæsonen. Se kampprogrammet og de bekræftede resultater."
              : view === "stilling"
                ? "Ligaen, beregnet fra bekræftede kampresultater og registrerede pointjusteringer."
                : "Bekræftede spillerprofiler og de præstationer, vi kender fra kampene."}
          </p>
        </div>
        <aside className="notice">
          {mode === "example"
            ? "Eksempelvisning med lokale testdata. Ikke aktuelle klubdata. "
            : mode === "development"
              ? "Forhåndsvisning fra udviklingsdata. "
              : ""}
          Data er et øjebliksbillede fra seneste bygning af siden. Ændringer
          vises efter en ny bygning.
        </aside>
        {!competitions.length && (
          <section className="panel">
            <h2>Sportsdata er ikke tilgængelige endnu</h2>
            <p>
              Kampprogram, stilling og spillerdata vises her, når de er
              tilsluttet. Manglende data betyder ikke nul kampe eller nul mål.
            </p>
          </section>
        )}
        {competitions.length > 1 && (
          <nav className="competition-nav" aria-label="Turneringer">
            {competitions.map((item, index) => (
              <a key={item.competition._id} href={`#turnering-${index}`}>
                {item.competition.name ?? "Turnering"} ·{" "}
                {item.season?.name ?? "Sæson ukendt"}
              </a>
            ))}
          </nav>
        )}
        {competitions.map((item, index) => (
          <section
            className="competition"
            id={`turnering-${index}`}
            key={item.competition._id}
          >
            <div className="section-heading">
              <p className="eyebrow">
                {item.season?.name ?? "Sæson ikke oplyst"}
              </p>
              <h2>{item.competition.name ?? "Turnering uden navn"}</h2>
            </div>
            {view === "kampe" && (
              <>
                {!item.clubTeams.length && (
                  <p className="notice">
                    Intet Aalborg-hold er udpeget i denne turnering endnu.
                  </p>
                )}
                <section className="panel">
                  <h3>Kampprogram</h3>
                  <p>
                    Planlagte kampe og kampe med uafklaret status. Datoen alene
                    afgør ikke, om en kamp er spillet.
                  </p>
                  <MatchList matches={item.fixtures} names={names} />
                </section>
                <section className="panel">
                  <h3>Resultater</h3>
                  <MatchList matches={item.results} names={names} />
                </section>
              </>
            )}
            {view === "stilling" && (
              <section className="panel">
                <h3>Foreløbig, beregnet stilling</h3>
                {!item.standings ? (
                  <p>
                    Stillingen afventer en bekræftelse af turneringens gældende
                    regelsæt.
                  </p>
                ) : (
                  <>
                    <p>
                      Baseret på {item.standings.includedMatchIds.length}{" "}
                      bekræftede resultater. Nul betyder ingen registrerede
                      point eller resultater i dette udsnit; tabellen kan være
                      ufuldstændig. Dette er ikke DBU’s officielle stilling.
                    </p>
                    {item.standings.issues.length > 0 && (
                      <p className="notice">
                        Der er uafklarede forhold i beregningen. Manglende
                        resultater og pointafgørelser kan påvirke tabellen. Hold
                        med lige point kan have delt placering, fordi
                        oplysninger om udeblivelser eller andre afgørende
                        forhold mangler.
                      </p>
                    )}
                    {!item.standings.rows.length ? (
                      <p>Ingen hold registreret endnu.</p>
                    ) : (
                      <div
                        className="table-scroll"
                        tabIndex={0}
                        role="region"
                        aria-label="Ligatabel"
                      >
                        <table>
                          <caption>
                            {item.competition.name} · Foreløbig stilling
                          </caption>
                          <thead>
                            <tr>
                              {[
                                "Pl.",
                                "Hold",
                                "K",
                                "V",
                                "U",
                                "T",
                                "Mål",
                                "+/−",
                                "Just.",
                                "Point",
                              ].map((label) => (
                                <th key={label} scope="col">
                                  {label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {item.standings.rows.map((row) => (
                              <tr
                                key={row.teamId}
                                className={
                                  item.clubTeams.some(
                                    (team) => team._id === row.teamId,
                                  )
                                    ? "club-row"
                                    : undefined
                                }
                              >
                                <td>
                                  {row.rank}
                                  {row.sharedRank ? " =" : ""}
                                </td>
                                <th scope="row">{row.name}</th>
                                <td>{row.played}</td>
                                <td>{row.won}</td>
                                <td>{row.drawn}</td>
                                <td>{row.lost}</td>
                                <td>
                                  {row.goalsFor}–{row.goalsAgainst}
                                </td>
                                <td>{row.goalDifference}</td>
                                <td>{row.adjustmentPoints}</td>
                                <td>
                                  <strong>{row.points}</strong>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <p className="small">
                      K: kampe · V: vundet · U: uafgjort · T: tabt · Just.:
                      pointjustering · =: delt, uafklaret placering.
                    </p>
                    {item.standings.rows.flatMap((row) =>
                      row.adjustments.map((adjustment) => (
                        <p
                          key={`${row.teamId}-${adjustment.key}`}
                          className="adjustment"
                        >
                          <strong>
                            {row.name}: {adjustment.points > 0 ? "+" : ""}
                            {adjustment.points} point.
                          </strong>{" "}
                          {adjustment.reason}
                          {adjustment.source &&
                            /^https?:\/\//.test(adjustment.source) && (
                              <>
                                {" "}
                                <a href={adjustment.source}>
                                  Kilde til afgørelse
                                </a>
                              </>
                            )}
                        </p>
                      )),
                    )}
                  </>
                )}
              </section>
            )}
            {view === "spillere" && (
              <>
                <p className="notice">
                  Tallene er bekræftede minimumstal i denne turnering, ikke
                  komplette sæsontotaler. 0 betyder ingen bekræftede
                  registreringer; manglende hændelser og uafklarede identiteter
                  kan skjule flere. En ukendt indskifter tæller ikke som en
                  bekræftet kamp.
                </p>
                {!item.squads.length && (
                  <p className="empty">
                    Intet Aalborg-hold er udpeget i denne turnering endnu.
                  </p>
                )}
                {item.squads.map((squad) => (
                  <section className="panel" key={squad.team._id}>
                    <h3>{squad.team.name}</h3>
                    <p>
                      {squad.statistics.coverage.length} afsluttede kampe indgår
                      i datagrundlaget. {squad.missingSections} mangler
                      opstilling eller hændelser. {squad.unresolvedParticipants}{" "}
                      spillerregistreringer mangler bekræftet identitet.{" "}
                      {squad.missingProfiles > 0 &&
                        `${squad.missingProfiles} bekræftede spillerreferencer mangler profil.`}
                    </p>
                    {!squad.players.length && (
                      <p className="empty">
                        Ingen bekræftede spillerprofiler i de registrerede
                        afsluttede kampe endnu. Navne fra importen bliver først
                        vist, når identiteten er afklaret.
                      </p>
                    )}
                    <div className="players">
                      {squad.players.map(({ profile, stats }) => (
                        <article className="player" key={profile._id}>
                          <h4>{profile.name ?? "Navn ikke oplyst"}</h4>
                          <p>
                            {profile.profile || "Profiltekst kommer senere."}
                          </p>
                          <dl>
                            {[
                              ["Bekræftede kampe", stats.knownAppearances],
                              [
                                "Uafklarede optrædener",
                                stats.unknownAppearances,
                              ],
                              ["Bekræftede mål", stats.knownGoals],
                              ["Bekræftede assists", stats.knownAssists],
                              ["Bekræftede gule kort", stats.knownYellowCards],
                              ["Bekræftede røde kort", stats.knownRedCards],
                            ].map(([label, value]) => (
                              <div key={label}>
                                <dt>{label}</dt>
                                <dd>{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </>
            )}
          </section>
        ))}
      </main>
      <footer>
        Aalborg Futsal Klub · Kampdata fra DBU og klubbens registreringer
      </footer>
    </>
  );
}
