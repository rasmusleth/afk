import {appearanceFromEvidence, record} from './validation.ts';
export type ReviewPath = (string | {_key: string})[];
export interface ReviewDocument { _id: string; _type: string; [field: string]: unknown }
export type ReviewCategory = 'identity' | 'assist' | 'appearance' | 'score' | 'import';
export interface SportsReviewItem {
  id: string; documentId: string; documentType: string; title: string;
  category: ReviewCategory; reason: string; path: ReviewPath; priority: number; club: boolean;
}
/** Sanity edit intents accept keyed paths; never link by a mutable array index. */
export function reviewPath(path: ReviewPath): string {
  return path.map((part, index) => typeof part === 'string' ? `${index ? '.' : ''}${part}` : `[_key==${JSON.stringify(part._key)}]`).join('');
}
export function matchReviewTitle(document: ReviewDocument, byId: Map<string, ReviewDocument>): string {
  const home = byId.get(String(record(document.homeTeam)._ref)), away = byId.get(String(record(document.awayTeam)._ref));
  const kickoff = record(document.kickoff);
  const date = typeof kickoff.date === 'string' ? kickoff.date : typeof kickoff.dateTime === 'string' ? kickoff.dateTime.slice(0, 10) : '';
  return `${home?.name ?? 'Home'} – ${away?.name ?? 'Away'}${date ? ` · ${date}` : ''}`;
}
const fields = new Set(['name', 'season', 'competition', 'homeTeam', 'awayTeam', 'kickoff', 'venue', 'status', 'score', 'participants', 'events', 'team', 'player', 'sourceName', 'shirtNumber', 'lineupStatus', 'appearance', 'minute', 'method', 'assist']);
/** Historical diagnostics may use source indices. Link those to the array only. */
function noticePath(field: string, document: ReviewDocument): ReviewPath {
  const match = /^(participants|events)\[([^\]]+)\](?:\.([a-zA-Z]+))?$/.exec(field);
  if (match) {
    const [, array, key, child] = match;
    const items = Array.isArray(document[array]) ? document[array].map(record) : [];
    if (items.some(item => item._key === key)) return [array, {_key: key}, ...(child && fields.has(child) ? [child] : [])];
    return [array];
  }
  const root = field.split('.')[0];
  return fields.has(root) ? [root] : [];
}
const dynamicReason = (reason: string) => /Player identity unresolved|Assist remains unknown|Substitute appearance remains unknown|Known goal coverage differs from official source score/.test(reason);

function importNotices(document: ReviewDocument) {
  const owners: {value: unknown; prefix: ReviewPath}[] = [{value: document, prefix: []}];
  if (document._type === 'match') for (const field of ['participants', 'events']) {
    for (const item of Array.isArray(document[field]) ? document[field].map(record) : []) {
      if (typeof item._key === 'string') owners.push({value: item, prefix: [field, {_key: item._key}]});
    }
  }
  return owners.flatMap(({value, prefix}) => {
    const metadata = record(record(value).import);
    if (metadata.needsReview !== true || typeof metadata.reviewReason !== 'string') return [];
    return metadata.reviewReason.split('\n').filter(Boolean).map(line => {
      const separator = line.indexOf(': ');
      const field = separator < 0 ? '' : line.slice(0, separator);
      const reason = separator < 0 ? line : line.slice(separator + 2);
      const path = prefix.length ? [...prefix, ...(fields.has(field) ? [field] : [])] : noticePath(field, document);
      return {prefix, path, line, reason, metadata};
    });
  });
}

/** Clear only this checked notice, including its duplicate match/item copies. */
export function dismissImportNotice(document: ReviewDocument, item: SportsReviewItem): Record<string, string | boolean> {
  if (item.category !== 'import' || item.documentId !== document._id) throw new Error('Only a stored import notice on this document can be dismissed.');
  const notices = importNotices(document);
  const matching = notices.filter(notice => notice.reason === item.reason && reviewPath(notice.path) === reviewPath(item.path));
  const changes: Record<string, string | boolean> = {};
  for (const notice of matching) {
    const removed = new Set(matching.filter(other => reviewPath(other.prefix) === reviewPath(notice.prefix)).map(other => other.line));
    const remaining = String(notice.metadata.reviewReason).split('\n').filter(line => line && !removed.has(line));
    changes[reviewPath([...notice.prefix, 'import', 'needsReview'])] = remaining.length > 0;
    changes[reviewPath([...notice.prefix, 'import', 'reviewReason'])] = remaining.join('\n');
  }
  return changes;
}

/** Read model only. Unknown facts remain valid; no totals or review rows are stored. */
export function sportsReview(documents: ReviewDocument[]): SportsReviewItem[] {
  const byId = new Map(documents.map(d => [d._id, d]));
  const items: SportsReviewItem[] = [];
  const seen = new Set<string>();
  const add = (document: ReviewDocument, title: string, category: ReviewCategory, reason: string, path: ReviewPath, club: boolean, priority: number) => {
    const id = `${document._id}:${category}:${reviewPath(path)}:${reason}`;
    if (!seen.has(id)) {seen.add(id); items.push({id, documentId: document._id, documentType: document._type, title, category, reason, path, club, priority});}
  };
  for (const document of documents) {
    if (document._id.startsWith('drafts.') || document._id.startsWith('versions.')) continue;
    const home = byId.get(String(record(document.homeTeam)._ref));
    const away = byId.get(String(record(document.awayTeam)._ref));
    const matchClub = home?.isClubTeam === true || away?.isClubTeam === true;
    const title = document._type === 'match' ? matchReviewTitle(document, byId) : String(document.name ?? document._type);
    for (const notice of importNotices(document)) {
      if (!dynamicReason(notice.line)) add(document, title, 'import', notice.reason, notice.path, matchClub || document.isClubTeam === true, 0);
    }
    if (document._type !== 'match') continue;
    for (const field of ['participants', 'events'] as const) {
      for (const item of Array.isArray(document[field]) ? document[field].map(record) : []) {
        if (typeof item._key !== 'string') continue;
        const path: ReviewPath = [field, {_key: item._key}];
        const club = byId.get(String(record(item.team)._ref))?.isClubTeam === true;
        const name = typeof item.sourceName === 'string' ? item.sourceName : 'Unnamed player';
        const itemTitle = `${title} · ${name}${field === 'events' && typeof item.minute === 'number' ? ` · ${item.minute}′` : ''}`;
        if (!record(item.player)._ref) add(document, itemTitle, 'identity', 'Confirm who this player is. A source name alone is not a confirmed identity.', [...path, 'player'], club, club ? 1 : 5);
        if (club && document.status === 'completed' && field === 'participants' && item.lineupStatus === 'substitute' && appearanceFromEvidence(document, item) === 'unknown') add(document, itemTitle, 'appearance', 'Did this substitute play? Being listed does not establish an appearance.', [...path, 'appearance'], true, 2);
        if (club && document.status === 'completed' && item._type === 'goal' && record(item.assist).status === 'unknown') add(document, itemTitle, 'assist', 'Record a confirmed assister, choose no assist, or leave unknown until you know.', [...path, 'assist'], true, 2);
        if (club && item._type === 'goal' && record(item.assist).status === 'credited' && !record(record(item.assist).player)._ref) add(document, itemTitle, 'identity', 'Confirm the credited assister’s identity; their source name is preserved.', [...path, 'assist', 'player'], true, 1);
      }
    }
    if (document.status === 'completed' && document.score && Array.isArray(document.events)) {
      for (const team of [home, away]) {
        if (!team) continue;
        const score = record(document.score)[team === home ? 'home' : 'away'];
        if (typeof score !== 'number') continue;
        const goals = document.events.map(record).filter(event => event._type === 'goal' && record(event.team)._ref === team._id).length;
        if (goals !== score) add(document, title, 'score', `${team.name}: official score is ${score}, but ${goals} goal events are recorded. Check coverage; do not invent events.`, ['events'], matchClub, 0);
      }
    }
  }
  return items.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}
