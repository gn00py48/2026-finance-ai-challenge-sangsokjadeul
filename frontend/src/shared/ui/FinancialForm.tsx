import { useState } from 'react';
import type { FinancialItem } from '../types';
import { Check, Error, Field } from './index';

import { itemLabels } from '../format';
export type FinancialInput = Pick<FinancialItem, 'assetOrDebt' | 'itemType' | 'institution' | 'amount' | 'amountStatus' | 'referenceDate' | 'memo'>;

export function FinancialForm({ initial, save, cancel, showMemo = true }: { initial?: FinancialInput; save: (data: FinancialInput) => Promise<void>; cancel: () => void; showMemo?: boolean }) {
  const [f, setF] = useState<FinancialInput>(initial ?? { assetOrDebt: 'ASSET', itemType: 'DEPOSIT', institution: '', amount: null, amountStatus: 'CONFIRMED', referenceDate: '', memo: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <form className="stack" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError('');
    try { await save({ ...f, amount: f.amountStatus === 'NEEDS_CONFIRMATION' ? null : f.amount, referenceDate: f.referenceDate || undefined }); }
    catch (e) { setError((e as globalThis.Error).message); }
    finally { setBusy(false); }
  }}>
    <fieldset disabled={busy} className="stack form-fields">
      <div className="seg">{[['ASSET', '재산'], ['DEBT', '채무']].map(([value, label]) => <button type="button" key={value} aria-pressed={f.assetOrDebt === value} className={f.assetOrDebt === value ? 'on' : ''} onClick={() => setF({ ...f, assetOrDebt: value })}>{label}</button>)}</div>
      <label>유형<select value={f.itemType} onChange={e => setF({ ...f, itemType: e.target.value })}>{Object.entries(itemLabels).map(([key, text]) => <option value={key} key={key}>{text}</option>)}</select></label>
      <Field label="기관명" value={f.institution ?? ''} required={false} change={institution => setF({ ...f, institution })} />
      {f.amountStatus === 'CONFIRMED' && <Field label="금액 (원)" type="number" value={f.amount?.toString() ?? ''} change={amount => setF({ ...f, amount: amount === '' ? null : Number(amount) })} />}
      <Check checked={f.amountStatus === 'NEEDS_CONFIRMATION'} change={unknown => setF({ ...f, amountStatus: unknown ? 'NEEDS_CONFIRMATION' : 'CONFIRMED' })}>정확한 금액을 모르겠어요 (미확인으로 저장)</Check>
      <p className="muted">미확인 항목은 먼저 확인할 것에 표시됩니다.</p>
      <Field label="기준일" type="date" required={false} value={f.referenceDate ?? ''} change={referenceDate => setF({ ...f, referenceDate })} />
      {showMemo && <label>메모 (선택)<textarea maxLength={500} value={f.memo ?? ''} onChange={e => setF({ ...f, memo: e.target.value })} /></label>}
      {error && <Error>{error}</Error>}
      <div className="actions sheet-actions"><button className="secondary" type="button" onClick={cancel}>취소</button><button className="primary">{busy ? '저장 중…' : '저장'}</button></div>
    </fieldset>
  </form>;
}
