import {SyncError} from './model.ts';
export const scheduleUrl = (poolId: string) => {
  if (!/^\d+$/.test(poolId)) throw new SyncError('Pool ID must be numeric.');
  return `https://dbu.dk/resultater/pulje/${poolId}/kampprogramFuld`;
};
/** Bounded public HTML retrieval; never sends a Sanity token or browser cookies. */
export async function fetchSchedule(poolId: string, request: typeof fetch = fetch): Promise<string> {
  let url = scheduleUrl(poolId);
  try {
    for (let redirects = 0; redirects <= 3; redirects++) {
      const response = await request(url, {redirect: 'manual', headers: {Accept: 'text/html', 'User-Agent': 'AFK manual schedule importer'}, signal: AbortSignal.timeout(30_000)});
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const target = new URL(response.headers.get('location') ?? '', url);
        if (target.protocol !== 'https:' || !['dbu.dk', 'www.dbu.dk'].includes(target.hostname) || target.username || target.password) throw new SyncError('DBU redirected outside the allowed public source.');
        url = target.href;
        continue;
      }
      if (!response.ok || !response.headers.get('content-type')?.toLowerCase().includes('text/html') || !response.body) throw new SyncError('DBU did not return an HTML schedule.');
      const charset = response.headers.get('content-type')?.match(/charset=([^; ]+)/i)?.[1].replace(/[\"']/g, '').toLowerCase();
      if (charset && !['utf-8', 'utf8'].includes(charset)) throw new SyncError('Unverified source encoding; refusing to corrupt source names.');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2_000_000) { await reader.cancel(); throw new SyncError('DBU response exceeds the schedule size limit.'); }
        chunks.push(value);
      }
      return new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks));
    }
    throw new SyncError('Too many DBU redirects.');
  } catch (error) {
    if (error instanceof SyncError) throw error;
    throw new SyncError('DBU schedule download failed. Check network access and retry; no write was attempted.');
  }
}
