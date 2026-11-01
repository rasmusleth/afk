import {editorialDocuments} from "./editorial";
import {defineArrayMember, defineField, defineType} from 'sanity';
import {
  record, validateName, validateSeason, validateScore, validateAssist,
  validateParticipant, validateEvent, validateAdjustment, validateExternal,
  validateImport, validateKickoff, validateMatch, validateTeamIdentity,
} from '@afk/sports/validation';

const reference = (name: string, title: string, to: string, required = false) => defineField({
  name, title, type: 'reference', to: [{type: to}],
  validation: rule => required ? rule.required() : rule,
});
const choice = (name: string, title: string, values: {title: string; value: string}[], initialValue?: string) => defineField({
  name, title, type: 'string', options: {list: values, layout: 'radio'}, initialValue,
  validation: rule => rule.required().custom(value => value == null || values.some(option => option.value === value) || 'Choose one of the available values.'),
});
const metadata = () => [
  defineField({name: 'external', title: 'External identity', type: 'externalIdentity', hidden: true, readOnly: true}),
  defineField({name: 'import', title: 'Import and overrides', type: 'importMetadata', hidden: true, readOnly: true}),
];
const nameField = () => defineField({name: 'name', title: 'Name', type: 'string', validation: rule => rule.required().custom(validateName)});
const personFields = () => [
  reference('team', 'Team', 'team', true),
  reference('player', 'Player (confirmed identity)', 'player'),
  defineField({name: 'sourceName', title: 'Name on source', type: 'string', description: 'Preserve the source name. Only link a player when identity is certain.'}),
];
const originInitial = {import: {_type: 'importMetadata', origin: 'manual'}};

const externalIdentity = defineType({
  name: 'externalIdentity', title: 'External identity', type: 'object',
  validation: rule => rule.custom(validateExternal),
  fields: [
    defineField({name: 'source', type: 'string', validation: rule => rule.required()}),
    defineField({name: 'id', title: 'Source identifier', type: 'string', description: 'Match number, competition pool ID, scoped team-entry ID, or verified player ID.', validation: rule => rule.required()}),
    defineField({name: 'scope', title: 'Identity scope', type: 'string', description: 'DBU team entries must carry the competition pool ID as their scope.'}),
    defineField({name: 'sourceUrl', type: 'url'}),
  ],
});
const scheduleFieldBaseline = defineType({
  name: 'scheduleFieldBaseline', title: 'Schedule field baseline', type: 'object',
  fields: [
    defineField({name: 'path', type: 'string', validation: rule => rule.required()}),
    defineField({name: 'fingerprint', type: 'string', validation: rule => rule.required().regex(/^[a-f0-9]{64}$/)}),
  ],
});
const importMetadata = defineType({
  name: 'importMetadata', title: 'Import metadata', type: 'object',
  validation: rule => rule.custom(validateImport),
  fields: [
    choice('origin', 'Origin', [{title: 'Manual', value: 'manual'}, {title: 'Imported', value: 'imported'}], 'manual'),
    ...['firstImportedAt', 'lastSeenAt', 'lastScheduleSyncAt', 'lastDetailSyncAt'].map(name => defineField({name, type: 'datetime'})),
    defineField({name: 'overrides', type: 'array', of: [defineArrayMember({type: 'string'})], description: 'Paths relative to this object. Clearing a path allows the next successful sync to supply that field.', validation: rule => rule.unique()}),
    defineField({name: 'scheduleBaseline', title: 'Last accepted schedule field fingerprints', type: 'array', readOnly: true, hidden: true, of: [defineArrayMember({type: 'scheduleFieldBaseline'})]}),
    defineField({name: 'detailBaseline', type: 'array', hidden: true, readOnly: true, of: [defineArrayMember({type: 'scheduleFieldBaseline'})]}),
    defineField({name: 'detailSignature', type: 'string', hidden: true, readOnly: true}),
    defineField({name: 'detailKeys', type: 'array', hidden: true, readOnly: true, of: [defineArrayMember({type: 'string'})]}),
    defineField({name: 'needsReview', type: 'boolean'}),
    defineField({name: 'reviewReason', type: 'text', rows: 2}),
  ],
});
const season = defineType({
  name: 'season', title: 'Season', type: 'document', liveEdit: true, initialValue: originInitial,
  fields: [nameField(), defineField({name: 'startDate', title: 'Start date', type: 'date', validation: rule => rule.required()}), defineField({name: 'endDate', title: 'End date', type: 'date', validation: rule => rule.required()}), ...metadata()],
  validation: rule => rule.custom(validateSeason),
});
const pointsAdjustment = defineType({
  name: 'pointsAdjustment', title: 'Points adjustment', type: 'object',
  validation: rule => rule.custom(validateAdjustment),
  fields: [
    reference('team', 'Affected team', 'team', true),
    defineField({name: 'points', title: 'Points change', type: 'number', description: 'Signed change, for example -3 for a deduction.', validation: rule => rule.required().integer()}),
    defineField({name: 'reason', title: 'Reason', type: 'text', rows: 2, validation: rule => rule.required().custom(validateName)}),
    defineField({name: 'source', title: 'Ruling source or citation', type: 'string'}),
    reference('originatingSeason', 'Season the ruling originated in (if different)', 'season'),
  ],
  preview: {select: {team: 'team.name', points: 'points', subtitle: 'reason'}, prepare: ({team, points, subtitle}) => ({title: `${team ?? 'Team'}: ${points > 0 ? '+' : ''}${points ?? '?'}`, subtitle})},
});
const competition = defineType({
  name: 'competition', title: 'Competition', type: 'document', liveEdit: true, initialValue: originInitial,
  fields: [nameField(), reference('season', 'Season', 'season', true), defineField({name: 'pointsAdjustments', title: 'Points adjustments', type: 'array', description: 'Rulings affecting this competition only. Multiple rulings for a team are allowed.', of: [defineArrayMember({type: 'pointsAdjustment'})]}), ...metadata()],
  preview: {select: {title: 'name', subtitle: 'season.name'}},
});
const team = defineType({
  name: 'team', title: 'Team', type: 'document', liveEdit: true, initialValue: originInitial,
  description: 'A playing side or competition entry, rather than the wider club.',
  fields: [nameField(), defineField({name: 'isClubTeam', title: 'Aalborg team', type: 'boolean', description: 'Turn on for Aalborg entries to prioritize their identity, assists and appearances in Sports review.'}), defineField({name: 'shortName', title: 'Short name', type: 'string'}), ...metadata()],
  validation: rule => rule.custom(value => {
    return validateTeamIdentity(record(value).external);
  }),
});
const player = defineType({
  name: 'player', title: 'Player', type: 'document', liveEdit: true, initialValue: originInitial,
  description: 'Confirmed identity and public profile. Statistics are derived from matches.',
  fields: [nameField(), defineField({name: 'profile', title: 'Public profile', type: 'text'}), ...metadata()],
});
const score = defineType({
  name: 'score', title: 'Official score', type: 'object', validation: rule => rule.custom(validateScore),
  description: 'The official result can be known even when goal events are incomplete. Leave empty when unknown.',
  options: {columns: 2},
  fields: ['home', 'away'].map(name => defineField({name, title: name === 'home' ? 'Home' : 'Away', type: 'number', validation: rule => rule.required().integer().min(0)})),
});
const kickoff = defineType({
  name: 'kickoff', title: 'Kickoff', type: 'object', validation: rule => rule.custom(validateKickoff),
  fields: [
    choice('precision', 'What is known?', [{title: 'Unknown', value: 'unknown'}, {title: 'Date only', value: 'date'}, {title: 'Exact time', value: 'time'}], 'unknown'),
    defineField({name: 'date', title: 'Match date', type: 'date', description: 'Use for date-only precision; clear when precision changes.'}),
    defineField({name: 'dateTime', title: 'Kickoff time', type: 'datetime', description: 'Use for exact-time precision; clear when precision changes.'}),
  ],
});
const participant = defineType({
  name: 'participant', title: 'Participant', type: 'object', initialValue: {...originInitial, lineupStatus: 'unknown', appearance: 'unknown'},
  validation: rule => rule.custom(validateParticipant),
  fields: [
    ...personFields(),
    defineField({name: 'shirtNumber', title: 'Shirt number in this match', type: 'number', validation: rule => rule.integer().min(0)}),
    choice('lineupStatus', 'Lineup', [{title: 'Starter', value: 'starter'}, {title: 'Substitute', value: 'substitute'}, {title: 'Unknown', value: 'unknown'}], 'unknown'),
    {...choice('appearance', 'Appearance', [{title: 'Played', value: 'played'}, {title: 'Did not play', value: 'didNotPlay'}, {title: 'Unknown', value: 'unknown'}], 'unknown'), description: 'A substitute listing alone does not prove an appearance. Completed-match starters and players involved in events have evidence of playing.'},
    ...metadata(),
  ],
  preview: {select: {player: 'player.name', source: 'sourceName', team: 'team.name', lineup: 'lineupStatus'}, prepare: ({player, source, team, lineup}) => ({title: player ?? source ?? 'Unresolved player', subtitle: `${team ?? 'Team'} · ${lineup ?? 'unknown'}`})},
});
const assist = defineType({
  name: 'assist', title: 'Assist', type: 'object', initialValue: {status: 'unknown'}, validation: rule => rule.custom(validateAssist),
  fields: [
    choice('status', 'Assist', [{title: 'Unknown', value: 'unknown'}, {title: 'No assist', value: 'none'}, {title: 'Credited', value: 'credited'}], 'unknown'),
    {...reference('player', 'Assister (confirmed identity)', 'player'), hidden: ({parent}) => parent?.status !== 'credited', description: 'Use only for a credited assist; clear when selecting none or unknown.'},
    defineField({name: 'sourceName', title: 'Assister name on source', type: 'string', hidden: ({parent}) => parent?.status !== 'credited', description: 'Use only for a credited assist; clear when selecting none or unknown.'}),
  ],
});
const events = (['goal', 'yellowCard', 'redCard'] as const).map(name => defineType({
  name, title: {goal: 'Goal', yellowCard: 'Yellow card', redCard: 'Red card'}[name], type: 'object',
  initialValue: {...originInitial, ...(name === 'goal' ? {assist: {_type: 'assist', status: 'unknown'}} : {})},
  validation: rule => rule.custom(validateEvent),
  fields: [...personFields(), defineField({name: 'minute', title: 'Minute (if known)', type: 'number', validation: rule => rule.integer().min(0)}), ...(name === 'goal' ? [choice('method', 'Scoring method', [{title: 'Unspecified', value: 'unspecified'}, {title: 'Penalty', value: 'penalty'}], 'unspecified'), defineField({name: 'assist', title: 'Assist', type: 'assist', validation: rule => rule.required()})] : []), ...metadata()],
  preview: {select: {player: 'player.name', source: 'sourceName', team: 'team.name', minute: 'minute'}, prepare: ({player, source, team, minute}) => ({title: `${player ?? source ?? 'Unresolved player'}${minute == null ? '' : ` · ${minute}′`}`, subtitle: `${name} · ${team ?? 'Team'}`})},
}));
const match = defineType({
  name: 'match', title: 'Match', type: 'document', liveEdit: true, initialValue: {...originInitial, status: 'unknown'},
  groups: [{name: 'fixture', title: 'Fixture & result', default: true}, {name: 'participants', title: 'Lineup'}, {name: 'events', title: 'Events'}],
  description: 'Changes take effect immediately. Unknown details are valid; do not invent missing facts.',
  validation: rule => rule.custom(validateMatch),
  fields: [
    {...reference('competition', 'Competition', 'competition', true), group: 'fixture'},
    {...reference('homeTeam', 'Home team', 'team', true), group: 'fixture'},
    {...reference('awayTeam', 'Away team', 'team', true), group: 'fixture'},
    defineField({name: 'kickoff', title: 'Kickoff', type: 'kickoff', group: 'fixture'}),
    defineField({name: 'venue', title: 'Venue', type: 'string', group: 'fixture'}),
    {...choice('status', 'Status', [{title: 'Unknown', value: 'unknown'}, {title: 'Scheduled', value: 'scheduled'}, {title: 'Completed', value: 'completed'}, {title: 'Postponed', value: 'postponed'}, {title: 'Cancelled', value: 'cancelled'}, {title: 'Abandoned', value: 'abandoned'}], 'unknown'), group: 'fixture'},
    defineField({name: 'score', title: 'Official score', type: 'score', group: 'fixture'}),
    defineField({name: 'participants', title: 'Participants', type: 'array', group: 'participants', of: [defineArrayMember({type: 'participant'})]}),
    defineField({name: 'events', title: 'Match events', type: 'array', group: 'events', of: events.map(event => defineArrayMember({type: event.name}))}),
    ...metadata(),
  ],
  preview: {select: {home: 'homeTeam.name', away: 'awayTeam.name', subtitle: 'competition.name'}, prepare: ({home, away, subtitle}) => ({title: `${home ?? 'Home'} – ${away ?? 'Away'}`, subtitle})},
});
export const sportsDocuments = [season, competition, team, player, match];
export const schemaTypes = [externalIdentity, scheduleFieldBaseline, importMetadata, pointsAdjustment, score, kickoff, participant, assist, ...events, ...sportsDocuments, ...editorialDocuments];
