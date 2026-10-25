import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fetchSchedule} from './fetch.ts';
import {sanityStore, type SanityTransport} from './sanity-store.ts';
import {parseOptions} from './options.ts';
import {SyncError, type Plan} from './model.ts';

const args = ['--pool', '508399', '--season', 'season-example', '--time-zone', 'Europe/Copenhagen'];
const directory = fileURLToPath(new URL('.', import.meta.url));
const fixture = fileURLToPath(new URL('../dbu/fixtures/competition-508399.html', import.meta.url));
const snapshot = fileURLToPath(new URL('./fixtures/empty-development.json', import.meta.url));
const token = 'SYNTHETIC_TEST_VALUE_NOT_A_REAL_TOKEN';
const config = {projectId: 'localtest', dataset: 'development', token};
const plan: Plan = {operations: [
  {kind: 'create', document: {_id: 'dbu-team-1-2', _type: 'team', name: 'Test team'}},
  {kind: 'patch', id: 'dbu-match-1', revision: 'expected-revision', set: {venue: 'New venue'}},
], review: []};

test('Sanity adapter submits creates and revision-checked patches in exactly one mutation request', async () => {
  let calls = 0;
  const transport: SanityTransport = {
    async fetch() { return []; },
    async mutate(mutations, options) {
      calls++;
      assert.deepEqual(mutations, [
        {create: {_id: 'dbu-team-1-2', _type: 'team', name: 'Test team'}},
        {patch: {id: 'dbu-match-1', ifRevisionID: 'expected-revision', set: {venue: 'New venue'}}},
      ]);
      assert.equal(options.visibility, 'sync');
      assert.equal(options.returnDocuments, false);
    },
  };
  const store = sanityStore(config, transport);
  await store.load(['season-example']);
  assert.equal(calls, 0); // loading a connected preview cannot mutate
  await store.commit(plan);
  assert.equal(calls, 1);
});
test('client errors containing request secrets are replaced with safe diagnostics', async () => {
  const transport: SanityTransport = {
    async fetch() { throw new Error(`Authorization: Bearer ${token}`); },
    async mutate() { throw new Error(`Failed request included ${token}`); },
  };
  const store = sanityStore(config, transport);
  for (const action of [() => store.load([]), () => store.commit(plan)]) {
    await assert.rejects(action(), error => error instanceof SyncError && !String(error).includes(token) && error.cause === undefined);
  }
});
test('adapter rejects production, draft writes and unsafe patches before transport use', async () => {
  let calls = 0;
  const transport: SanityTransport = {async fetch() { calls++; return []; }, async mutate() { calls++; }};
  assert.throws(() => sanityStore({...config, dataset: 'production'}, transport), SyncError);
  const store = sanityStore(config, transport);
  await assert.rejects(store.commit({operations: [{kind: 'create', document: {_id: 'drafts.example', _type: 'match'}}], review: []}), SyncError);
  await assert.rejects(store.commit({operations: [{kind: 'patch', id: 'example', revision: 'one', set: {events: []}}], review: []}), SyncError);
  assert.equal(calls, 0);
});
test('paginated snapshot loading reaches subsequent records and does not truncate silently', async () => {
  let page = 0;
  const transport: SanityTransport = {
    async fetch(_query, params) {
      page++;
      if (page === 1) { assert.equal(params.after, ''); return Array.from({length: 500}, (_, i) => ({_id: `team-${String(i).padStart(4, '0')}`, _type: 'team', _rev: 'r'})); }
      assert.equal(params.after, 'team-0499');
      return [{_id: 'team-0500', _type: 'team', _rev: 'r'}];
    }, async mutate() { throw new Error('not called'); },
  };
  assert.equal((await sanityStore(config, transport).load([])).length, 501);
  assert.equal(page, 2);
});
test('DBU retrieval restricts redirects, content types, response size and encoding, without auth headers', async () => {
  let calls = 0;
  const request: typeof fetch = async (input, options) => {
    calls++;
    assert.equal(new Headers(options?.headers).has('authorization'), false);
    assert.equal(new Headers(options?.headers).has('cookie'), false);
    if (calls === 1) return new Response('', {status: 302, headers: {location: 'https://www.dbu.dk/resultater/pulje/508399/kampprogramFuld'}});
    assert.equal(String(input).startsWith('https://www.dbu.dk/'), true);
    return new Response('<html>Æøå</html>', {headers: {'content-type': 'text/html; charset=utf-8'}});
  };
  assert.equal(await fetchSchedule('508399', request), '<html>Æøå</html>');
  for (const response of [
    new Response('', {status: 302, headers: {location: 'https://example.com/private'}}),
    new Response('{}', {headers: {'content-type': 'application/json'}}),
    new Response('x'.repeat(2_000_001), {headers: {'content-type': 'text/html'}}),
    new Response('name', {headers: {'content-type': 'text/html; charset=iso-8859-1'}}),
  ]) await assert.rejects(fetchSchedule('508399', async () => response), SyncError);
});
test('CLI options default to preview, require explicit zone/target, and refuse secret argv or offline apply', () => {
  const offline = [...args, '--html', fixture, '--existing', snapshot];
  assert.equal(parseOptions(offline, directory).apply, false);
  for (const invalid of [
    [...offline, '--apply'], [...args, '--project', 'localtest', '--dataset', 'production'],
    [...offline, '--token', token], args.filter(value => !['--time-zone', 'Europe/Copenhagen'].includes(value)),
  ]) assert.throws(() => parseOptions(invalid, directory), SyncError);
});
test('offline CLI dry-run plans all fixtures without credentials, network or mutations', () => {
  const output = execFileSync(process.execPath, ['cli.ts', ...args, '--html', fixture, '--existing', snapshot], {cwd: directory, encoding: 'utf8'});
  const preview = JSON.parse(output);
  assert.equal(preview.mode, 'dry-run');
  assert.equal(preview.creates, 101);
  assert.equal(preview.patches, 0);
  assert.equal(output.includes('Sanity content token'), false);
});
test('hidden credential prompt refuses piped input without echoing it', () => {
  const promptUrl = new URL('./prompt.ts', import.meta.url).href;
  const output = spawnSync(process.execPath, ['--input-type=module', '-e', `import {readToken} from ${JSON.stringify(promptUrl)}; readToken().catch(error => {console.error(error.message); process.exitCode=1;});`], {cwd: directory, input: token, encoding: 'utf8'});
  assert.equal(output.status, 1);
  assert.equal(`${output.stdout}${output.stderr}`.includes(token), false);
  assert.match(output.stderr, /interactive terminal/);
});
