import {useCallback, useEffect, useRef, useState} from 'react';
import {isObjectInputProps, PatchEvent, set, unset, type InputProps, type ObjectInputProps} from 'sanity';
import styled from 'styled-components';
import {canonicalValue} from '@afk/sports/ownership';
import {record} from '@afk/sports/validation';
import {clearsAssister, editedFields, fieldLabel, isSportsObject, overridePaths, releaseField} from './editor-state.ts';

const Note = styled.aside`
  border: 1px solid var(--card-border-color, #ccc); border-radius: 6px;
  padding: 12px 16px; margin-bottom: 16px; font-size: 14px; line-height: 1.5;
  p { margin: 0 0 8px; } ul { padding-left: 20px; }
  button { cursor: pointer; font: inherit; padding: 5px 10px; border-radius: 4px; }
  button:disabled { cursor: default; } li { margin: 8px 0; }
`;

async function browserFingerprint(value: unknown): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalValue(value)));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
function SportsObjectInput(props: ObjectInputProps) {
  const value = record(props.value), metadata = record(value.import);
  const imported = metadata.origin === 'imported';
  const paths = overridePaths(value);
  const [message, setMessage] = useState('');
  const [releasing, setReleasing] = useState(false);
  const latest = useRef(props.value);
  useEffect(() => {latest.current = props.value;}, [props.value]);
  const onChange: ObjectInputProps['onChange'] = useCallback(change => {
    const event = PatchEvent.from(change);
    const fields = editedFields(props.schemaType.name, props.value, event.patches);
    if (fields.length) setMessage('');
    const overrides = overridePaths(props.value);
    const next = [...new Set([...overrides, ...fields])];
    props.onChange(fields.some(field => !overrides.includes(field)) ? event.append(set(next, ['import', 'overrides'])) : event);
  }, [props]);
  async function release(field: string) {
    setReleasing(true); setMessage('');
    try {
      const root = field.split('.')[0];
      const original = canonicalValue(record(latest.current)[root]);
      const hash = await browserFingerprint(record(latest.current)[root]);
      if (original !== canonicalValue(record(latest.current)[root])) {setMessage('This value changed while preparing the update. Please try again.'); return;}
      props.onChange(PatchEvent.from(Object.entries(releaseField(latest.current, field, hash)).map(([path, value]) => set(value, path.split('.')))));
      setMessage(`${fieldLabel(field)} can receive DBU data on the next successful sync. Its current value stays in place until then.`);
    } catch {setMessage('Could not prepare the update. Keep the current correction and try again.');}
    finally {setReleasing(false);}
  }
  const identityHint = ['participant', 'goal', 'yellowCard', 'redCard'].includes(props.schemaType.name) && !record(value.player)._ref;
  const notice = metadata.needsReview === true && typeof metadata.reviewReason === 'string';
  return <>
    {(imported || identityHint || notice) && <Note aria-label="Data review and corrections">
      {identityHint && <p>Confirm the player only when you know who they are. You can create a Player from the reference field; keeping the source name unresolved is valid.</p>}
      {imported && <p>Your corrections are kept during future imports. Changes save immediately.</p>}
      {paths.length > 0 && <details>
        <summary>{paths.length} protected {paths.length === 1 ? 'correction' : 'corrections'}</summary>
        <p>Keep a correction, or let the next successful DBU sync supply that field again. Missing DBU information will still preserve known values.</p>
        <ul>{paths.map(path => <li key={path}><strong>{fieldLabel(path)}</strong>{' '}
          <button type="button" disabled={props.readOnly || releasing} aria-label={`Use DBU for ${fieldLabel(path)} on next sync`} onClick={() => void release(path)}>Use DBU next time</button>
        </li>)}</ul>
      </details>}
      {notice && <details>
        <summary>Import notices to check</summary>
        <ul>{[...new Set(String(metadata.reviewReason).split('\n').filter(Boolean).map(line => line.includes(': ') ? line.slice(line.indexOf(': ') + 2) : line))].map(reason => <li key={reason}>{reason}</li>)}</ul>
        <p>After checking these notices, clear them below. Unresolved player, assist, appearance and score issues remain in Sports review. A later import can report a conflict again.</p>
        <button type="button" disabled={props.readOnly} onClick={() => props.onChange(PatchEvent.from([set(false, ['import', 'needsReview']), unset(['import', 'reviewReason'])]))}>Clear checked import notices</button>
      </details>}
      {message && <p role="status">{message}</p>}
    </Note>}
    {props.renderDefault({...props, onChange})}
  </>;
}
function AssistInput(props: ObjectInputProps) {
  const onChange: ObjectInputProps['onChange'] = change => {
    const event = PatchEvent.from(change);
    props.onChange(clearsAssister(event.patches) ? event.append(unset(['player']), unset(['sourceName'])) : event);
  };
  return props.renderDefault({...props, onChange});
}
export function SportsInput(props: InputProps) {
  if (isObjectInputProps(props) && props.schemaType.name === 'assist') return <AssistInput {...props}/>;
  return isObjectInputProps(props) && isSportsObject(props.schemaType.name)
    ? <SportsObjectInput {...props}/> : props.renderDefault(props);
}
