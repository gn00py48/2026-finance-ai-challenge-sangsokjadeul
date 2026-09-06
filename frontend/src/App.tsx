import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { apiRequest, jsonBody } from "./shared/api/client";
import type {
  CaseInfo,
  ChatReply,
  DocumentItem,
  FinancialItem,
  Step,
} from "./shared/types";

const legal =
  "본 서비스는 입력·업로드 정보를 기반으로 상속 절차를 정리하는 참고용 서비스입니다. 법률·세무 판단이나 기관의 공식 확인을 대신하지 않습니다.";
const caseId = () => localStorage.getItem("caseId");
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
  const logged = Boolean(localStorage.getItem("accessToken"));
  const home = logged
    ? caseId()
      ? `/cases/${caseId()}/dashboard`
      : "/onboarding"
    : "/login";
  return (
    <Routes>
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
    </Routes>
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
      <div className="mark">나침반</div>
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
          defaultValue={signup ? "" : "demo"}
        />
        <Field
          label="비밀번호"
          name="password"
          type="password"
          defaultValue={signup ? "" : "demo1234"}
        />
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

function Onboarding() {
  const nav = useNavigate(),
    [step, setStep] = useState(1),
    [error, setError] = useState("");
  const [form, setForm] = useState({
    deceasedDisplayName: "고인",
    deathDate: "2026-08-20",
    awarenessDate: "2026-08-21",
    awarenessDateCertain: true,
    relationship: "자녀",
    inquiryStatus: "RESULT_AVAILABLE",
    minorHeirExists: false,
    willExists: false,
    completedProcedures: "",
    heirCandidates: [],
  });
  async function create() {
    try {
      const c = await apiRequest<CaseInfo>("cases", {
        method: "POST",
        ...jsonBody(form),
      });
      localStorage.setItem("caseId", String(c.id));
      nav(
        form.inquiryStatus === "RESULT_AVAILABLE"
          ? `/cases/${c.id}/documents/upload`
          : `/cases/${c.id}/financial-items`,
      );
    } catch (x) {
      setError((x as Error).message);
    }
  }
  return (
    <Public>
      <Progress n={step} />
      {step === 1 && (
        <>
          <Title k="기본 상황" t="먼저 사건 정보를 알려주세요" />
          <div className="stack">
            <Field
              label="사망자 표시명"
              value={form.deceasedDisplayName}
              change={(v) => setForm({ ...form, deceasedDisplayName: v })}
            />
            <Field
              label="사망일"
              type="date"
              value={form.deathDate}
              change={(v) => setForm({ ...form, deathDate: v })}
            />
            <Field
              label="상속개시 사실을 알게 된 날"
              type="date"
              value={form.awarenessDate}
              change={(v) => setForm({ ...form, awarenessDate: v })}
            />
            <Check
              checked={form.awarenessDateCertain}
              change={(v) => setForm({ ...form, awarenessDateCertain: v })}
            >
              이 날짜가 확실해요
            </Check>
            <Field
              label="사망자와의 관계"
              value={form.relationship}
              change={(v) => setForm({ ...form, relationship: v })}
            />
          </div>
          <Bottom onClick={() => setStep(2)} />
        </>
      )}
      {step === 2 && (
        <>
          <Title k="조건 확인" t="절차에 영향을 줄 정보를 확인할게요" />
          <div className="stack choices">
            <Choice
              on={form.minorHeirExists}
              click={() =>
                setForm({ ...form, minorHeirExists: !form.minorHeirExists })
              }
            >
              미성년 상속인 후보가 있어요
            </Choice>
            <Choice
              on={form.willExists}
              click={() => setForm({ ...form, willExists: !form.willExists })}
            >
              유언이 있어요
            </Choice>
            <Field
              label="이미 완료한 절차 (선택)"
              value={form.completedProcedures}
              change={(v) => setForm({ ...form, completedProcedures: v })}
            />
          </div>
          <Bottom onClick={() => setStep(3)} />
        </>
      )}
      {step === 3 && (
        <>
          <Title k="재산·채무 파악" t="현재 자료 확인 상태는 어떤가요?" />
          <div className="stack choices">
            {[
              ["BEFORE", "안심상속 조회 전"],
              ["IN_PROGRESS", "조회 진행 중"],
              ["RESULT_AVAILABLE", "조회 결과 보유"],
              ["PARTIAL", "일부 정보만 알고 있음"],
            ].map(([v, l]) => (
              <Choice
                key={v}
                on={form.inquiryStatus === v}
                click={() => setForm({ ...form, inquiryStatus: v })}
              >
                {l}
              </Choice>
            ))}
          </div>
          {error && <Error>{error}</Error>}
          <button className="primary bottom" onClick={create}>
            사건 만들고 계속
          </button>
        </>
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
          상속나침반
        </button>
        <nav>
          <button onClick={() => nav(`/cases/${p.caseId}/documents/upload`)}>
            자료 추가
          </button>
          <button onClick={() => nav(`/cases/${p.caseId}/info`)}>
            내 정보
          </button>
          <button onClick={async () => {
            await apiRequest("auth/logout", { method: "POST" }).catch(() => undefined);
            localStorage.removeItem("accessToken");
            localStorage.removeItem("caseId");
            nav("/login");
          }}>
            로그아웃
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
  const q = useQuery({
    queryKey: ["dashboard", p.caseId],
    queryFn: () => apiRequest<any>(`cases/${p.caseId}/dashboard`),
    retry: false,
  });
  if (q.isLoading) return <Loading />;
  if (q.isError)
    return (
      <Empty
        t="로드맵을 준비해 주세요"
        d="확정 정보를 기준으로 규칙 엔진이 단계와 기한을 계산합니다."
      >
        <button
          className="primary"
          onClick={async () => {
            await apiRequest(`cases/${p.caseId}/roadmaps`, { method: "POST" });
            q.refetch();
          }}
        >
          로드맵 생성
        </button>
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
        <Banner>중요 정보 변경으로 로드맵 재계산이 필요해요.</Banner>
      )}
      <Section t="지금 해야 할 일">
        {d.priorityTask?.id ? (
          <button
            className="hero"
            onClick={() => nav(`/cases/${p.caseId}/tasks/${d.priorityTask.id}`)}
          >
            <Status v={d.priorityTask.status} />
            <h2>{d.priorityTask.title}</h2>
            <p>{d.priorityTask.purpose}</p>
            <strong>{deadline(d.priorityTask)} · 처리 방법 보기 →</strong>
          </button>
        ) : (
          <p>필수 단계가 모두 완료되었습니다.</p>
        )}
      </Section>
      <Section t="나의 로드맵">
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
      </Section>
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
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(sample = false) {
    setBusy(true);
    try {
      let d: DocumentItem;
      if (sample)
        d = await apiRequest(`cases/${p.caseId}/documents/sample`, {
          method: "POST",
        });
      else {
        if (!file) throw new globalThis.Error("파일을 선택해 주세요.");
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
      <Check checked change={() => {}}>
        AI 분석을 위해 마스킹된 정보를 전송하는 데 동의합니다.
      </Check>
      {msg && <Error>{msg}</Error>}
      <button className="primary" disabled={busy} onClick={() => run()}>
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
            <ReviewEditor document={d} saved={() => qc.invalidateQueries({ queryKey: ["docs", p.caseId] })} />
          ) : d.analysis?.items.map((x, i) => (
            <div className="extract" key={i}>
              <span>
                {x.assetOrDebt === "ASSET" ? "자산" : "채무"} · {x.category}
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
              onClick={async () => {
                await apiRequest(`documents/${d.id}/analyze`, {
                  method: "POST",
                });
                q.refetch();
              }}
            >
              분석 재시도
            </button>
          )}
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
  async function confirm() {
    await apiRequest(`documents/${document.id}/confirm`, { method: "PATCH", ...jsonBody(analysis) });
    saved();
  }
  return <div className="review">{analysis.items.map((x, i) => <div className="extract" key={i}>
    <span>{x.assetOrDebt === "ASSET" ? "자산" : "채무"} · {x.category} · 신뢰도 {Math.round((x.confidence || 0) * 100)}%</span>
    <input aria-label="기관명" value={x.institution} onChange={e => setAnalysis({ ...analysis, items: analysis.items.map((v, n) => n === i ? { ...v, institution: e.target.value } : v) })} />
    <input aria-label="금액" type="number" value={x.amount ?? ""} placeholder="금액 확인 필요" onChange={e => setAnalysis({ ...analysis, items: analysis.items.map((v, n) => n === i ? { ...v, amount: e.target.value ? Number(e.target.value) : null, amountStatus: e.target.value ? "CONFIRMED" : "NEEDS_CONFIRMATION" } : v) })} />
    <small>{x.evidenceText}</small><button className="danger" onClick={() => setAnalysis({ ...analysis, items: analysis.items.filter((_, n) => n !== i) })}>이 항목 제외</button>
  </div>)}<button className="primary" onClick={confirm}>수정 내용으로 확정</button></div>;
}

function Finances() {
  const p = useParams(),
    qc = useQueryClient(),
    [error, setError] = useState("");
  const q = useQuery({
    queryKey: ["items", p.caseId],
    queryFn: () =>
      apiRequest<FinancialItem[]>(`cases/${p.caseId}/financial-items`),
  });
  const [f, setF] = useState({
    assetOrDebt: "ASSET",
    itemType: "DEPOSIT",
    institution: "",
    amount: "",
    amountStatus: "CONFIRMED",
    memo: "",
  });
  async function add(e: FormEvent) {
    e.preventDefault();
    try {
      await apiRequest(`cases/${p.caseId}/financial-items`, {
        method: "POST",
        ...jsonBody({
          ...f,
          amount: f.amountStatus === "CONFIRMED" ? Number(f.amount) : null,
        }),
      });
      setF({ ...f, institution: "", amount: "" });
      qc.invalidateQueries({ queryKey: ["items", p.caseId] });
    } catch (x) {
      setError((x as Error).message);
    }
  }
  return (
    <>
      <Page
        k="재산·채무"
        t="알고 있는 항목을 등록하세요"
        d="정확한 금액을 모르면 ‘확인 필요’로 남겨두세요."
      />
      <form className="card stack" onSubmit={add}>
        <div className="seg">
          <button
            type="button"
            className={f.assetOrDebt === "ASSET" ? "on" : ""}
            onClick={() => setF({ ...f, assetOrDebt: "ASSET" })}
          >
            자산
          </button>
          <button
            type="button"
            className={f.assetOrDebt === "DEBT" ? "on" : ""}
            onClick={() => setF({ ...f, assetOrDebt: "DEBT" })}
          >
            채무
          </button>
        </div>
        <label>
          유형
          <select
            value={f.itemType}
            onChange={(e) => setF({ ...f, itemType: e.target.value })}
          >
            {[
              "DEPOSIT",
              "INSURANCE",
              "STOCK",
              "REAL_ESTATE",
              "LOAN",
              "CARD_DEBT",
              "TAX",
              "OTHER",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <Field
          label="기관"
          value={f.institution}
          change={(v) => setF({ ...f, institution: v })}
        />
        <Field
          label="금액"
          type="number"
          value={f.amount}
          change={(v) => setF({ ...f, amount: v })}
        />
        <Check
          checked={f.amountStatus === "NEEDS_CONFIRMATION"}
          change={(v) =>
            setF({ ...f, amountStatus: v ? "NEEDS_CONFIRMATION" : "CONFIRMED" })
          }
        >
          금액 확인 필요
        </Check>
        {error && <Error>{error}</Error>}
        <button className="primary">항목 추가</button>
      </form>
      {q.data?.map((x) => (
        <article className="card item" key={x.id}>
          <div>
            <Status v={x.amountStatus} />
            <h3>
              {x.institution || "기관 미입력"} · {x.itemType}
            </h3>
            <p>
              {x.amountStatus === "CONFIRMED"
                ? `${Number(x.amount).toLocaleString()}원`
                : "금액 확인 필요"}
            </p>
          </div>
          <div className="item-actions"><button className="link" onClick={async () => {
              const institution = prompt("기관명을 수정하세요", x.institution || "");
              if (institution === null) return;
              const amount = prompt("금액을 입력하세요. 모르면 비워두세요.", x.amount?.toString() || "");
              await apiRequest(`financial-items/${x.id}`, { method: "PATCH", ...jsonBody({ assetOrDebt: x.assetOrDebt, itemType: x.itemType, institution, amount: amount ? Number(amount) : null, amountStatus: amount ? "CONFIRMED" : "NEEDS_CONFIRMATION", referenceDate: x.referenceDate, memo: x.memo }) });
              qc.invalidateQueries({ queryKey: ["items", p.caseId] });
            }}>수정</button><button className="danger" onClick={async () => {
              await apiRequest(`financial-items/${x.id}`, { method: "DELETE" });
              qc.invalidateQueries({ queryKey: ["items", p.caseId] });
            }}>삭제</button></div>
        </article>
      ))}
    </>
  );
}

function Roadmap() {
  const p = useParams(),
    nav = useNavigate();
  const q = useQuery({
    queryKey: ["roadmap", p.caseId],
    queryFn: () =>
      apiRequest<{ steps: Step[] }>(`cases/${p.caseId}/roadmaps/current`),
    retry: false,
  });
  return (
    <>
      <Page
        k="맞춤 로드맵"
        t="필요한 절차를 순서대로"
        d="처리 결과를 저장해야 다음 단계가 열립니다."
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
        <button
          className="primary"
          onClick={async () => {
            await apiRequest(`cases/${p.caseId}/roadmaps`, { method: "POST" });
            q.refetch();
          }}
        >
          로드맵 생성
        </button>
      )}
    </>
  );
}

function Task() {
  const p = useParams(),
    nav = useNavigate(),
    qc = useQueryClient();
  const q = useQuery({
      queryKey: ["task", p.taskId],
      queryFn: () => apiRequest<Step>(`tasks/${p.taskId}`),
    }),
    s = q.data;
  if (!s) return <Loading />;
  async function save(progressStatus: string) {
    await apiRequest(`tasks/${p.taskId}/result`, {
      method: "PATCH",
      ...jsonBody({
        progressStatus,
        resultDate: new Date().toISOString().slice(0, 10),
        resultText: "사용자 입력",
        memo: "",
      }),
    });
    qc.invalidateQueries();
    nav(`/cases/${p.caseId}/dashboard`);
  }
  return (
    <>
      <Page k={`로드맵 ${s.sequenceNo}단계`} t={s.title} d={s.purpose} />
      <Status v={s.status} />
      <Section t="처리 순서">
        <p>{s.instructions}</p>
      </Section>
      <Section t="준비 서류">
        <p>{s.requiredDocuments}</p>
      </Section>
      <Section t="처리 기관">
        <p>{s.institution}</p>
      </Section>
      <Section t="참고 기한">
        <p>{deadline(s)}</p>
      </Section>
      <Section t="주의사항">
        <Banner>{s.cautions}</Banner>
        {s.expertRecommended && (
          <p className="expert">중요한 결정은 전문가 확인을 권합니다.</p>
        )}
        <a href={s.officialUrl} target="_blank" rel="noreferrer">
          공식 안내 열기 ↗
        </a>
      </Section>
      <div className="actions">
        <button className="secondary" onClick={() => save("CHECKING")}>
          확인 중
        </button>
        <button className="primary" onClick={() => save("COMPLETED")}>
          처리 완료
        </button>
        {s.status === "COMPLETED" && (
          <button className="danger" onClick={() => save("IN_PROGRESS")}>
            완료 취소
          </button>
        )}
      </div>
    </>
  );
}

function Info() {
  const p = useParams(),
    nav = useNavigate();
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
        <Fact k="자료 파악" v={c.inquiryStatus} />
      </article>
      <div className="two">
        <Metric n={`${sum("ASSET").toLocaleString()}원`} l="확인 자산" />
        <Metric n={`${sum("DEBT").toLocaleString()}원`} l="확인 채무" />
      </div>
      <article className="card">
        <h3>등록 상속자료</h3>
        <p>{dq.data?.length || 0}건</p>
        <button
          className="link"
          onClick={() => nav(`/cases/${p.caseId}/documents`)}
        >
          문서 보기 →
        </button>
      </article>
      <button
        className="primary"
        onClick={() => nav(`/cases/${p.caseId}/edit`)}
      >
        상속 정보 수정
      </button>
    </>
  );
}

function Edit() {
  const p = useParams(),
    nav = useNavigate(),
    [error, setError] = useState("");
  const q = useQuery({
    queryKey: ["case", p.caseId],
    queryFn: () => apiRequest<CaseInfo>(`cases/${p.caseId}`),
  });
  if (!q.data) return <Loading />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      body = {
        ...q.data,
        deceasedDisplayName: f.get("name"),
        deathDate: f.get("death"),
        awarenessDate: f.get("aware"),
        awarenessDateCertain: f.get("certain") === "on",
      };
    try {
      const r = await apiRequest<any>(`cases/${p.caseId}`, {
        method: "PATCH",
        ...jsonBody(body),
      });
      if (
        r.roadmapImpact &&
        confirm(`${r.impactSummary}\n로드맵을 다시 계산할까요?`)
      )
        await apiRequest(`cases/${p.caseId}/roadmaps/recalculate`, {
          method: "POST",
        });
      nav(`/cases/${p.caseId}/info`);
    } catch (x) {
      setError((x as Error).message);
    }
  }
  return (
    <>
      <Page
        k="통합 수정"
        t="중요 정보를 확인하세요"
        d="기산일 등 변경은 저장 후 영향 범위를 안내합니다."
      />
      <form className="stack" onSubmit={submit}>
        <Field
          label="사망자 표시명"
          name="name"
          defaultValue={q.data.deceasedDisplayName}
        />
        <Field
          label="사망일"
          name="death"
          type="date"
          defaultValue={q.data.deathDate}
        />
        <Field
          label="상속개시 사실을 안 날"
          name="aware"
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
        {error && <Error>{error}</Error>}
        <button className="primary">변경 저장</button>
      </form>
    </>
  );
}

function Warnings() {
  const p = useParams(),
    nav = useNavigate();
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
      {q.data?.map((w) => (
        <button
          className="warning-button"
          key={w.id}
          onClick={() => nav(destination(w.navigationTarget))}
        >
          <Warning w={w} />
          <span>관련 화면으로 이동 →</span>
        </button>
      ))}
      {q.data?.length === 0 && (
        <Empty
          t="현재 주의사항이 없어요"
          d="정보를 변경하면 다시 평가됩니다."
        />
      )}
    </>
  );
}

function Chat() {
  const p = useParams(),
    nav = useNavigate(),
    [open, setOpen] = useState(false),
    [input, setInput] = useState(""),
    [reply, setReply] = useState<ChatReply>();
  const m = useMutation({
    mutationFn: (message: string) =>
      apiRequest<ChatReply>(`cases/${p.caseId}/chat`, {
        method: "POST",
        ...jsonBody({ message }),
      }),
    onSuccess: setReply,
  });
  function ask(v = input) {
    if (v.trim()) {
      setInput("");
      m.mutate(v);
    }
  }
  return (
    <>
      <button
        className="fab"
        aria-label="AI 챗봇"
        onClick={() => setOpen(true)}
      >
        ✦
      </button>
      {open && (
        <div className="backdrop" onClick={() => setOpen(false)}>
          <section className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <div>
                <p className="eyebrow">AI 내비게이터</p>
                <h2>무엇을 찾고 있나요?</h2>
              </div>
              <button className="close" onClick={() => setOpen(false)}>
                닫기
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
            {reply && (
              <div
                className={`bubble ${reply.riskLevel === "HIGH" ? "risk" : ""}`}
              >
                <p>{reply.message}</p>
                <small>위험도 {reply.riskLevel}</small>
                <button
                  className="primary"
                  onClick={() => {
                    nav(destination(reply.navigationTarget, reply.targetId));
                    setOpen(false);
                  }}
                >
                  {reply.buttonLabel} →
                </button>
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
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="예: 문서 어디서 올려?"
              />
              <button disabled={m.isPending}>전송</button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function deadline(s: Step) {
  return s.deadlineStatus === "NEEDS_CONFIRMATION"
    ? "기한 확인 필요"
    : s.dDay != null
      ? `D-${s.dDay}`
      : s.deadline || "참고 기한 없음";
}
function Public({ children }: { children: ReactNode }) {
  return <div className="public">{children}</div>;
}
function Page({ k, t, d }: { k: string; t: string; d: string }) {
  return (
    <div className="page">
      <p className="eyebrow">{k}</p>
      <h1>{t}</h1>
      <p className="sub">{d}</p>
    </div>
  );
}
function Title({ k, t }: { k: string; t: string }) {
  return (
    <>
      <p className="eyebrow">{k}</p>
      <h1>{t}</h1>
      <p className="sub">한 번 입력한 정보는 나중에 수정할 수 있어요.</p>
    </>
  );
}
function Field({
  label,
  name,
  type = "text",
  value,
  change,
  defaultValue,
}: {
  label: string;
  name?: string;
  type?: string;
  value?: string;
  change?: (v: string) => void;
  defaultValue?: string;
}) {
  return (
    <label>
      {label}
      <input
        required
        name={name}
        type={type}
        value={value}
        defaultValue={defaultValue}
        onChange={change ? (e) => change(e.target.value) : undefined}
      />
    </label>
  );
}
function Check({
  checked,
  change,
  children,
}: {
  checked: boolean;
  change: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => change(e.target.checked)}
      />
      {children}
    </label>
  );
}
function Choice({
  on,
  click,
  children,
}: {
  on: boolean;
  click: () => void;
  children: ReactNode;
}) {
  return (
    <button className={`choice ${on ? "on" : ""}`} onClick={click}>
      {on ? "✓ " : "○ "}
      {children}
    </button>
  );
}
function Progress({ n }: { n: number }) {
  return (
    <div className="progress">
      <span style={{ width: `${(n / 3) * 100}%` }} />
    </div>
  );
}
function Bottom({ onClick }: { onClick: () => void }) {
  return (
    <button className="primary bottom" onClick={onClick}>
      다음
    </button>
  );
}
function Section({
  t,
  action,
  children,
}: {
  t: string;
  action?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <div className="row">
        <h2>{t}</h2>
        {action && (
          <button className="link" onClick={action}>
            전체 보기
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
function Status({ v }: { v: string }) {
  const l: any = {
    COMPLETED: "완료",
    CURRENT: "현재",
    UPCOMING: "예정",
    RECHECK_REQUIRED: "재확인 필요",
    CONFIRMED: "확정",
    NEEDS_CONFIRMATION: "확인 필요",
    UPLOADED: "업로드됨",
    ANALYZING: "분석 중",
    NEEDS_REVIEW: "검토 필요",
    FAILED: "실패",
  };
  return <span className={`status ${v.toLowerCase()}`}>{l[v] || v}</span>;
}
function Warning({ w }: { w: any }) {
  return (
    <div className={`warning ${w.level.toLowerCase()}`}>
      <b>{w.title}</b>
      <p>{w.message}</p>
      <small>
        {w.category} · {w.level}
      </small>
    </div>
  );
}
function Metric({
  n,
  l,
  click,
}: {
  n: string | number;
  l: string;
  click?: () => void;
}) {
  return (
    <button className="metric" onClick={click}>
      <b>{n}</b>
      <span>{l}</span>
    </button>
  );
}
function Banner({ children }: { children: ReactNode }) {
  return <div className="banner">{children}</div>;
}
function Disclaimer() {
  return <p className="disclaimer">{legal}</p>;
}
function Error({ children }: { children: ReactNode }) {
  return <p className="error">{children}</p>;
}
function Loading() {
  return <p className="loading">불러오는 중...</p>;
}
function Empty({
  t,
  d,
  children,
}: {
  t: string;
  d: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <h2>{t}</h2>
      <p>{d}</p>
      {children}
    </div>
  );
}
function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
