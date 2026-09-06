import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, jsonBody } from './shared/api/client';
import type { CaseInfo, Heir } from './shared/types';
import { Banner, Check, Choice, Error, Field, Public, Title } from './shared/ui';

export default function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(1), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [f, setF] = useState({ deceasedDisplayName: '', deathDate: '', awarenessDate: '', awarenessDateCertain: false, relationship: '', inquiryStatus: 'BEFORE', minorHeirExists: false, willExists: false, completedProcedures: '', heirCandidates: [] as Heir[] });
  return <Public>
    <div className="row onboarding-header"><button className="link" onClick={() => step > 1 ? setStep(step - 1) : nav('/login')}>←</button><h2>상속 상황 확인</h2><span>{step} / 5</span></div>
    <div className="progress" role="progressbar" aria-label="상속 정보 입력" aria-valuenow={step} aria-valuemin={1} aria-valuemax={5}><span style={{ width: `${step * 20}%` }} /></div>
    <form className="stack onboarding-form" onSubmit={async e => {
      e.preventDefault(); setError('');
      if (step === 2 && !f.relationship) { setError('고인과의 관계를 선택해 주세요.'); return; }
      if (step < 5) { setStep(step + 1); return; }
      setBusy(true);
      try { const c = await apiRequest<CaseInfo>('cases', { method: 'POST', ...jsonBody({ ...f, deathDate: f.deathDate || null, awarenessDate: f.awarenessDate || null, minorHeirExists: f.minorHeirExists || f.heirCandidates.some(h => h.minor) }) }); localStorage.setItem('caseId', String(c.id)); nav(`/cases/${c.id}/${f.inquiryStatus === 'RESULT_AVAILABLE' ? 'documents/upload' : 'financial-items'}`); }
      catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    }}>
      {step === 1 && <><Title k="STEP 1 · 기본 정보" t="고인이 돌아가신 날짜를 알려주세요" /><Field label="고인의 표시명" value={f.deceasedDisplayName} change={deceasedDisplayName => setF({ ...f, deceasedDisplayName })} /><Field label="사망일 (모르면 비워두세요)" type="date" required={false} value={f.deathDate} change={deathDate => setF({ ...f, deathDate })} /><Banner>기한은 입력한 날짜와 고정 규칙으로 계산합니다. 날짜가 확정되지 않으면 ‘확인 필요’로 표시됩니다.</Banner></>}
      {step === 2 && <><Title k="STEP 2 · 관계" t="고인과 어떤 관계인가요?" />{['배우자', '자녀', '부모', '형제자매', '기타'].map(x => <Choice key={x} on={f.relationship === x} click={() => setF({ ...f, relationship: x })}>{x}</Choice>)}<Banner>입력한 관계만으로 법정상속인 여부를 확정하지 않습니다.</Banner></>}
      {step === 3 && <><Title k="STEP 3 · 공동상속인 후보" t="함께 확인할 가족이 있나요?" /><Banner>현재 알고 있는 후보만 입력하세요. 확정된 상속인 명단은 아닙니다.</Banner>{f.heirCandidates.map((h, i) => <article className="card stack" key={i}><Field label={`후보 ${i + 1} 표시명`} value={h.displayName} change={displayName => setF({ ...f, heirCandidates: f.heirCandidates.map((v, n) => n === i ? { ...v, displayName } : v) })} /><Field label="고인과의 관계" value={h.relationship} change={relationship => setF({ ...f, heirCandidates: f.heirCandidates.map((v, n) => n === i ? { ...v, relationship } : v) })} /><Check checked={h.minor} change={minor => setF({ ...f, heirCandidates: f.heirCandidates.map((v, n) => n === i ? { ...v, minor } : v) })}>미성년자입니다</Check><button className="danger" type="button" onClick={() => setF({ ...f, heirCandidates: f.heirCandidates.filter((_, n) => n !== i) })}>후보 삭제</button></article>)}<button className="secondary" type="button" onClick={() => setF({ ...f, heirCandidates: [...f.heirCandidates, { displayName: '', relationship: '', minor: false }] })}>＋ 후보 추가</button></>}
      {step === 4 && <><Title k="STEP 4 · 조건부 정보" t="절차에 영향을 줄 정보를 확인해 주세요" /><Field label="상속개시 사실을 알게 된 날" required={f.awarenessDateCertain} type="date" value={f.awarenessDate} change={awarenessDate => setF({ ...f, awarenessDate })} /><Check checked={f.awarenessDateCertain} change={awarenessDateCertain => setF({ ...f, awarenessDateCertain })}>이 날짜가 확실해요</Check><Check checked={f.minorHeirExists} change={minorHeirExists => setF({ ...f, minorHeirExists })}>미성년 상속인 후보가 있어요</Check><Check checked={f.willExists} change={willExists => setF({ ...f, willExists })}>유언이 있어요</Check><Field label="이미 완료한 절차 (선택)" required={false} value={f.completedProcedures} change={completedProcedures => setF({ ...f, completedProcedures })} /></>}
      {step === 5 && <><Title k="STEP 5 · 재산·채무 파악" t="현재 자료 확인 상태는 어떤가요?" />{[['BEFORE', '안심상속 조회 전'], ['IN_PROGRESS', '조회 진행 중'], ['RESULT_AVAILABLE', '조회 결과 보유'], ['PARTIAL', '일부 정보만 알고 있음']].map(([value, label]) => <Choice key={value} on={f.inquiryStatus === value} click={() => setF({ ...f, inquiryStatus: value })}>{label}</Choice>)}</>}
      {error && <Error>{error}</Error>}<button className="primary bottom" disabled={busy}>{busy ? '저장 중…' : step === 5 ? '저장하고 계속' : '다음'}</button>
    </form>
  </Public>;
}
