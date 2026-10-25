import {readFile} from 'node:fs/promises';
import {parseStandings, normalizeStandings} from '@afk/dbu/standings';
import {record} from '@afk/sports/validation';
import {readToken} from './prompt.ts';
import {sanityStore, decodeDocuments} from './sanity-store.ts';
import {fetchStanding, standingUrl} from './fetch.ts';
import {parseReportOptions, decodeNoShows} from './report-options.ts';
import {buildSportsReport} from './report.ts';
import {SyncError} from './model.ts';
async function main() {
  if (process.argv.slice(2).includes('--help')) {
    console.log(`Read-only derived sports report. Never writes to Sanity.
Required: --competition PUBLISHED_ID --rules national-futsal-men (verify applicability)
Offline: --existing DOCUMENT_ARRAY_JSON [--standing-html FILE]
Connected: --project ID --dataset development [--compare-dbu | --standing-html FILE]
Optional verified ranking inputs: --no-shows TEAM_COUNTS_JSON | --assume-no-shows-zero
Default: tied ranks remain unresolved without verified no-show counts.
The connected token is entered through a hidden prompt. A Viewer token is sufficient.
Counts are known facts with separate uncertainty/coverage, not exhaustive player totals.`); return;
  }
  const options = parseReportOptions(process.argv.slice(2), process.env.INIT_CWD ?? process.cwd());
  const documents = options.existing ? decodeDocuments(JSON.parse(await readFile(options.existing, 'utf8'))) : await sanityStore({projectId: options.projectId!, dataset: options.dataset!, token: await readToken()}).load([]);
  const source = documents.find(d => d._id === options.competitionId && d._type === 'competition');
  let standing;
  if (options.standingHtml || options.compareDbu) {
    const external = record(source?.external);
    if (external.source !== 'dbu' || typeof external.id !== 'string' || !/^\d+$/.test(external.id)) throw new SyncError('Comparison requires a verified DBU Competition identity.');
    const html = options.standingHtml ? await readFile(options.standingHtml, 'utf8') : await fetchStanding(external.id);
    const normalized = normalizeStandings(parseStandings(html, standingUrl(external.id)));
    if (normalized.diagnostics.length) throw new SyncError('Official table normalization needs review; no comparison was produced.');
    standing = normalized.value;
  }
  const noShows = options.noShowsFile ? decodeNoShows(JSON.parse(await readFile(options.noShowsFile, 'utf8'))) : undefined;
  const report = buildSportsReport(documents, {...options, noShows, standing});
  console.log(JSON.stringify({mode: 'read-only', generatedAt: new Date().toISOString(), comparisonInput: options.standingHtml ? 'saved-html' : options.compareDbu ? 'live-public-html' : null, ...report}, null, 2));
}
main().catch(error => {
  console.error(error instanceof SyncError ? error.message : 'Sports report could not be completed. Review input/configuration and retry. No data was written.');
  process.exitCode = 1;
});
