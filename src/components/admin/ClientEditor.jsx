import { useRef, useState } from 'react';
import { Card } from '../shared/index.jsx';
import { supabase } from '../../supabase/client.js';

export function ClientEditor({ kind, client, record, onCancel, onSaved }) {
  const isPackage = kind === 'package';
  const editing = Boolean(record);
  const [values, setValues] = useState(() => isPackage ? {
    package_name: record?.package_name ?? '', credits_left: record?.recorded?.credits_left ?? record?.credits_left ?? '', total_credits: record?.recorded?.total_credits ?? record?.total_credits ?? '',
    purchase_amount_hkd: record?.purchase_amount_hkd ?? '', remaining_value_hkd: record?.remaining_value_hkd ?? '',
    purchase_date: record?.purchase_date ?? '', expiry_date: record?.recorded?.expiry_date ?? record?.expiry_date ?? '',
  } : { client_name: record?.name ?? '', phone: record?.phone ?? '', email: record?.email ?? '', visits_since_jun: record?.visits === '—' ? '' : record?.visits ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const fields = isPackage ? [
    ['package_name','Package name','text',300], ['total_credits','Total credits','number'], ['credits_left','Credits left','number'],
    ['purchase_amount_hkd','Purchase amount (HK$)','number'], ['remaining_value_hkd','Remaining value (HK$)','number'],
    ['purchase_date','Purchase date','date'], ['expiry_date','Expiry date','date'],
  ] : [['client_name','Client name','text',200],['phone','Phone','tel',80],['email','Email','email',320],['visits_since_jun','Visits since Jun','number']];
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    if (isPackage && Number(values.credits_left) > Number(values.total_credits)) { setError('Credits left cannot exceed total credits.'); return; }
    if (isPackage && values.expiry_date < values.purchase_date) { setError('Expiry date cannot be before purchase date.'); return; }
    submitting.current = true; setSaving(true); setError('');
    try {
      const details = { ...values };
      fields.forEach(([key,,type]) => { if (type === 'number') details[key] = values[key] === '' ? null : Number(values[key]); });
      const args = { p_id: record?.id ?? null, p_version: record?.version ?? null, p_details: details };
      if (isPackage) args.p_client_id = client.id;
      const { data, error: failed } = await supabase.rpc(isPackage ? 'save_studio_client_package' : 'save_studio_client', args);
      if (failed) {
        setError(failed.code === '40001' ? 'This record was changed by another admin. Cancel and refresh before editing again.' : 'Could not save. Check the details and try again.');
      } else await onSaved(isPackage ? client.id : data);
    } catch { setError('Could not save. Check your connection and try again.'); }
    finally { submitting.current = false; setSaving(false); }
  }
  return <div className="admin-page">
    <h1 className="admin-editor-title">{editing ? 'Edit' : 'Add'} {isPackage ? 'package' : 'client'}</h1>
    {isPackage && <p className="admin-muted">For {client.name}. This updates studio records only; it does not charge the client or issue online booking credits.</p>}
    {isPackage && record?.mindbody?.service_id && <p className="admin-client-notice">Remaining sessions and expiry are synced from Mindbody. Change them in Mindbody; the next sync will update this page. This form edits the underlying studio record.</p>}
    <Card pad={22}><form onSubmit={submit}>
      <fieldset disabled={saving} className="admin-editor-fields">
        {fields.map(([key,label,type,maxLength]) => <label key={key}>{label}
          <input type={type} value={values[key]} maxLength={maxLength} disabled={Boolean(record?.mindbody?.service_id && ['credits_left','total_credits','expiry_date','package_name','purchase_date'].includes(key))} required={isPackage || key === 'client_name'}
            min={type === 'number' ? 0 : undefined} step={type === 'number' ? key.endsWith('_hkd') ? '0.01' : '1' : undefined}
            max={type === 'number' ? key.endsWith('_hkd') ? '9999999999.99' : '2147483647' : undefined}
            onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} />
        </label>)}
      </fieldset>
      {error && <p role="alert" className="admin-client-notice">{error}</p>}
      <div className="admin-editor-actions"><button type="button" disabled={saving} onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={saving} className="admin-editor-save">{saving ? 'Saving…' : 'Save changes'}</button></div>
    </form></Card>
  </div>;
}
