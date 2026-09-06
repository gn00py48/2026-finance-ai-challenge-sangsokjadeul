import type { Step } from './types';
export function deadline(s: Step) {
  return s.deadlineStatus === "NEEDS_CONFIRMATION"
    ? "기한 확인 필요"
    : s.dDay != null
      ? s.dDay < 0 ? `기한 ${Math.abs(s.dDay)}일 경과` : s.dDay === 0 ? 'D-DAY' : `D-${s.dDay}`
      : s.deadline || "참고 기한 없음";
}
export const itemLabels: Record<string, string> = { DEPOSIT: '예금', INSURANCE: '보험', STOCK: '주식', REAL_ESTATE: '부동산', LOAN: '대출', CARD_DEBT: '카드대금', TAX: '세금', OTHER: '기타' };

const maskDigitsExceptLast = (value: string, visible = 4) => {
  let remaining = Math.max(0, [...value].filter(c => /\d/.test(c)).length - visible);
  return [...value].map(c => /\d/.test(c) && remaining-- > 0 ? '*' : c).join('');
};

/** 카드·전화·계좌·주민등록번호가 일반 화면에 그대로 노출되지 않게 한다. 편집 폼의 원본 값은 변경하지 않는다. */
export function maskSensitiveText(value?: string | null) {
  if (!value) return value || '';
  return value
    .replace(/\b(\d{6})[-\s]?([1-8]\d{6})\b/g, '$1-*******')
    .replace(/\b(\d{4})[-\s](\d{4})[-\s](\d{4})[-\s](\d{4})\b/g, '$1-****-****-$4')
    .replace(/\b(01\d)[-\s](\d{3,4})[-\s](\d{4})\b/g, '$1-****-$3')
    .replace(/(계좌(?:번호)?\s*[:：]?\s*)(\d[\d\s-]{5,}\d)/g, (_, label: string, number: string) => label + maskDigitsExceptLast(number));
}
