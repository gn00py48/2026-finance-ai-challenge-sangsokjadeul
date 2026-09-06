import type { Step } from './types';
export function deadline(s: Step) {
  return s.deadlineStatus === "NEEDS_CONFIRMATION"
    ? "기한 확인 필요"
    : s.dDay != null
      ? s.dDay < 0 ? `기한 ${Math.abs(s.dDay)}일 경과` : s.dDay === 0 ? 'D-DAY' : `D-${s.dDay}`
      : s.deadline || "참고 기한 없음";
}
export const itemLabels: Record<string, string> = { DEPOSIT: '예금', INSURANCE: '보험', STOCK: '주식', REAL_ESTATE: '부동산', LOAN: '대출', CARD_DEBT: '카드대금', TAX: '세금', OTHER: '기타' };
