import { deadline, maskSensitiveText } from './shared/format';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, jsonBody } from './shared/api/client';
import type { FinancialItem, Step } from './shared/types';
import { Banner, Error, Field, Loading, Section, Status } from './shared/ui';
import { Sheet } from './shared/ui/Sheet';

export default function Task() {
  const { taskId, caseId } = useParams(), nav = useNavigate(), qc = useQueryClient();
  const [open, setOpen] = useState(false), [saved, setSaved] = useState(false), [completed, setCompleted] = useState(false);
  const q = useQuery({ queryKey: ['task', taskId], queryFn: () => apiRequest<Step>(`tasks/${taskId}`) });
  const items = useQuery({ queryKey: ['items', caseId], queryFn: () => apiRequest<FinancialItem[]>(`cases/${caseId}/financial-items`) });
  if (q.isError) return <Error>{q.error.message}<button className="link" onClick={() => q.refetch()}>다시 시도</button></Error>;
  if (!q.data) return <Loading />;
  const s = q.data;
  return <>
    <article className="card task-summary"><div className="badges"><Status v={s.status} /><span className="status needs_confirmation">{deadline(s)}</span>{s.expertRecommended && <span className="status">전문가 확인 권장</span>}</div><h2>{s.title}</h2><p className="muted">{s.purpose}</p></article>
    {saved && <Banner>처리 결과를 저장했습니다. 변경된 결과를 기준으로 다음 단계를 확인해 주세요.</Banner>}
    <Section className="detail-card" t="처리 순서"><p>{s.instructions}</p></Section>
    <Section className="detail-card" t="필요 서류"><p>{s.requiredDocuments}</p></Section>
    <Section className="detail-card" t="처리 기관"><p>{s.institution}</p></Section>
    <Section t="주의사항"><Banner>{s.cautions}</Banner>{s.expertRecommended && <p className="expert">중요한 결정은 전문가 확인을 권합니다.</p>}{s.officialUrl && /^https?:\/\//.test(s.officialUrl) && <a className="secondary official-link" href={s.officialUrl} target="_blank" rel="noreferrer">공식 안내 열기 ↗</a>}</Section>
    {s.progressStatus && <Section t="저장된 처리 결과"><article className="card"><p>{progressLabels[s.progressStatus] || s.progressStatus}</p><p>{s.resultDate || '처리일 미입력'}</p>{s.memo && <p>{maskSensitiveText(s.memo)}</p>}</article></Section>}
    <div className="page-footer"><button className="primary" onClick={() => setOpen(true)}>{s.progressStatus ? '처리 결과 수정' : '처리 결과 입력하기'}</button></div>
    {open && <ResultForm step={s} needsReview={s.stepKey === 'VERIFY_INFORMATION' && (!items.data || items.data.some(x => x.amountStatus === 'NEEDS_CONFIRMATION'))} close={() => setOpen(false)} saved={async status => { setOpen(false); setSaved(true); setCompleted(status === 'COMPLETED' || status === 'NOT_APPLICABLE'); await qc.invalidateQueries(); }} />}
    {completed && <Sheet title="이 단계를 완료했어요" close={() => setCompleted(false)}>
      <p>다음 단계가 활성화됐습니다. 다음 단계의 기한은 완료 시점이 아니라 고정 기산 규칙으로 다시 계산됩니다.</p>
      <Banner>법률·세무 결론은 확정하지 않습니다. 중요한 판단은 공식 안내나 전문가로 확인해 주세요.</Banner>
      <div className="actions"><button className="secondary" onClick={() => setCompleted(false)}>이 화면에 머물기</button><button className="primary" onClick={() => nav(`/cases/${caseId}/dashboard`)}>다음 단계 보기</button></div>
    </Sheet>}
  </>;
}
const progressLabels: Record<string, string> = { CHECKING: '확인 중', BEFORE_APPLICATION: '신청 전', IN_PROGRESS: '진행 중', COMPLETED: '처리 완료', NOT_APPLICABLE: '해당 없음' };
function ResultForm({ step, close, saved, needsReview }: { step: Step; close: () => void; saved: (status: string) => Promise<void>; needsReview: boolean }) {
  const [status, setStatus] = useState(needsReview ? 'CHECKING' : step.progressStatus || 'CHECKING');
  const [date, setDate] = useState(step.resultDate || '');
  const [memo, setMemo] = useState(step.memo || '');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const application = step.stepKey === 'FINANCIAL_PROCEDURES';
  const options = application ? ['BEFORE_APPLICATION', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE'] : ['CHECKING', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE'];
  return <Sheet title={application ? '신청 결과를 알려주세요' : '확인 결과를 알려주세요'} close={close} busy={busy}>
    <form className="stack" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await apiRequest(`tasks/${step.id}/result`, { method: 'PATCH', ...jsonBody({ progressStatus: status, resultDate: date || null, resultText: progressLabels[status], memo }) }); await saved(status); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>
      <p className="muted">{step.title} · {step.sequenceNo}단계</p>
      {needsReview && <Banner>재산·채무의 미확인 금액을 먼저 확인해 주세요. 확인이 끝나기 전에는 확인 중 또는 진행 중으로 저장할 수 있습니다.</Banner>}
      <fieldset className="stack form-fields" disabled={busy}><legend className="sr-only">진행 상태</legend>{options.map(value => <label className={`result-choice ${status === value ? 'selected' : ''}`} key={value}><input type="radio" disabled={needsReview && ['COMPLETED', 'NOT_APPLICABLE'].includes(value)} name="progress" value={value} checked={status === value} onChange={() => setStatus(value)} />{progressLabels[value]}</label>)}</fieldset>
      <Field label="처리일" type="date" required={status === 'COMPLETED'} value={date} change={setDate} />
      <label>메모 (선택)<textarea maxLength={1000} value={memo} onChange={e => setMemo(e.target.value)} /></label>
      <Banner>‘처리 완료’ 또는 ‘해당 없음’을 저장해야 단계가 완료됩니다. 이미 완료한 단계도 진행 중으로 변경할 수 있습니다.</Banner>
      {error && <Error>{error}</Error>}
      <div className="actions sheet-actions"><button type="button" className="secondary" disabled={busy} onClick={close}>취소</button><button className="primary" disabled={busy}>{busy ? '저장 중…' : '결과 저장'}</button></div>
    </form>
  </Sheet>;
}
