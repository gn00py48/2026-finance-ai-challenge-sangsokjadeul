import type { ReactNode } from 'react';

const legal = '본 서비스는 입력·업로드 정보를 기반으로 상속 절차를 정리하는 참고용 서비스입니다. 법률·세무 판단이나 기관의 공식 확인을 대신하지 않습니다.';
export function Public({ children, variant = 'onboarding' }: { children: ReactNode; variant?: 'login' | 'signup' | 'onboarding' }) {
  return <div className={`public public--${variant}`}>{children}</div>;
}
export function Page({ k, t, d }: { k: string; t: string; d: string }) {
  return (
    <div className="page">
      <p className="eyebrow">{k}</p>
      <h1>{t}</h1>
      <p className="sub">{d}</p>
    </div>
  );
}
export function Title({ k, t }: { k: string; t: string }) {
  return (
    <div className="onboarding-title">
      <p className="eyebrow">{k}</p>
      <h1>{t}</h1>
      <p className="sub">한 번 입력한 정보는 나중에 수정할 수 있어요.</p>
    </div>
  );
}
export function Field({
  label,
  name,
  type = "text",
  value,
  change,
  defaultValue,
  required = true,
  placeholder,
}: {
  label: string;
  name?: string;
  type?: string;
  value?: string;
  change?: (v: string) => void;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label>
      {label}
      <input
        required={required}
        placeholder={placeholder}
        min={type === 'number' ? 0 : undefined}
        name={name}
        type={type}
        value={value}
        defaultValue={defaultValue}
        onChange={change ? (e) => change(e.target.value) : undefined}
      />
    </label>
  );
}
export function Check({
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
export function Choice({
  on,
  click,
  children,
}: {
  on: boolean;
  click: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-pressed={on} className={`choice ${on ? "on" : ""}`} onClick={click}>
      {on ? "✓ " : "○ "}
      {children}
    </button>
  );
}
export function Progress({ n }: { n: number }) {
  return (
    <div className="progress">
      <span style={{ width: `${(n / 3) * 100}%` }} />
    </div>
  );
}
export function Bottom({ onClick }: { onClick: () => void }) {
  return (
    <button className="primary bottom" onClick={onClick}>
      다음
    </button>
  );
}
export function Section({
  t,
  action,
  children,
  className = '',
}: {
  t: string;
  action?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`section ${className}`}>
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
export function Status({ v }: { v: string }) {
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
export function Warning({ w }: { w: any }) {
  return (
    <div className={`warning ${w.level.toLowerCase()}`}>
      <b>{w.title}</b>
      <p>{w.message}</p>
      <small>
        {({CHECK_NOW:'지금 확인', CURRENT_STEP:'현재 단계', LATER_STEP:'이후 단계', DEADLINE_RISK:'기한 위험', MISSING_INFO:'정보 누락'} as Record<string,string>)[w.category] || w.category} · {({LOW:'낮음', MEDIUM:'보통', HIGH:'높음', CRITICAL:'매우 높음'} as Record<string,string>)[w.level] || w.level}
      </small>
    </div>
  );
}
export function Metric({
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
export function Banner({ children }: { children: ReactNode }) {
  return <div className="banner">{children}</div>;
}
export function Disclaimer() {
  return <p className="disclaimer">{legal}</p>;
}
export function Error({ children }: { children: ReactNode }) {
  return <p className="error" role="alert">{children}</p>;
}
export function Loading() {
  return <p className="loading">불러오는 중...</p>;
}
export function Empty({
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
export function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
