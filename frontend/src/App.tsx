import { deadline, itemLabels } from './shared/format';
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
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
    [busy, setBusy] = useState(false);
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
    <Public>
      <div className="mark"><img src={`${import.meta.env.BASE_URL}assets/compass.svg`} alt="상속 나침반" /></div>
      <p className="eyebrow">AI 상속 금융 내비게이터</p>
      <h1>
        상속, 무엇부터 할지
        <br />
        차분히 안내합니다
      </h1>
      <p className="sub">
        흩어진 금융정보를 실행 가능한 하나의 로드맵으로 정리해요.
      </p>
      <form className="stack auth" onSubmit={submit}>
        <Field
          label="아이디"
          name="username"
          defaultValue=""
        />
        <Field
          label="비밀번호"
          name="password"
          type="password"
          defaultValue=""
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
      {!signup && (
        <p className="demo">
          시연 계정 <b>demo / demo1234</b>
        </p>
      )}
      <Disclaimer />
    </Public>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const p = useParams(),
    nav = useNavigate();
  return (
    <div className="app">
      <header>
        <button
          className="logo"
          onClick={() => nav(`/cases/${p.caseId}/dashboard`)}
        >
          <img src={`${import.meta.env.BASE_URL}assets/compass.svg`} alt="" />상속 나침반
        </button>
        <nav>
          <button onClick={() => nav(`/cases/${p.caseId}/documents/upload`)}>
            자료 추가
          </button>
          <button onClick={() => nav(`/cases/${p.caseId}/info`)}>
            내 정보
          </button>
        </nav>
      </header>
      <main>
        {children}
        <Disclaimer />
      </main>
      <Chat />
    </div>
  );
}

function Dashboard() {
  const p = useParams(),
    nav = useNavigate();
  const [recalculate, setRecalculate] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [changes, setChanges] = useState('');
  const qc = useQueryClient();
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
      <Page
        k={`${d.case.deceasedDisplayName}님의 사건`}
        t="오늘의 상속 절차"
        d="가장 먼저 할 일부터 차근차근 확인하세요."
      />
      {d.case.roadmapDirty && (
        <Banner>중요 정보 변경으로 로드맵 재계산이 필요해요.<button className="link" onClick={() => setRecalculate(true)}>변경 반영하기 →</button></Banner>
      )}
      {changes && <Banner>{changes}</Banner>}
      {recalculate && <Sheet title="로드맵을 다시 계산할까요?" busy={busy} close={() => setRecalculate(false)}><p>확정한 정보를 반영합니다. 같은 단계의 기존 처리 결과는 유지되며, 바뀐 단계와 기한을 안내합니다.</p>{error && <Error>{error}</Error>}<div className="actions"><button className="secondary" disabled={busy} onClick={() => setRecalculate(false)}>나중에</button><button className="primary" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { const next = await apiRequest<{ version: number; changes: RoadmapChanges }>(`cases/${p.caseId}/roadmaps/recalculate`, { method: 'POST' }); setChanges(describeChanges(next.version, next.changes)); setRecalculate(false); await qc.invalidateQueries(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>{busy ? '계산 중…' : '다시 계산'}</button></div></Sheet>}
      <Section t="지금 해야 할 일">
        {d.priorityTask?.id ? (
          <article
            className="hero"
          >
            <div className="row"><Status v={d.priorityTask.status} /><span className="status needs_confirmation">{deadline(d.priorityTask)}</span></div>
            <h2>{d.priorityTask.title}</h2>
            <p>{d.priorityTask.purpose}</p>
            <div className="actions"><button className="primary" onClick={() => nav(`/cases/${p.caseId}/tasks/${d.priorityTask.id}`)}>처리 방법 보기</button><button className="secondary" onClick={() => nav(`/cases/${p.caseId}/roadmap`)}>다른 단계 보기</button></div>
          </article>
        ) : (
          <p>필수 단계가 모두 완료되었습니다.</p>
        )}
      </Section>
      <Section t="내 로드맵" action={() => nav(`/cases/${p.caseId}/roadmap`)}>
        <div className="road">
          {d.roadmap.map((s: Step) => (
            <button
              key={s.id}
              onClick={() => nav(`/cases/${p.caseId}/tasks/${s.id}`)}
            >
              <Status v={s.status} />
              <b>{s.sequenceNo}</b>
              <span>{s.title}</span>
            </button>
          ))}
        </div>
        <p className="muted">완료 · 현재 · 예정 — 처리 결과를 저장하면 다음 단계가 열립니다.</p>
        <button className="link" onClick={() => setRecalculate(true)}>로드맵 다시 계산</button>
      </Section>
      <Section t="먼저 확인할 것" action={() => nav(`/cases/${p.caseId}/financial-items`)}>{items.data?.filter(x => x.amountStatus === 'NEEDS_CONFIRMATION').map(x => <button className="card row" key={x.id} onClick={() => nav(`/cases/${p.caseId}/financial-items`)}><span>{x.institution || itemLabels[x.itemType]}<small className="muted"> · 금액 확인 필요</small></span><span aria-hidden="true">›</span></button>)}</Section>
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

function Upload() {
  const p = useParams(),
    nav = useNavigate(),
    [file, setFile] = useState<File>(),
    [consent, setConsent] = useState(false),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false);
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
      <Page
        k="상속자료 추가"
        t="문서를 안전하게 올려주세요"
        d="PDF, PNG, JPG, JPEG · 최대 10MB"
      />
      <label className="upload">
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files?.[0])}
        />
        <b>{file?.name || "파일 선택"}</b>
        <span>원본은 공개 URL로 제공되지 않습니다.</span>
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
      <Page
        k="등록 상속자료"
        t="AI 추출 결과를 확인하세요"
        d="확정하기 전에는 재산·채무에 반영되지 않아요."
      />
      {q.isPending && <Loading />}{q.isError && <Error>{q.error.message}<button className="link" onClick={() => q.refetch()}>다시 시도</button></Error>}{error && <Error>{error}</Error>}
      {q.data?.length === 0 && <Empty t="등록된 문서가 없어요" d="문서를 올리면 AI 분석 결과를 검토할 수 있습니다." />}
      {q.data?.map((d) => (
        <article className="card" key={d.id}>
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
              <b>{x.institution}</b>
              <strong>
                {x.amount != null
                  ? Number(x.amount).toLocaleString() + "원"
                  : "금액 확인 필요"}
              </strong>
              <small>
                신뢰도 {Math.round((x.confidence || 0) * 100)}% ·{" "}
                {x.evidenceText}
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
  useEffect(() => { unsavedForm.dirty = JSON.stringify(analysis) !== JSON.stringify(document.analysis); return () => { unsavedForm.dirty = false; }; }, [analysis, document.analysis]);
  async function confirm() {
    setBusy(true); setError('');
    try { await apiRequest(`documents/${document.id}/confirm`, { method: "PATCH", ...jsonBody(analysis) }); saved(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="review">{analysis.items.map((x, i) => <div className="extract" key={i}>
    <span>{x.assetOrDebt === "ASSET" ? "재산" : "채무"} · {itemLabels[x.category] || x.category} · 신뢰도 {Math.round((x.confidence || 0) * 100)}%</span>
    <div className="row"><h3>{x.institution || '기관 미입력'}</h3><button className="link" disabled={busy} onClick={() => setEditing(i)}>수정</button></div>
    <strong>{x.amountStatus === 'CONFIRMED' && x.amount != null ? `${x.amount.toLocaleString()}원` : '금액 미확인'}</strong>
    <small>{x.evidenceText}</small><button className="danger" disabled={busy} onClick={() => setAnalysis({ ...analysis, items: analysis.items.filter((_, n) => n !== i) })}>이 항목 제외</button>
  </div>)}{error && <Error>{error}</Error>}<button className="primary" disabled={busy || !analysis.items.length} onClick={confirm}>{busy ? '확정 중…' : `${analysis.items.length}건 모두 확정하기`}</button>
  {editing !== null && <Sheet title="항목 수정" close={() => setEditing(null)}><FinancialForm showMemo={false} initial={{ ...analysis.items[editing], itemType: analysis.items[editing].category, referenceDate: analysis.items[editing].referenceDate ?? undefined }} cancel={() => setEditing(null)} save={async data => { setAnalysis({ ...analysis, items: analysis.items.map((item, i) => i === editing ? { ...item, ...data, category: data.itemType } : item) }); setEditing(null); }} /></Sheet>}
  </div>;
}

function Roadmap() {
  const p = useParams(),
    nav = useNavigate();
  const q = useQuery({
    queryKey: ["roadmap", p.caseId],
    queryFn: () =>
      apiRequest<{ steps: Step[]; version: number }>(`cases/${p.caseId}/roadmaps/current`),
    retry: false,
  });
  if (q.isPending) return <Loading />;
  return (
    <>
      <Page
        k="맞춤 로드맵"
        t="필요한 절차를 순서대로"
        d={`처리 결과를 저장해야 다음 단계가 열립니다.${q.data ? ` (버전 ${q.data.version})` : ""}`}
      />
      {q.data?.steps.map((s) => (
        <button
          className="step"
          key={s.id}
          onClick={() => nav(`/cases/${p.caseId}/tasks/${s.id}`)}
        >
          <b>{s.sequenceNo}</b>
          <div>
            <Status v={s.status} />
            <h3>{s.title}</h3>
            <p>{deadline(s)}</p>
          </div>
        </button>
      ))}
      {q.isError && (
        <Error>{q.error.message}<button className="link" onClick={() => nav(`/cases/${p.caseId}/dashboard`)}>메인에서 로드맵 준비하기</button></Error>
      )}
    </>
  );
}

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
      <Page
        k="내 상속 정보"
        t={`${c.deceasedDisplayName}님의 사건`}
        d={`최근 로드맵 반영 ${c.roadmapUpdatedAt ? new Date(c.roadmapUpdatedAt).toLocaleDateString() : "아직 없음"}`}
      />
      <article className="card facts">
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
      <div className="two">
        <Metric n={`${sum("ASSET").toLocaleString()}원`} l="확인 자산" />
        <Metric n={`${sum("DEBT").toLocaleString()}원`} l="확인 채무" />
      </div>
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
      <Page
        k="통합 수정"
        t="중요 정보를 확인하세요"
        d="기산일 등 변경은 저장 후 영향 범위를 안내합니다."
      />
      <form
        className="stack"
        onSubmit={submit}
        onChange={() => {
          unsavedForm.dirty = true;
        }}
      >
        <div className="chips filters"><button type="button" aria-pressed="true">기본 정보</button><button type="button" onClick={() => { if (!unsavedForm.dirty || confirm('저장하지 않은 변경이 있습니다. 이동할까요?')) nav(`/cases/${p.caseId}/documents`); }}>등록 문서</button><button type="button" onClick={() => { if (!unsavedForm.dirty || confirm('저장하지 않은 변경이 있습니다. 이동할까요?')) nav(`/cases/${p.caseId}/financial-items`); }}>재산·채무</button></div>
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
        <Field label="사망자와의 관계" name="relationship" defaultValue={q.data.relationship} />
        <label className="check"><input name="minor" type="checkbox" defaultChecked={q.data.minorHeirExists} />미성년 상속인 후보가 있어요</label>
        <label className="check"><input name="will" type="checkbox" defaultChecked={q.data.willExists} />유언이 있어요</label>
        <Field label="이미 완료한 절차 (선택)" name="completed" required={false} defaultValue={q.data.completedProcedures} />
        {error && <Error>{error}</Error>}
        <button className="primary" disabled={busy}>{busy ? '저장 중…' : '변경 저장'}</button>
      </form>
      {impact && <Sheet title="상속 정보를 저장했어요" close={() => nav(`/cases/${p.caseId}/info`)}><p>기준 날짜와 조건의 변경은 단계·기한에 영향을 줄 수 있습니다. 로드맵에서 변경 내용을 반영해 주세요.</p><div className="actions"><button className="secondary" onClick={() => nav(`/cases/${p.caseId}/info`)}>나중에</button><button className="primary" onClick={() => nav(`/cases/${p.caseId}/dashboard`)}>로드맵 확인</button></div></Sheet>}
    </>
  );
}

function Warnings() {
  const p = useParams(),
    nav = useNavigate();
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState<any>(null);
  const q = useQuery({
    queryKey: ["warnings", p.caseId],
    queryFn: () => apiRequest<any[]>(`cases/${p.caseId}/warnings`),
  });
  return (
    <>
      <Page
        k="전체 주의사항"
        t="지금 확인할 내용을 모았어요"
        d="위험도와 기한을 기준으로 정렬합니다."
      />
      <div className="chips filters" aria-label="주의사항 필터">{[['ALL', '전체'], ['CHECK_NOW', '지금 확인'], ['CURRENT_STEP', '현재 단계'], ['LATER_STEP', '이후 단계'], ['DEADLINE_RISK', '기한 위험'], ['MISSING_INFO', '정보 누락']].map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
      {q.isPending && <Loading />}
      {q.isError && <Error>{q.error.message}<button className="link" onClick={() => q.refetch()}>다시 시도</button></Error>}
      {q.data?.filter(w => filter === 'ALL' || w.category === filter).map((w) => (
        <button
          className="warning-button"
          key={w.id}
          onClick={() => setSelected(w)}
        >
          <Warning w={w} />
          <span>자세히 보기 →</span>
        </button>
      ))}
      {q.data?.filter(w => filter === 'ALL' || w.category === filter).length === 0 && (
        <Empty
          t="현재 주의사항이 없어요"
          d="정보를 변경하면 다시 평가됩니다."
        />
      )}
      {selected && <Sheet title={selected.title} close={() => setSelected(null)}><Warning w={selected} /><button className="primary" onClick={() => nav(destination(selected.navigationTarget))}>관련 화면으로 이동</button></Sheet>}
    </>
  );
}

function Chat() {
  const p = useParams(),
    nav = useNavigate(),
    [open, setOpen] = useState(false),
    [input, setInput] = useState(""),
    [hint, setHint] = useState(""),
    [reply, setReply] = useState<ChatReply>();
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
    m.mutate(v);
  }
  // 작성 중인 내용이 있으면 확인 후 이동한다. 화면 이동만 하고 저장·삭제는 하지 않는다.
  function go(target?: string, id?: number) {
    if (!target) return;
    if (unsavedForm.dirty && !confirm("작성 중인 내용이 저장되지 않았습니다. 이동할까요?")) return;
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
        <Sheet title="무엇을 찾으세요?" close={() => setOpen(false)}>
          <section className="chat-content">
            <div className="row">
              <div>
                <p className="eyebrow">AI 내비게이터</p>
                <h2>무엇을 찾고 있나요?</h2>
              </div>
              <button className="link" onClick={() => { setReply(undefined); setInput(''); setHint(''); m.reset(); }}>
                대화 지우기
              </button>
            </div>
            <div className="chips">
              {[
                "지금 뭘 해야 해?",
                "업로드한 문서 보여줘",
                "기한이 궁금해",
              ].map((x) => (
                <button key={x} onClick={() => ask(x)}>
                  {x}
                </button>
              ))}
            </div>
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
                <p>{reply.message}</p>
                {reply.riskLevel === 'HIGH' && <small>법률·세무 판단은 공식 안내 또는 전문가에게 확인해 주세요.</small>}
                {reply.navigationTarget && (
                  <button
                    className="primary"
                    onClick={() => go(reply.navigationTarget, reply.targetId)}
                  >
                    {reply.buttonLabel} →
                  </button>
                )}
                {reply.candidates?.length > 0 && (
                  <div className="chips">
                    {reply.candidates.map((c) => (
                      <button
                        key={`${c.navigationTarget}-${c.targetId ?? ""}-${c.label}`}
                        title={c.description}
                        onClick={() => go(c.navigationTarget, c.targetId)}
                      >
                        {c.label}
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
