import { deadline, itemLabels, maskSensitiveText } from './shared/format';
import Onboarding from './Onboarding';
import Task from './Task';
import Finances from './Finances';
import { Sheet } from './shared/ui/Sheet';
import { Public, Page, Field, Check, Section, Status, Warning, Metric, Banner, Disclaimer, Error, Loading, Empty, Fact } from './shared/ui';
import { FinancialForm } from './shared/ui/FinancialForm';
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ApiError, apiBlob, apiRequest, jsonBody } from "./shared/api/client";
import type {
  CaseInfo,
  ChatReply,
  DocumentItem,
  FinancialItem,
  RoadmapChanges,
  Step,
} from "./shared/types";

const caseId = () => localStorage.getItem("caseId");
// 챗봇이 화면을 이동하기 전에 확인해야 하는 미저장 상태. 폼 화면이 켜고 끈다.
const unsavedForm = { dirty: false };
const MAIN_MENU = [
  { label: "메인", target: "DASHBOARD" },
  { label: "상속자료 추가", target: "DOCUMENT_UPLOAD" },
  { label: "재산·채무", target: "FINANCIAL_ITEM_LIST" },
  { label: "내 상속 정보", target: "CASE_INFO" },
  { label: "전체 주의사항", target: "WARNING_LIST" },
];
const destination = (target: string, id?: number) => {
  const r = `/cases/${caseId()}`;
  return (
    {
      DASHBOARD: `${r}/dashboard`,
      CASE_INFO: `${r}/info`,
      CASE_EDIT: `${r}/edit`,
      DOCUMENT_UPLOAD: `${r}/documents/upload`,
      DOCUMENT_LIST: `${r}/documents`,
      FINANCIAL_ITEM_ADD: `${r}/financial-items`,
      FINANCIAL_ITEM_LIST: `${r}/financial-items`,
      ROADMAP: `${r}/roadmap`,
      TASK_DETAIL: id ? `${r}/tasks/${id}` : `${r}/roadmap`,
      WARNING_LIST: `${r}/warnings`,
    }[target] || `${r}/dashboard`
  );
};

export default function App() {
  const [expired, setExpired] = useState(false);
  const nav = useNavigate(), qc = useQueryClient();
  useEffect(() => { const listener = () => setExpired(true); window.addEventListener('session-expired', listener); return () => window.removeEventListener('session-expired', listener); }, []);
  const logged = Boolean(localStorage.getItem("accessToken"));
  const home = logged
    ? caseId()
      ? `/cases/${caseId()}/dashboard`
      : "/onboarding"
    : "/login";
  return (
    <><Routes>
      <Route path="/" element={<Splash home={home} />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/signup" element={<Auth signup />} />
      <Route
        path="/onboarding"
        element={
          <Guard>
            <Onboarding />
          </Guard>
        }
      />
      <Route
        path="/cases/:caseId/dashboard"
        element={
          <Guard>
            <Shell>
              <Dashboard />
            </Shell>
          </Guard>
        }
      />
      <Route
        path="/cases/:caseId/data/new"
        element={
          <Guard>
            <Shell>
              <AddData />
            </Shell>
          </Guard>
        }
      />
      <Route
        path="/cases/:caseId/documents/upload"
        element={
          <Guard>
            <Shell>
              <Upload />
            </Shell>
          </Guard>
        }
      />
      <Route
        path="/cases/:caseId/documents"
        element={
          <Guard>
            <Shell>
              <Documents />
            </Shell>
          </Guard>
        }
      />
      <Route
        path="/cases/:caseId/financial-items"
        element={
          <Guard>
            <Shell>
              <Finances />
            </Shell>
          </Guard>
        }
      />
      <Route
        path="/cases/:caseId/roadmap"
        element={
          <Guard>
            <Shell>
              <Roadmap />
            </Shell>
          </Guard>
        }
      />
      <Route
        path="/cases/:caseId/tasks/:taskId"
        element={
          <Guard>
            <Shell>
              <Task />
            </Shell>
          </Guard>
        }
      />
      <Route
        path="/cases/:caseId/info"
        element={
          <Guard>
            <Shell>
              <Info />
            </Shell>
          </Guard>
        }
      />
      <Route
        path="/cases/:caseId/edit"
        element={
          <Guard>
            <Shell>
              <Edit />
            </Shell>
          </Guard>
        }
      />
      <Route
        path="/cases/:caseId/warnings"
        element={
          <Guard>
            <Shell>
              <Warnings />
            </Shell>
          </Guard>
        }
      />
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>{expired && <Sheet title="로그인이 만료되었어요" close={() => { setExpired(false); qc.clear(); nav('/login'); }}><p>정보를 안전하게 확인하려면 다시 로그인해 주세요.</p><button className="primary" onClick={() => { setExpired(false); qc.clear(); nav('/login'); }}>다시 로그인</button></Sheet>}</>
  );
}
function Splash({ home }: { home: string }) {
  const nav = useNavigate();
  return <Public variant="splash">
    <div className="splash-brand">
      <img src={`${import.meta.env.BASE_URL}assets/compass.svg`} alt="" />
      <p>상속 나침반</p>
      <h1>흩어진 상속 금융정보를<br />하나의 실행 가능한 로드맵으로</h1>
      <p className="sub">지금 필요한 절차부터 차근차근 안내해 드릴게요.</p>
    </div>
    <button className="primary splash-start" onClick={() => nav(home)}>시작하기</button>
  </Public>;
}
function Guard({ children }: { children: ReactNode }) {
  return localStorage.getItem("accessToken") ? (
    children
  ) : (
    <Navigate to="/login" />
  );
}

function Auth({ signup = false }: { signup?: boolean }) {
  const nav = useNavigate(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [username, setUsername] = useState(signup ? "" : "demo"),
    [password, setPassword] = useState(signup ? "" : "demo1234");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    if (signup && f.get('password') !== f.get('passwordConfirm')) {
      setError('비밀번호가 일치하지 않습니다.'); setBusy(false); return;
    }
    try {
      const r = await apiRequest<{
        accessToken: string;
        activeCaseId?: number;
      }>(`auth/${signup ? "signup" : "login"}`, {
        method: "POST",
        ...jsonBody({
          username: f.get("username"),
          password: f.get("password"),
        }),
      });
      localStorage.setItem("accessToken", r.accessToken);
      if (r.activeCaseId)
        localStorage.setItem("caseId", String(r.activeCaseId));
      else localStorage.removeItem('caseId');
      nav(
        r.activeCaseId ? `/cases/${r.activeCaseId}/dashboard` : "/onboarding",
      );
    } catch (x) {
      setError((x as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Public variant={signup ? 'signup' : 'login'}>
      {signup ? <header className="screen-header"><button className="back" aria-label="로그인으로 돌아가기" onClick={() => nav('/login')}>←</button><h1>회원가입</h1></header> : <div className="auth-intro"><div className="mark"><img src={`${import.meta.env.BASE_URL}assets/compass.svg`} alt="상속 나침반" /></div>
      <h1>
        상속, 무엇부터 할지
        <br />
        알려드립니다
      </h1>
      <p className="sub">
        AI가 필요한 절차만 골라 순서대로 안내합니다
      </p></div>}
      <form className="stack auth" onSubmit={submit}>
        <Field
          label="아이디"
          name="username"
          placeholder="아이디를 입력해 주세요"
          value={username}
          change={setUsername}
        />
        <Field
          label="비밀번호"
          name="password"
          placeholder="비밀번호를 입력해 주세요"
          type="password"
          value={password}
          change={setPassword}
        />
        {signup && <Field label="비밀번호 확인" name="passwordConfirm" type="password" />}
        {error && <Error>{error}</Error>}
        <button className="primary" disabled={busy}>
          {busy ? "처리 중..." : signup ? "회원가입" : "로그인"}
        </button>
      </form>
      <button
        className="link"
        onClick={() => nav(signup ? "/login" : "/signup")}
      >
        {signup ? "로그인으로" : "처음 이용하시나요? 회원가입"}
      </button>
      {!signup && <p className="disclaimer auth-legal">본 서비스는 문서 정보 정리와<br />절차 안내를 제공하며, 상속포기·한정승인 등<br />법률·세무 결론을 확정하지 않습니다.</p>}
    </Public>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const p = useParams(),
    nav = useNavigate();
  const { pathname } = useLocation();
  const screen = pathname.includes('/tasks/') ? 'task' : pathname.endsWith('/documents/upload') ? 'upload' : pathname.split('/').at(-1) || 'dashboard';
  const titles: Record<string, string> = { 'financial-items': '재산·채무 현황', documents: '분석 결과 확인', new: '상속자료 추가', upload: '문서 업로드', roadmap: '내 로드맵', task: '절차 상세', info: '내 상속 정보', edit: '상속 정보 수정', warnings: '전체 주의사항' };
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className={`app app--${screen}`}>
      <header className="screen-header">
        {screen === 'dashboard' ? <>
        <button
          className="logo"
          onClick={() => nav(`/cases/${p.caseId}/dashboard`)}
        >
          <img src={`${import.meta.env.BASE_URL}assets/compass.svg`} alt="" />상속 나침반
        </button>
        <nav>
          <button onClick={() => nav(`/cases/${p.caseId}/data/new`)}>
            상속자료 추가
          </button>
          <button onClick={() => nav(`/cases/${p.caseId}/info`)}>
            내 정보
          </button>
        </nav>
        </> : <><button className="back" aria-label="메인으로 돌아가기" onClick={() => { if (!unsavedForm.dirty || confirm('저장하지 않은 변경이 있습니다. 이동할까요?')) nav(`/cases/${p.caseId}/dashboard`); }}>←</button><h1>{titles[screen]}</h1>{screen === 'info' && <button className="link header-action" onClick={() => nav(`/cases/${p.caseId}/edit`)}>수정</button>}{screen === 'roadmap' && <RoadmapCount />}</>}
      </header>
      <main>
        {children}
        <Disclaimer />
      </main>
      {!['task', 'edit', 'documents', 'upload'].includes(screen) && <Chat />}
    </div>
  );
}

// Figma C3 헤더 우측의 진행 표기. 로드맵 화면에서만 쓴다.
function RoadmapCount() {
  const p = useParams();
  const q = useQuery({ queryKey: ['roadmap', p.caseId], queryFn: () => apiRequest<{ steps: Step[] }>(`cases/${p.caseId}/roadmaps/current`), retry: false });
  const steps = q.data?.steps;
  if (!steps?.length) return null;
  const current = steps.findIndex(s => s.status === 'CURRENT' || s.status === 'RECHECK_REQUIRED');
  return <span className="muted header-action">{current < 0 ? steps.length : current + 1} / {steps.length}</span>;
}

function Dashboard() {
  const p = useParams(),
    nav = useNavigate();
  const [recalculate, setRecalculate] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [changes, setChanges] = useState('');
  const [picked, setPicked] = useState<FinancialItem | null>(null), [editing, setEditing] = useState<FinancialItem | null>(null);
  const qc = useQueryClient();
  const roadRef = useRef<HTMLDivElement>(null);
  const caseQuery = useQuery({ queryKey: ['case', p.caseId], queryFn: () => apiRequest<CaseInfo>(`cases/${p.caseId}`) });
  const items = useQuery({ queryKey: ['items', p.caseId], queryFn: () => apiRequest<FinancialItem[]>(`cases/${p.caseId}/financial-items`) });
  const q = useQuery({
    queryKey: ["dashboard", p.caseId],
    queryFn: () => apiRequest<any>(`cases/${p.caseId}/dashboard`),
    retry: false,
  });
  if (q.isLoading) return <Loading />;
  if (q.isError && !(q.error instanceof ApiError && q.error.status === 404)) return <Error>{q.error.message}<button className="link" onClick={() => q.refetch()}>다시 시도</button></Error>;
  if (q.isError)
    return (
      <Empty
        t="로드맵을 준비해 주세요"
        d="확정 정보를 기준으로 규칙 엔진이 단계와 기한을 계산합니다."
      >
        <button
          className="primary"
          disabled={busy} onClick={async () => {
            setBusy(true); setError('');
            try { await apiRequest(`cases/${p.caseId}/roadmaps`, { method: "POST" }); await qc.invalidateQueries(); }
            catch (e) { setError((e as Error).message); } finally { setBusy(false); }
          }}
        >
          로드맵 생성
        </button>
        {error && <Error>{error}</Error>}
      </Empty>
    );
  const d = q.data;
  return (
    <>
      <p className="case-summary">故 {d.case.deceasedDisplayName} 님의 상속{caseQuery.data?.relationship && ` · ${caseQuery.data.relationship}`} · {d.roadmap.filter((s: Step) => s.status === 'COMPLETED').length} / {d.roadmap.length}단계 완료</p>
      {d.case.roadmapDirty && (
        <Banner>중요 정보 변경으로 로드맵 재계산이 필요해요.<button className="link" onClick={() => setRecalculate(true)}>변경 반영하기 →</button></Banner>
      )}
      {changes && <Banner>{changes}</Banner>}
      {recalculate && <Sheet title="로드맵을 다시 계산할까요?" busy={busy} close={() => setRecalculate(false)}><p>확정한 정보를 반영합니다. 같은 단계의 기존 처리 결과는 유지되며, 바뀐 단계와 기한을 안내합니다.</p>{error && <Error>{error}</Error>}<div className="actions"><button className="secondary" disabled={busy} onClick={() => setRecalculate(false)}>나중에</button><button className="primary" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { const next = await apiRequest<{ version: number; changes: RoadmapChanges }>(`cases/${p.caseId}/roadmaps/recalculate`, { method: 'POST' }); setChanges(describeChanges(next.version, next.changes)); setRecalculate(false); await qc.invalidateQueries(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>{busy ? '계산 중…' : '다시 계산'}</button></div></Sheet>}
        {d.priorityTask?.id ? (
          <article
            className="hero"
          >
            <div className="badges"><span className="status current">지금 해야 할 일</span><span className="status needs_confirmation">{deadline(d.priorityTask)}</span></div>
            <h2>{d.priorityTask.title}</h2>
            <p>{d.priorityTask.purpose}</p>
            <div className="actions"><button className="primary" onClick={() => nav(`/cases/${p.caseId}/tasks/${d.priorityTask.id}`)}>처리 방법 보기</button><button className="secondary" onClick={() => nav(`/cases/${p.caseId}/roadmap`)}>다른 단계 보기</button></div>
          </article>
        ) : (
          <p>필수 단계가 모두 완료되었습니다.</p>
        )}
      <Section className="roadmap-card" t="내 로드맵" action={() => nav(`/cases/${p.caseId}/roadmap`)}>
        <div className="road-carousel"><button className="road-arrow" aria-label="이전 단계 보기" onClick={() => roadRef.current?.scrollBy({left: -(roadRef.current.clientWidth), behavior: 'smooth'})}>‹</button><div className="road" ref={roadRef}>
          {d.roadmap.map((s: Step) => (
            <button
              key={s.id}
              className={`road-node road-node--${s.status.toLowerCase()}`}
              onClick={() => nav(`/cases/${p.caseId}/tasks/${s.id}`)}
            >
              <b aria-label={`${s.sequenceNo}단계 ${s.status === 'COMPLETED' ? '완료' : s.status === 'CURRENT' ? '현재' : '예정'}`}>{s.status === 'COMPLETED' ? '✓' : s.sequenceNo}</b>
              <span>{s.title}</span>
            </button>
          ))}
        </div><button className="road-arrow" aria-label="다음 단계 보기" onClick={() => roadRef.current?.scrollBy({left: roadRef.current.clientWidth, behavior: 'smooth'})}>›</button></div>
        <div className="road-legend"><span>완료</span><span>현재</span><span>예정</span></div>
        <p className="muted">단계는 결과 입력으로만 완료됩니다</p>
      </Section>
      <Section className="checklist-card" t="먼저 확인할 것" action={() => nav(`/cases/${p.caseId}/financial-items`)}>{items.data?.filter(x => x.amountStatus === 'NEEDS_CONFIRMATION').map(x => <button className="checklist-row row" key={x.id} onClick={() => setPicked(x)}><span>{maskSensitiveText(x.institution) || itemLabels[x.itemType]}<small className="muted">금액 확인 필요</small></span><span aria-hidden="true">›</span></button>)}{items.data && !items.data.some(x => x.amountStatus === 'NEEDS_CONFIRMATION') && <p className="muted">미확인 금액이 없습니다.</p>}</Section>
      {picked && <Sheet title={maskSensitiveText(picked.institution) || itemLabels[picked.itemType]} close={() => setPicked(null)}>
        <p className="muted">금액이 확인되지 않은 항목입니다. 어떻게 확인할까요?</p>
        <button className="primary" onClick={() => { setEditing(picked); setPicked(null); }}>금액 직접 입력</button>
        <button className="secondary" onClick={() => nav(`/cases/${p.caseId}/data/new`)}>자료 등록하기</button>
        {d.priorityTask?.id && <button className="secondary" onClick={() => nav(`/cases/${p.caseId}/tasks/${d.priorityTask.id}`)}>관련 단계 보기</button>}
      </Sheet>}
      {editing && <Sheet title="금액 입력" close={() => setEditing(null)}><FinancialForm initial={editing} cancel={() => setEditing(null)} save={async data => { await apiRequest(`financial-items/${editing.id}`, { method: 'PATCH', ...jsonBody(data) }); setEditing(null); await qc.invalidateQueries(); }} /></Sheet>}
      <div className="two">
        <Metric
          n={d.needsConfirmationCount}
          l="확인 필요 항목"
          click={() => nav(`/cases/${p.caseId}/financial-items`)}
        />
        <Metric
          n={d.documentCount}
          l="등록 문서"
          click={() => nav(`/cases/${p.caseId}/documents`)}
        />
      </div>
      <Section
        t="현재 주의사항"
        action={() => nav(`/cases/${p.caseId}/warnings`)}
      >
        {d.warnings.length ? (
          d.warnings.map((w: any) => <Warning key={w.id} w={w} />)
        ) : (
          <p className="muted">현재 주의사항이 없습니다.</p>
        )}
      </Section>
    </>
  );
}

// Figma H1. 업로드/재산/채무 3분기. 직접 추가는 B10 공용 시트를 그대로 쓴다.
function AddData() {
  const p = useParams(), nav = useNavigate(), qc = useQueryClient();
  const [adding, setAdding] = useState<'ASSET' | 'DEBT' | null>(null);
  return (
    <>
      <Page t="무엇을 추가하시겠어요?" d="추가한 정보는 확정한 뒤에만 내 상속 정보에 반영됩니다." />
      {[
        { key: 'DOC', title: '문서 업로드', hint: 'PDF · JPG · PNG', desc: '안심상속 조회 결과, 채무 안내서, 보험증권 등을 올리면 AI가 기관·유형·금액·기준일을 찾아 정리합니다.' },
        { key: 'ASSET', title: '재산 직접 추가', hint: '문서 없이 입력', desc: '예금·보험·현금 등 알고 있는 재산을 직접 입력합니다. 금액을 모르면 미확인으로 저장할 수 있습니다.' },
        { key: 'DEBT', title: '채무 직접 추가', hint: '문서 없이 입력', desc: '대출·카드대금 등 확인한 채무를 직접 입력합니다. 잔액을 모르면 미확인으로 저장할 수 있습니다.' },
      ].map(o => (
        <button className="choice pick" key={o.key} onClick={() => o.key === 'DOC' ? nav(`/cases/${p.caseId}/documents/upload`) : setAdding(o.key as 'ASSET' | 'DEBT')}>
          <span className="pick-icon" aria-hidden="true">＋</span>
          <span className="pick-head"><b>{o.title}</b><small>{o.hint}</small></span>
          <span className="pick-arrow" aria-hidden="true">›</span>
          <span className="pick-desc">{o.desc}</span>
        </button>
      ))}
      <Banner>금액을 모르면 미확인으로 저장할 수 있습니다. 미확인 항목은 ‘먼저 확인할 것’에 표시됩니다.</Banner>
      {adding && <Sheet title={adding === 'ASSET' ? '재산 추가' : '채무 추가'} close={() => setAdding(null)}>
        <FinancialForm
          initial={{ assetOrDebt: adding, itemType: adding === 'ASSET' ? 'DEPOSIT' : 'LOAN', institution: '', amount: null, amountStatus: 'CONFIRMED', referenceDate: '', memo: '' }}
          cancel={() => setAdding(null)}
          save={async data => { await apiRequest(`cases/${p.caseId}/financial-items`, { method: 'POST', ...jsonBody(data) }); setAdding(null); await qc.invalidateQueries(); nav(`/cases/${p.caseId}/financial-items`); }}
        />
      </Sheet>}
    </>
  );
}

function Upload() {
  const [dragging, setDragging] = useState(false);
  const p = useParams(),
    nav = useNavigate(),
    [file, setFile] = useState<File>(),
    [consent, setConsent] = useState(false),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false);
  const docs = useQuery({ queryKey: ['docs', p.caseId], queryFn: () => apiRequest<DocumentItem[]>(`cases/${p.caseId}/documents`) });
  async function run(sample = false) {
    setMsg('');
    setBusy(true);
    try {
      let d: DocumentItem;
      if (sample)
        d = await apiRequest(`cases/${p.caseId}/documents/sample`, {
          method: "POST",
        });
      else {
        if (!file) throw new globalThis.Error("파일을 선택해 주세요.");
        if (!consent) throw new globalThis.Error('AI 분석 동의가 필요합니다.');
        if (file.size > 10 * 1024 * 1024) throw new globalThis.Error('10MB 이하 파일을 선택해 주세요.');
        const f = new FormData();
        f.append("file", file);
        d = await apiRequest(`cases/${p.caseId}/documents?aiConsent=true`, {
          method: "POST",
          body: f,
        });
      }
      await apiRequest(`documents/${d.id}/analyze`, { method: "POST" });
      nav(`/cases/${p.caseId}/documents`);
    } catch (x) {
      setMsg((x as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <label className={`upload ${dragging ? 'upload--dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!busy && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}>
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files?.[0])}
        />
        <span className="upload-symbol" aria-hidden="true" />
        <strong>{file?.name || "파일 선택 또는 여기에 끌어다 놓기"}</strong>
        <span>PDF · JPG · PNG · 최대 10MB</span>
      </label>
      <Check checked={consent} change={setConsent}>
        AI 분석을 위해 마스킹된 정보를 전송하는 데 동의합니다.
      </Check>
      {msg && <Error>{msg}</Error>}
      <button className="primary" disabled={busy || !file || !consent} onClick={() => run()}>
        {busy ? "업로드·분석 중..." : "업로드하고 분석"}
      </button>
      <button className="secondary" disabled={busy} onClick={() => run(true)}>
        가상 샘플 문서로 체험
      </button>
      {Boolean(docs.data?.length) && <Section t="등록된 파일" action={() => nav(`/cases/${p.caseId}/documents`)}>
        {docs.data?.map(d => <div className="row document-row" key={d.id}><span>{d.name}<small className="muted">{new Date(d.uploadedAt).toLocaleDateString()}</small></span><Status v={d.status} /></div>)}
      </Section>}
    </>
  );
}

function Documents() {
  const p = useParams(),
    nav = useNavigate(),
    qc = useQueryClient();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function action(run: () => Promise<unknown>) { setError(''); setBusy(true); try { await run(); await qc.invalidateQueries(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  const q = useQuery({
    queryKey: ["docs", p.caseId],
    queryFn: () => apiRequest<DocumentItem[]>(`cases/${p.caseId}/documents`),
  });
  return (
    <>
      <h2 className="review-title">AI가 찾은 내용을 확인해 주세요</h2>
      <Banner>AI가 문서에서 추출한 초안입니다. 확정하기 전에 반드시 금액과 기관을 확인해 주세요. 확정한 항목만 저장됩니다.</Banner>
      {q.isPending && <Loading />}{q.isError && <Error>{q.error.message}<button className="link" onClick={() => q.refetch()}>다시 시도</button></Error>}{error && <Error>{error}</Error>}
      {q.data?.length === 0 && <Empty t="등록된 문서가 없어요" d="문서를 올리면 AI 분석 결과를 검토할 수 있습니다." />}
      {q.data?.map((d) => (
        <article className={d.status === 'NEEDS_REVIEW' ? 'document-review' : 'card'} key={d.id}>
          <div className="row">
            <b>{d.name}</b>
            <Status v={d.status} />
          </div>
          <p className="muted">{new Date(d.uploadedAt).toLocaleDateString()}</p>
          {d.analysis?.warnings.map((x) => (
            <Banner key={x}>{x}</Banner>
          ))}
          {d.status === "NEEDS_REVIEW" && d.analysis ? (
            <ReviewEditor document={d} saved={() => qc.invalidateQueries()} />
          ) : d.analysis?.items.map((x, i) => (
            <div className="extract" key={i}>
              <span>
                {x.assetOrDebt === "ASSET" ? "재산" : "채무"} · {itemLabels[x.category] || x.category}
              </span>
              <b>{maskSensitiveText(x.institution)}</b>
              <strong>
                {x.amount != null
                  ? Number(x.amount).toLocaleString() + "원"
                  : "금액 확인 필요"}
              </strong>
              <small>
                신뢰도 {Math.round((x.confidence || 0) * 100)}% ·{" "}
                {maskSensitiveText(x.evidenceText)}
              </small>
            </div>
          ))}
          {d.status === "FAILED" && (
            <button
              className="secondary"
              disabled={busy} onClick={() => action(async () => {
                await apiRequest(`documents/${d.id}/analyze`, {
                  method: "POST",
                });
                q.refetch();
              })}
            >
              분석 재시도
            </button>
          )}
          <div className="item-actions">
            <button className="link" disabled={busy} onClick={() => action(async () => {
              const url = URL.createObjectURL(await apiBlob(`documents/${d.id}/file`));
              const link = document.createElement('a'); link.href = url; link.download = d.name; link.click();
              setTimeout(() => URL.revokeObjectURL(url), 60000);
            })}>원본 내려받기</button>
            <button className="danger" disabled={busy} onClick={() => action(async () => {
              if (!window.confirm(`${d.name} 원본을 삭제할까요? 확정한 재산·채무 항목은 그대로 남고 출처 표시만 사라집니다.`)) return;
              await apiRequest(`documents/${d.id}`, { method: "DELETE" });
              qc.invalidateQueries({ queryKey: ["docs", p.caseId] });
            })}>원본 삭제</button>
          </div>
        </article>
      ))}
      <button
        className="secondary"
        onClick={() => nav(`/cases/${p.caseId}/documents/upload`)}
      >
        문서 추가
      </button>
    </>
  );
}

function ReviewEditor({ document, saved }: { document: DocumentItem; saved: () => void }) {
  const [analysis, setAnalysis] = useState(document.analysis!);
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const matches = (x: typeof analysis.items[number], key: string) => key === 'ALL' || (key === 'UNKNOWN' ? x.amountStatus === 'NEEDS_CONFIRMATION' : x.assetOrDebt === key);
  useEffect(() => { unsavedForm.dirty = JSON.stringify(analysis) !== JSON.stringify(document.analysis); return () => { unsavedForm.dirty = false; }; }, [analysis, document.analysis]);
  async function confirm() {
    setBusy(true); setError('');
    try { await apiRequest(`documents/${document.id}/confirm`, { method: "PATCH", ...jsonBody(analysis) }); saved(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="review"><div className="chips filters" aria-label="추출 항목 필터">{[['ALL','전체'],['ASSET','재산'],['DEBT','채무'],['UNKNOWN','미확인']].map(([key,label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label} {analysis.items.filter(x => matches(x,key)).length}</button>)}</div>{analysis.items.map((x, i) => matches(x,filter) && <Fragment key={i}>
    {analysis.items.findIndex(y => matches(y,filter) && y.assetOrDebt === x.assetOrDebt) === i && <h3 className="extract-group">{x.assetOrDebt === 'ASSET' ? '재산' : '채무'}</h3>}
    <div className="extract">
    <div className="row"><div className="badges"><span className="status">{itemLabels[x.category] || x.category}</span><h3>{maskSensitiveText(x.institution) || '기관 미입력'}</h3></div><button className="link" disabled={busy} onClick={() => setEditing(i)}>수정</button></div>
    <div className="row"><small>기준일 {x.referenceDate || '미표기'}</small><strong>{x.amountStatus === 'CONFIRMED' && x.amount != null ? `${x.amount.toLocaleString()}원` : '금액 미확인'}</strong></div>
    {x.amountStatus === 'NEEDS_CONFIRMATION' && <Banner>문서에서 금액을 찾지 못했습니다. 확인 후 입력하거나 미확인으로 저장하세요.</Banner>}
    <details className="extraction-evidence"><summary>추출 근거 · {x.assetOrDebt === 'ASSET' ? '재산' : '채무'}</summary><small>신뢰도 {Math.round((x.confidence || 0) * 100)}% · {maskSensitiveText(x.evidenceText)}</small><button className="danger" disabled={busy} onClick={() => setAnalysis({ ...analysis, items: analysis.items.filter((_, n) => n !== i) })}>이 항목 제외</button></details>
    </div>
  </Fragment>)}{!analysis.items.some(x => matches(x,filter)) && <p className="muted">해당하는 항목이 없습니다.</p>}{error && <Error>{error}</Error>}<p className="review-notice">확정한 항목만 내 상속 정보에 반영됩니다</p><button className="primary" disabled={busy || !analysis.items.length} onClick={confirm}>{busy ? '확정 중…' : `${analysis.items.length}건 모두 확정하기`}</button>
  {editing !== null && <Sheet title="항목 수정" close={() => setEditing(null)}><FinancialForm showMemo={false} initial={{ ...analysis.items[editing], itemType: analysis.items[editing].category, referenceDate: analysis.items[editing].referenceDate ?? undefined }} cancel={() => setEditing(null)} save={async data => { setAnalysis({ ...analysis, items: analysis.items.map((item, i) => i === editing ? { ...item, ...data, category: data.itemType } : item) }); setEditing(null); }} /></Sheet>}
  </div>;
}

// Figma C3. 가로 캐러셀 + 단계 상태 범례 + 세로 목록.
function Roadmap() {
  const p = useParams(),
    nav = useNavigate();
  const roadRef = useRef<HTMLDivElement>(null);
  const q = useQuery({
    queryKey: ["roadmap", p.caseId],
    queryFn: () =>
      apiRequest<{ steps: Step[]; version: number }>(`cases/${p.caseId}/roadmaps/current`),
    retry: false,
  });
  if (q.isPending) return <Loading />;
  if (q.isError)
    return <Error>{q.error.message}<button className="link" onClick={() => nav(`/cases/${p.caseId}/dashboard`)}>메인에서 로드맵 준비하기</button></Error>;
  const steps = q.data?.steps ?? [];
  return (
    <>
      <article className="card road-carousel-card">
        <div className="road-carousel"><button className="road-arrow" aria-label="이전 단계 보기" onClick={() => roadRef.current?.scrollBy({ left: -(roadRef.current.clientWidth), behavior: 'smooth' })}>‹</button><div className="road" ref={roadRef}>
          {steps.map(s => (
            <button key={s.id} className={`road-node road-node--${s.status.toLowerCase()}`} onClick={() => nav(`/cases/${p.caseId}/tasks/${s.id}`)}>
              <b aria-label={`${s.sequenceNo}단계 ${STEP_STATE[s.status] ?? s.status}`} />
              <span>{s.title}</span>
            </button>
          ))}
        </div><button className="road-arrow" aria-label="다음 단계 보기" onClick={() => roadRef.current?.scrollBy({ left: roadRef.current.clientWidth, behavior: 'smooth' })}>›</button></div>
        <div className="road-dots" aria-hidden="true">{steps.map(s => <i key={s.id} className={s.status === 'CURRENT' ? 'on' : ''} />)}</div>
      </article>
      <Section t="단계 상태">
        {[['completed', '완료', '결과를 입력해 완료 조건을 충족한 단계'], ['current', '현재', '지금 처리해야 하는 단계 (1개만 존재)'], ['upcoming', '예정', '선행 단계가 끝나야 열리는 단계']].map(([key, label, desc]) => (
          <div className="road-state" key={key}>
            <i className={`road-dot road-dot--${key}`} aria-hidden="true" />
            <div><b>{label}</b><p>{desc}</p></div>
          </div>
        ))}
      </Section>
      <Banner><b>단계는 직접 클릭만으로 완료되지 않습니다</b>각 단계의 “처리 결과”를 입력해 완료 조건을 충족해야 완료로 바뀌고 다음 단계가 열립니다.</Banner>
      <article className="card road-list">
        {steps.map(s => (
          <button className="row road-row" key={s.id} onClick={() => nav(`/cases/${p.caseId}/tasks/${s.id}`)}>
            <span><b>{s.sequenceNo}  {s.title}</b><small className="muted">{stepCaption(s)}</small></span>
            <span className="badges"><Status v={s.status} /><span className="road-row-arrow" aria-hidden="true">›</span></span>
          </button>
        ))}
      </article>
    </>
  );
}
const STEP_STATE: Record<string, string> = { COMPLETED: '완료', CURRENT: '현재', UPCOMING: '예정', RECHECK_REQUIRED: '재확인 필요' };
// Figma C3의 행 부제. 완료는 처리일, 현재는 기한과 진행 상태, 나머지는 기한 상태를 보여준다.
function stepCaption(s: Step) {
  if (s.status === 'COMPLETED') return s.resultDate ? `완료 ${new Date(s.resultDate).toLocaleDateString('ko-KR')}` : '완료';
  if (s.deadlineStatus === 'NEEDS_CONFIRMATION') return '기산일 확정 후 계산';
  const progress = s.progressStatus ? ` · ${STEP_PROGRESS[s.progressStatus] ?? s.progressStatus}` : '';
  return `${deadline(s)}${progress}`;
}
const STEP_PROGRESS: Record<string, string> = { CHECKING: '확인 중', BEFORE_APPLICATION: '신청 전', IN_PROGRESS: '처리 중', COMPLETED: '처리 완료', NOT_APPLICABLE: '해당 없음' };

function Info() {
  const p = useParams(),
    nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
      queryKey: ["case", p.caseId],
      queryFn: () => apiRequest<CaseInfo>(`cases/${p.caseId}`),
    }),
    iq = useQuery({
      queryKey: ["items", p.caseId],
      queryFn: () =>
        apiRequest<FinancialItem[]>(`cases/${p.caseId}/financial-items`),
    }),
    dq = useQuery({
      queryKey: ["docs", p.caseId],
      queryFn: () => apiRequest<DocumentItem[]>(`cases/${p.caseId}/documents`),
    }),
    c = q.data;
  if (q.isError) return <Error>{q.error.message}<button className="link" onClick={() => q.refetch()}>다시 시도</button></Error>;
  if (!c) return <Loading />;
  const sum = (kind: string) =>
    iq.data
      ?.filter((x) => x.assetOrDebt === kind && x.amountStatus === "CONFIRMED")
      .reduce((a, x) => a + Number(x.amount), 0) || 0;
  return (
    <>
      <article className="card facts">
        <h2>故 {c.deceasedDisplayName} 님의 상속</h2>
        <p className="muted facts-updated">최근 로드맵 반영 {c.roadmapUpdatedAt ? new Date(c.roadmapUpdatedAt).toLocaleDateString() : '아직 없음'}</p>
        <Fact k="사망일" v={c.deathDate || "확인 필요"} />
        <Fact
          k="상속 인지일"
          v={
            c.awarenessDateCertain
              ? c.awarenessDate || "확인 필요"
              : "확인 필요"
          }
        />
        <Fact k="관계" v={c.relationship} />
        <Fact k="자료 파악" v={{BEFORE:'조회 전', IN_PROGRESS:'조회 진행 중', RESULT_AVAILABLE:'조회 결과 보유', PARTIAL:'일부 정보 보유'}[c.inquiryStatus] || c.inquiryStatus} />
        <Fact k="공동상속인 후보" v={c.heirCandidates?.map(h => `${h.displayName} (${h.relationship}${h.minor ? ', 미성년' : ''})`).join(', ') || '입력 없음'} />
        <Fact k="유언" v={c.willExists ? '있음' : '입력 없음'} />
      </article>
      <article className="card">
        <h3>등록 상속자료</h3>
        <p>{dq.data?.length || 0}건</p>
        {dq.data?.map(doc => <div className="row document-row" key={doc.id}><span>{doc.name}</span><Status v={doc.status} /></div>)}
        <button
          className="link"
          onClick={() => nav(`/cases/${p.caseId}/documents`)}
        >
          문서 보기 →
        </button>
      </article>
      <section className="card"><div className="row"><h2>현재 파악된 재산·채무</h2><button className="link" onClick={() => nav(`/cases/${p.caseId}/data/new`)}>＋ 추가</button></div><div className="financial-totals"><Metric n={`${sum('ASSET').toLocaleString()}원`} l="확인된 재산" /><Metric n={`${sum('DEBT').toLocaleString()}원`} l="확인된 채무" /></div></section>
      <button className="secondary" onClick={() => nav(`/cases/${p.caseId}/financial-items`)}>재산·채무 상세 보기</button>
      <button
        className="primary"
        onClick={() => nav(`/cases/${p.caseId}/edit`)}
      >
        상속 정보 수정
      </button>
      <button className="link" onClick={async () => { await apiRequest('auth/logout', { method: 'POST' }).catch(() => undefined); localStorage.removeItem('accessToken'); localStorage.removeItem('caseId'); qc.clear(); nav('/login'); }}>로그아웃</button>
    </>
  );
}

function describeChanges(version: number, c: RoadmapChanges) {
  const lines = [`로드맵 버전 ${version}으로 다시 계산했습니다.`];
  if (c.carriedOver.length) lines.push(`이전 처리 결과 ${c.carriedOver.length}건을 그대로 이어받았습니다.`);
  if (c.added.length) lines.push(`추가된 단계: ${c.added.length}건`);
  if (c.removed.length) lines.push(`빠진 단계: ${c.removed.length}건`);
  for (const d of c.deadlineChanged)
    lines.push(`기한 변경 · ${d.title}: ${d.beforeStatus === "CALCULATED" ? d.before : "확인 필요"} → ${d.afterStatus === "CALCULATED" ? d.after : "확인 필요"}`);
  return lines.join("\n");
}

function Edit() {
  const p = useParams(),
    nav = useNavigate(),
    [error, setError] = useState("");
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false), [impact, setImpact] = useState(false);
  useEffect(() => () => {
    unsavedForm.dirty = false;
  }, []);
  const q = useQuery({
    queryKey: ["case", p.caseId],
    queryFn: () => apiRequest<CaseInfo>(`cases/${p.caseId}`),
  });
  if (q.isError) return <Error>{q.error.message}<button className="link" onClick={() => q.refetch()}>다시 시도</button></Error>;
  if (!q.data) return <Loading />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      body = {
        ...q.data,
        deceasedDisplayName: f.get("name"),
        deathDate: f.get("death") || null,
        awarenessDate: f.get("aware") || null,
        awarenessDateCertain: f.get("certain") === "on",
        relationship: f.get('relationship'),
        minorHeirExists: f.get('minor') === 'on',
        willExists: f.get('will') === 'on',
        completedProcedures: f.get('completed'),
      };
    setBusy(true); setError('');
    try {
      const r = await apiRequest<any>(`cases/${p.caseId}`, {
        method: "PATCH",
        ...jsonBody(body),
      });
      unsavedForm.dirty = false;
      await qc.invalidateQueries();
      if (r.roadmapImpact || body.deathDate !== q.data?.deathDate) setImpact(true);
      else nav(`/cases/${p.caseId}/info`);
    } catch (x) {
      setError((x as Error).message);
    } finally { setBusy(false); }
  }
  return (
    <>
      <form
        className="stack edit-form"
        onSubmit={submit}
        onChange={() => {
          unsavedForm.dirty = true;
        }}
      >
        <div className="edit-tabs"><button type="button" aria-current="page">기본 정보</button><button type="button" onClick={() => { if (!unsavedForm.dirty || confirm('저장하지 않은 변경이 있습니다. 이동할까요?')) nav(`/cases/${p.caseId}/documents`); }}>등록 문서</button><button type="button" onClick={() => { if (!unsavedForm.dirty || confirm('저장하지 않은 변경이 있습니다. 이동할까요?')) nav(`/cases/${p.caseId}/financial-items`); }}>재산·채무</button></div>
        <section className="card stack"><h2>기본 상속 정보</h2>
        <Field
          label="사망자 표시명"
          name="name"
          defaultValue={q.data.deceasedDisplayName}
        />
        <Field
          label="사망일"
          name="death"
          required={false}
          type="date"
          defaultValue={q.data.deathDate}
        />
        <Field label="사망자와의 관계" name="relationship" defaultValue={q.data.relationship} />
        </section>
        <section className="card stack"><h2>공동상속인 구성</h2><p className="muted">{q.data.heirCandidates?.map(h => `${h.displayName} (${h.relationship})`).join(', ') || '입력한 공동상속인 후보가 없습니다.'}</p><label className="check"><input name="minor" type="checkbox" defaultChecked={q.data.minorHeirExists} />미성년 상속인 후보가 있어요</label></section>
        <section className="card stack"><h2>조건부 정보</h2>
        <Field
          label="상속개시 사실을 안 날"
          name="aware"
          required={false}
          type="date"
          defaultValue={q.data.awarenessDate}
        />
        <label className="check">
          <input
            name="certain"
            type="checkbox"
            defaultChecked={q.data.awarenessDateCertain}
          />{" "}
          날짜가 확실해요
        </label>
        <label className="check"><input name="will" type="checkbox" defaultChecked={q.data.willExists} />유언이 있어요</label>
        <Field label="이미 완료한 절차 (선택)" name="completed" required={false} defaultValue={q.data.completedProcedures} />
        </section>
        {error && <Error>{error}</Error>}
        <div className="page-footer actions"><button className="secondary" type="button" disabled={busy} onClick={() => { if (!unsavedForm.dirty || confirm('저장하지 않은 변경을 취소할까요?')) nav(`/cases/${p.caseId}/info`); }}>취소</button><button className="primary" disabled={busy}>{busy ? '저장 중…' : '변경 저장'}</button></div>
      </form>
      {impact && <Sheet title="상속 정보를 저장했어요" close={() => nav(`/cases/${p.caseId}/info`)}><p>기준 날짜와 조건의 변경은 단계·기한에 영향을 줄 수 있습니다. 로드맵에서 변경 내용을 반영해 주세요.</p><div className="actions"><button className="secondary" onClick={() => nav(`/cases/${p.caseId}/info`)}>나중에</button><button className="primary" onClick={() => nav(`/cases/${p.caseId}/dashboard`)}>로드맵 확인</button></div></Sheet>}
    </>
  );
}

// Figma E1의 3개 그룹. 서버 category를 그룹으로 접는다.
const WARNING_GROUPS = [
  { key: 'NOW', title: '지금 확인', categories: ['CHECK_NOW', 'DEADLINE_RISK', 'MISSING_INFO'] },
  { key: 'CURRENT', title: '현재 단계', categories: ['CURRENT_STEP'] },
  { key: 'LATER', title: '이후 단계', categories: ['LATER_STEP'] },
];
const RISK = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const inGroup = (w: any, key: string) => key === 'ALL' || (WARNING_GROUPS.find(g => g.key === key)?.categories.includes(w.category) ?? false);

function Warnings() {
  const p = useParams(),
    nav = useNavigate();
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState<any>(null);
  const q = useQuery({
    queryKey: ["warnings", p.caseId],
    queryFn: () => apiRequest<any[]>(`cases/${p.caseId}/warnings`),
  });
  const [sort, setSort] = useState('DEADLINE');
  // 서버는 위험도 → 기한 순으로 준다. 기한 우선 정렬만 화면에서 다시 계산한다.
  const list = [...(q.data ?? [])].sort((a, b) =>
    sort === 'DEADLINE'
      ? (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31') || RISK.indexOf(b.level) - RISK.indexOf(a.level)
      : RISK.indexOf(b.level) - RISK.indexOf(a.level));
  return (
    <>
      <div className="chips filters" aria-label="주의사항 필터">{[['ALL', '전체'], ...WARNING_GROUPS.map(g => [g.key, g.title])].map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label} {list.filter(w => inGroup(w, key)).length}</button>)}</div>
      <div className="row warning-sort">
        <span className="muted">{sort === 'DEADLINE' ? '기한 · 위험도 순 정렬' : '위험도 순 정렬'} · {list.filter(w => inGroup(w, filter)).length}건</span>
        <button className="link" onClick={() => setSort(sort === 'DEADLINE' ? 'LEVEL' : 'DEADLINE')}>정렬 변경 ⌄</button>
      </div>
      {q.isPending && <Loading />}
      {q.isError && <Error>{q.error.message}<button className="link" onClick={() => q.refetch()}>다시 시도</button></Error>}
      {WARNING_GROUPS.filter(g => filter === 'ALL' || filter === g.key).map(g => {
        const rows = list.filter(w => inGroup(w, g.key));
        if (!rows.length) return null;
        return <section className="warning-group" key={g.key}>
          <h2>{g.title}</h2>
          {rows.map(w => (
            <button className="warning-button" key={w.id} onClick={() => setSelected(w)}>
              <Warning w={w} />
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </section>;
      })}
      {!q.isPending && !q.isError && list.filter(w => inGroup(w, filter)).length === 0 && (
        <Empty
          t="현재 주의사항이 없어요"
          d="정보를 변경하면 다시 평가됩니다."
        />
      )}
      {selected && <Sheet title={selected.title} close={() => setSelected(null)}><Warning w={selected} />{selected.officialUrl && /^https?:\/\//.test(selected.officialUrl) && <a className="secondary official-link" href={selected.officialUrl} target="_blank" rel="noreferrer">공식 안내 열기 ↗</a>}<button className="primary" onClick={() => nav(destination(selected.navigationTarget))}>관련 화면으로 이동</button></Sheet>}
    </>
  );
}

type RecentScreen = { label: string; target: string; id?: number };
const RECENT_KEY = 'chatRecentScreens';
const CHAT_SUGGESTIONS = ['상속포기 기한', '채무 확인', '자료 올리기', '내 상속 정보', '전체 주의사항', '로드맵 보기'];
function readRecent(): RecentScreen[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function Chat() {
  const p = useParams(),
    nav = useNavigate(),
    [open, setOpen] = useState(false),
    [input, setInput] = useState(""),
    [hint, setHint] = useState(""),
    [sent, setSent] = useState(""),
    [reply, setReply] = useState<ChatReply>();
  // 최근 도착한 화면. 검색어가 아니라 이동 결과를 남긴다 (Figma J1).
  const [recent, setRecent] = useState<RecentScreen[]>(readRecent);
  useEffect(() => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch { /* 저장 실패는 무시한다 */ } }, [recent]);
  const m = useMutation({
    mutationFn: (message: string) =>
      apiRequest<ChatReply>(`cases/${p.caseId}/chat`, {
        method: "POST",
        ...jsonBody({ message }),
      }),
    onSuccess: (r) => {
      setHint("");
      setReply(r);
    },
  });
  function ask(v = input) {
    if (!v.trim()) {
      setHint("찾으시는 화면의 키워드를 입력해 주세요. 예: 문서, 재산, 로드맵, 기한");
      return;
    }
    setHint("");
    setInput("");
    setSent(v);
    setReply(undefined);
    m.mutate(v);
  }
  // 작성 중인 내용이 있으면 확인 후 이동한다. 화면 이동만 하고 저장·삭제는 하지 않는다.
  function go(target?: string, id?: number, label?: string) {
    if (!target) return;
    if (unsavedForm.dirty && !confirm("작성 중인 내용이 저장되지 않았습니다. 이동할까요?")) return;
    if (label) setRecent([{ label, target, id }, ...recent.filter(r => r.label !== label)].slice(0, 2));
    nav(destination(target, id));
    setOpen(false);
  }
  return (
    <>
      <button
        className="fab"
        aria-label="AI 챗봇"
        onClick={() => setOpen(true)}
      >
        <img src={`${import.meta.env.BASE_URL}assets/chat.svg`} alt="" />
      </button>
      {open && (
        <Sheet variant="chat" title="무엇을 찾으세요?" close={() => setOpen(false)} action={<button className="link" onClick={() => { setReply(undefined); setSent(''); setInput(''); setHint(''); m.reset(); }}>대화 지우기</button>}>
          <section className="chat-content">
            {!sent && <>
              <h3>찾으시는 화면으로 바로 안내해 드릴게요</h3>
              <p className="muted">짧게 적어도 됩니다. 예) 상속포기 기한, 채무, 자료 올리기</p>
              <div className="chips chat-suggestions">
                {CHAT_SUGGESTIONS.map((x) => (
                  <button key={x} onClick={() => ask(x)}>
                    {x}
                  </button>
                ))}
              </div>
              {Boolean(recent.length) && <div className="chat-recent">
                <h3>최근 찾은 화면</h3>
                {recent.map(r => <button className="checklist-row row" key={r.label} onClick={() => go(r.target, r.id, r.label)}><span>{r.label}</span><span aria-hidden="true">›</span></button>)}
              </div>}
            </>}
            {sent && <div className="sent-bubble">{maskSensitiveText(sent)}</div>}
            {m.isPending && <p className="muted" role="status">관련 화면을 찾고 있어요…</p>}
            {hint && <p className="muted">{hint}</p>}
            {m.isError && (
              <div className="bubble">
                <p>요청을 처리하지 못했어요. 다시 시도하거나 아래 메뉴로 이동해 주세요.</p>
                <button className="secondary" onClick={() => m.reset()}>
                  다시 입력
                </button>
                <div className="chips">
                  {MAIN_MENU.map((x) => (
                    <button key={x.target} onClick={() => go(x.target)}>
                      {x.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {reply && (
              <div
                className={`bubble ${reply.riskLevel === "HIGH" ? "risk" : ""}`}
              >
                <p>{maskSensitiveText(reply.message)}</p>
                {reply.riskLevel === 'HIGH' && <small>법률·세무 판단은 공식 안내 또는 전문가에게 확인해 주세요.</small>}
                {reply.navigationTarget && (
                  <button
                    className="primary"
                    onClick={() => go(reply.navigationTarget, reply.targetId, reply.buttonLabel)}
                  >
                    {reply.buttonLabel} →
                  </button>
                )}
                {reply.candidates?.length > 0 && (
                  <div className="chat-candidates">
                    {reply.candidates.map((c) => (
                      <button
                        className="checklist-row row"
                        key={`${c.navigationTarget}-${c.targetId ?? ""}-${c.label}`}
                        onClick={() => go(c.navigationTarget, c.targetId, c.label)}
                      >
                        <span>{c.label}<small className="muted">{c.description}</small></span>
                        <span aria-hidden="true">›</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <form
              className="chat-input"
              onSubmit={(e) => {
                e.preventDefault();
                ask();
              }}
            >
              <input
                aria-label="찾고 싶은 화면"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="예: 문서 어디서 올려?"
              />
              <button disabled={m.isPending || !input.trim()}>{m.isPending ? '찾는 중…' : '전송'}</button>
            </form>
          </section>
        </Sheet>
      )}
    </>
  );
}
