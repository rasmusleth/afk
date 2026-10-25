import {createInterface} from 'node:readline';
import {Writable} from 'node:stream';
import {stdin, stderr} from 'node:process';
import {SyncError} from './model.ts';

/** No environment-variable fallback, argv secret, echo, or secret logging. */
export function readToken(): Promise<string> {
  if (!stdin.isTTY || !stderr.isTTY) return Promise.reject(new SyncError('Token entry requires an interactive terminal; piping credentials is not supported.'));
  const muted = new Writable({write(_chunk, _encoding, callback) { callback(); }});
  const terminal = createInterface({input: stdin, output: muted, terminal: true});
  stderr.write('Sanity content token (hidden; Enter to submit, Ctrl+C to cancel): ');
  return new Promise((resolve, reject) => {
    let answered = false;
    terminal.once('SIGINT', () => terminal.close());
    terminal.once('close', () => { if (!answered) { stderr.write('\n'); reject(new SyncError('Token entry cancelled.')); } });
    terminal.question('', answer => {
      answered = true;
      terminal.close();
      stderr.write('\n');
      if (!answer.trim() || /\s/.test(answer)) reject(new SyncError('Empty or malformed token entry.'));
      else resolve(answer);
    });
  });
}
export async function confirmApply(target: string): Promise<void> {
  if (!stdin.isTTY) throw new SyncError('Applying a plan requires an interactive terminal confirmation.');
  const terminal = createInterface({input: stdin, output: stderr});
  try {
    const answer = await new Promise<string>((resolve, reject) => {
      let answered = false;
      terminal.once('close', () => { if (!answered) reject(new SyncError('Import confirmation cancelled.')); });
      terminal.question(`Type "apply ${target}" to commit the plan above: `, value => { answered = true; resolve(value); });
    });
    if (answer !== `apply ${target}`) throw new SyncError('Import cancelled; no mutation was sent.');
  } finally { terminal.close(); }
}
