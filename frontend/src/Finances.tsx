import { itemLabels } from './shared/format';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, jsonBody } from './shared/api/client';
import type { FinancialItem } from './shared/types';
import { Banner, Empty, Error, Loading, Page, Status } from './shared/ui';
import { Sheet } from './shared/ui/Sheet';
import { FinancialForm } from './shared/ui/FinancialForm';

export default function Finances() {
  const { caseId } = useParams(), nav = useNavigate(), qc = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [editing, setEditing] = useState<FinancialItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<FinancialItem | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [changed, setChanged] = useState(false);
  const q = useQuery({ queryKey: ['items', caseId], queryFn: () => apiRequest<FinancialItem[]>(`cases/${caseId}/financial-items`) });
  const items = q.data ?? [];
  const matches = (x: FinancialItem, key: string) => key === 'ALL' || (key === 'UNKNOWN' ? x.amountStatus === 'NEEDS_CONFIRMATION' : key === 'OUTSIDE' ? x.itemType === 'REAL_ESTATE' : x.assetOrDebt === key);
  async function refresh() { setChanged(true); await qc.invalidateQueries(); }
  return <>
    <Page k="내 상속 정보" t="재산·채무 현황" d="확인된 금액과 아직 확인할 항목을 구분해 보세요." />
    <button className="primary" onClick={() => setEditing('new')}>＋ 재산·채무 추가</button>
    <div className="chips filters" aria-label="재산·채무 필터">{[['ALL', '전체'], ['ASSET', '재산'], ['DEBT', '채무'], ['UNKNOWN', '미확인'], ['OUTSIDE', '범위 밖']].map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label} {items.filter(x => matches(x, key)).length}</button>)}</div>
    {changed && <Banner>저장된 정보를 로드맵에도 반영해 주세요.<button className="link" onClick={() => nav(`/cases/${caseId}/dashboard`)}>로드맵으로 이동 →</button></Banner>}
    {items.some(x => x.amountStatus === 'NEEDS_CONFIRMATION') && <Banner>금액 미확인 {items.filter(x => x.amountStatus === 'NEEDS_CONFIRMATION').length}건 · 정확한 금액을 확인한 뒤 수정해 주세요.</Banner>}
    {q.isPending && <Loading />}{q.isError && <Error>{q.error.message}<button className="link" onClick={() => q.refetch()}>다시 시도</button></Error>}
    {!q.isPending && !q.isError && !items.filter(x => matches(x, filter)).length && <Empty t="표시할 항목이 없어요" d="필터를 바꾸거나 알고 있는 재산·채무를 추가해 주세요." />}
    {items.filter(x => matches(x, filter)).map(x => <article className="card" key={x.id}>
      <div className="row"><div><span className="status">{x.assetOrDebt === 'ASSET' ? '재산' : '채무'}</span><h2>{x.institution || '기관 미입력'}</h2></div><button className="link" onClick={() => setEditing(x)}>수정</button></div>
      <p className="muted">{itemLabels[x.itemType]} · 기준일 {x.referenceDate || '미표기'}</p>
      <h3>{x.amountStatus === 'CONFIRMED' ? `${Number(x.amount).toLocaleString()}원` : '금액 미확인'}</h3>
      <div className="row"><span className="status">출처: {x.sourceDocumentId ? 'AI 추출' : '직접 입력'}</span><Status v={x.amountStatus} /></div>
      {x.itemType === 'REAL_ESTATE' && <Banner>부동산은 이번 버전에서 상세 절차를 다루지 않습니다. 존재 사실만 기록합니다.</Banner>}
      {x.memo && <p className="muted">{x.memo}</p>}
      <div className="actions"><button className="secondary" onClick={() => nav(`/cases/${caseId}/documents/upload`)}>자료 등록</button><button className="danger" onClick={() => { setError(''); setDeleting(x); }}>삭제</button></div>
    </article>)}
    {editing && <Sheet title={editing === 'new' ? '항목 추가' : '항목 수정'} close={() => setEditing(null)}><FinancialForm initial={editing === 'new' ? undefined : editing} cancel={() => setEditing(null)} save={async data => { await apiRequest(editing === 'new' ? `cases/${caseId}/financial-items` : `financial-items/${editing.id}`, { method: editing === 'new' ? 'POST' : 'PATCH', ...jsonBody(data) }); setEditing(null); await refresh(); }} /></Sheet>}
    {deleting && <Sheet title="이 항목을 삭제할까요?" busy={busy} close={() => setDeleting(null)}><p>{deleting.institution || '선택한 항목'}이 목록에서 삭제되며 로드맵에 영향을 줄 수 있습니다.</p>{error && <Error>{error}</Error>}<div className="actions"><button className="secondary" disabled={busy} onClick={() => setDeleting(null)}>취소</button><button className="primary" disabled={busy} onClick={async () => { setBusy(true); try { await apiRequest(`financial-items/${deleting.id}`, { method: 'DELETE' }); setDeleting(null); await refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>삭제</button></div></Sheet>}
  </>;
}
