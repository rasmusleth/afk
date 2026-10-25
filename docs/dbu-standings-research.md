# DBU standings observations

Checked on 2026-10-25 against public first-party pages. No authentication or
Sanity data was used. These observations support a derived table and comparison;
the official table must not become a second editable source of match results.

## Applicable league rules

Pool 508399 identifies itself as Futsal Liga - Herrer. Its
[pool rules page](https://www.dbu.dk/resultater/pulje/508399/regler) links directly
to the national men's Futsalligaen propositions, establishing which rules apply.
Do not substitute a local-union or first-division futsal regulation.

The [national propositions](https://www.dbu.dk/turneringer-og-resultater/love-og-regler/landsdaekkende-turneringer/turneringspropositioner/propositioner-for-futsal-dm-for-herrer/)
specify three points for winning and one for drawing (§8.1). Under §8.2,
equal-point teams are separated in this order:

1. Fewer failures to appear.
2. Overall goal difference.
3. Overall goals scored.
4. Overall away goals scored.
5. Wins.
6. Head-to-head points.
7. Head-to-head goal difference.
8. Head-to-head goals scored.
9. Head-to-head away goals scored.

Section 8.3 requires a neutral-venue replay if teams remain tied and deciding
placement is necessary. Section 5.2 describes ten teams playing eighteen regular
season matches each. Section 16.5 permits administrator decisions assigning
results and awarding/deducting points for interrupted matches.

The linked page is a live regulation, without a season-specific version shown.
Historical tables therefore require verification against their applicable rules.

## Actual standings markup

The [public standings page](https://www.dbu.dk/resultater/pulje/508399/stilling)
was retrieved with public HTTPS curl because the web reader could not open it.
Observed selectors and columns:

| Element | Observed representation |
| --- | --- |
| Table | `table.sr--pool-position--table` |
| Team row | `tbody tr[data-teamid]` |
| Team identity | `data-teamid="404636_508399"`; same scoped identity in team-cell `onclick` URL |
| Name | `.teamname-logo span` |
| Nine cells | Position, team, K, V, U, T, Score, P, remark |
| Totals | K=played; V=wins; U=draws; T=losses; P=points |
| Score components | `.score-container .home-score` is goals for; `.away-score` is goals against, despite class names |

One table contains ten team rows; mobile presentation hides cells rather than
duplicating these rows. Points must accept signed integers. Hjørring
`351397_508399` has four wins, no draws/losses, goals 32–8, and **−6 points**.
Aalborg `404636_508399` has four played, no wins, two draws/losses, goals 10–15,
and two points. These are capture-time observations, not durable current totals.
[Source](https://www.dbu.dk/resultater/pulje/508399/stilling).

## Implementation implications and remaining uncertainty

The following are conclusions from these observations, not additional DBU rules:

- Ordinary losses earn zero; the captured rows agree with the 3/1/0 system.
- Hjørring's twelve earned points compared with the displayed minus six imply a
  net adjustment of minus eighteen. The table does **not** establish its reason,
  legal decision, or originating season. Do not invent those facts or silently
  create a Competition adjustment from the discrepancy.
- No-show counts are not present in the observed table. Do not infer zero from a
  missing marker, a normal-looking result, or a zero points adjustment. Exact
  regulation ranking needs explicit counts or an explicit caller assertion that
  none occurred. Otherwise present rankings as provisional.
- For multi-team head-to-head ties, the national text does not state whether to
  restart a mini-table after a subgroup separates. Do not borrow local-union
  semantics silently. Keep unresolved ties visible unless the interpretation is
  established separately.
- An alphabetical/internal-ID sort may stabilize display order, but does not
  resolve a sporting tie or replace a replay.
- Compare played/won/drawn/lost, goals and adjusted points by scoped team identity.
  Report differences, missing rows and unresolved finality; do not overwrite
  matches or standings adjustments to make the comparison pass.
