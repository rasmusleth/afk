import {useCallback, useEffect, useMemo, useState} from 'react';
import {useClient} from 'sanity';
import {IntentLink} from 'sanity/router';
import styled from 'styled-components';
import {dismissImportNotice, matchReviewTitle, sportsReview, reviewPath, type ReviewDocument, type ReviewCategory, type SportsReviewItem} from '@afk/sports/review';
import {loadReviewDocuments} from './load-review.ts';
import {record} from '@afk/sports/validation';

const Page = styled.main`
  overflow: auto; height: 100%; box-sizing: border-box; padding: 24px;
  color: var(--card-fg-color); background: var(--card-bg-color);
  font: inherit; line-height: 1.5;
  > div { max-width: 1000px; margin: auto; }
  h1 { margin: 0 0 8px; } p { margin-top: 0; }
  a { color: var(--card-link-color, #305bc0); }
  .filters { display: flex; flex-wrap: wrap; gap: 16px; align-items: end; margin: 24px 0; }
  label { display: grid; gap: 4px; min-width: 0; max-width: 100%; }
  select { max-width: 100%; }
  select, button { font: inherit; padding: 8px 12px; border-radius: 5px; }
  button { cursor: pointer; } button:disabled { cursor: default; }
  ul { padding: 0; list-style: none; }
  li { border: 1px solid var(--card-border-color, #ccc); border-radius: 6px; padding: 16px; margin: 12px 0; }
  li p { margin: 4px 0 8px; } .category { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; }
`;
const categoryNames: Record<ReviewCategory, string> = {identity: 'Player identity', assist: 'Unknown assist', appearance: 'Substitute appearance', score: 'Score coverage', import: 'Import discrepancy'};
const query = '*[_id > $after && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && _type in ["season", "competition", "team", "player", "match"]] | order(_id asc)[0...500]';
export function ReviewTool() {
  const client = useClient({apiVersion: '2026-03-01'});
  const [documents, setDocuments] = useState<ReviewDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scope, setScope] = useState('club');
  const [category, setCategory] = useState('all');
  const [matchId, setMatchId] = useState('all');
  const [version, setVersion] = useState(0);
  const [dismissing, setDismissing] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const refresh = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const next = await loadReviewDocuments(after => client.fetch(query, {after}, {perspective: 'published', useCdn: false}));
        if (active) setDocuments(next);
      } catch {if (active) setError('Could not load the complete review list. Check your connection and access, then refresh. No data was changed.');}
      finally {if (active) setLoading(false);}
    }
    void load();
    return () => {active = false;};
  }, [client, version]);
  const issues = useMemo(() => sportsReview(documents), [documents]);
  const shown = issues.filter(item => (scope === 'all' || item.club || item.category === 'import') && (category === 'all' || item.category === category) && (matchId === 'all' || item.documentId === matchId));
  const byId = useMemo(() => new Map(documents.map(doc => [doc._id, doc])), [documents]);
  async function dismiss(item: SportsReviewItem) {
    setDismissing(item.id); setNoticeMessage('');
    try {
      const document = byId.get(item.documentId);
      if (!document || typeof document._rev !== 'string') throw new Error('Refresh required.');
      const changes = dismissImportNotice(document, item);
      if (!Object.keys(changes).length) throw new Error('Refresh required.');
      await client.patch(document._id).ifRevisionId(document._rev).set(changes).commit();
      setNoticeMessage('Notice dismissed. Your corrections are unchanged. A later import can report a conflict again.');
      refresh();
    } catch {setNoticeMessage('Could not dismiss the notice. Refresh and try again; check edit access if it persists.');}
    finally {setDismissing('');}
  }
  const clubTeams = documents.filter(doc => doc._type === 'team' && doc.isClubTeam === true);
  return <Page><div>
    <h1>Sports review</h1>
    <p>Resolve uncertain facts and check import discrepancies. Corrections save immediately; this list does not hold up publication.</p>
    <div className="filters">
      <label>Show<select value={scope} onChange={event => setScope(event.target.value)}><option value="club">Aalborg and import discrepancies</option><option value="all">All teams</option></select></label>
      <label>Issue<select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All issues</option>{Object.entries(categoryNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
      <label>Match<select value={matchId} onChange={event => setMatchId(event.target.value)}><option value="all">All records</option>{documents.filter(doc => doc._type === 'match').map(doc => <option key={doc._id} value={doc._id}>{matchReviewTitle(doc, byId)}</option>)}</select></label>
      <button type="button" disabled={loading} onClick={refresh}>Refresh review</button>
    </div>
    {loading && <p role="status">Loading review…</p>}
    {error && <p role="alert">{error}</p>}
    {noticeMessage && <p role="status">{noticeMessage}</p>}
    {!loading && !error && <>
      {clubTeams.length === 0 && <section aria-label="Choose Aalborg entries"><h2>Choose your Aalborg team entries</h2><p>Open each Aalborg Team and enable “Aalborg team”. This gives your club priority without guessing identity from names.</p><ul>{documents.filter(doc => doc._type === 'team').map(doc => <li key={doc._id}><IntentLink intent="edit" params={{id: doc._id, type: 'team', path: 'isClubTeam'}}>{String(doc.name ?? 'Unnamed team')}</IntentLink></li>)}</ul></section>}
      <p role="status">{shown.length} {shown.length === 1 ? 'issue' : 'issues'} in this view. Refresh after making changes.</p>
      {shown.length === 0 && <p>No current issues in this view. Unknown data remains valid; choose All teams to review opponent identities.</p>}
      <ul aria-label="Sports review issues">{shown.map(item => <li key={item.id}>
        <span className="category">{categoryNames[item.category]}</span><h2 style={{fontSize: '1rem', margin: '4px 0'}}>{item.title}</h2>
        <p>{item.reason}</p>
        {item.category === 'import' && <p><button type="button" disabled={loading || !!dismissing} onClick={() => void dismiss(item)}>{dismissing === item.id ? 'Dismissing…' : 'Dismiss checked notice'}</button></p>}
        <IntentLink intent="edit" params={{id: item.documentId, type: item.documentType, ...(item.path.length ? {path: reviewPath(item.path)} : {})}}>Open affected {item.documentType === 'match' ? 'match field' : 'record'}</IntentLink>
        {(() => {const external = record(byId.get(item.documentId)?.external); const url = external.sourceUrl;
          return typeof url === 'string' && /^https:\/\/(?:www\.)?dbu\.dk\//.test(url) ? <> · <a href={url} target="_blank" rel="noreferrer">Check DBU source</a></> : null;
        })()}
      </li>)}</ul>
    </>}
  </div></Page>;
}
