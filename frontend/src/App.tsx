import { useState } from 'react'

export default function App() {
  const [notice, setNotice] = useState('')
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col border-x border-[#ccc] bg-white">
      <main className="flex-1 px-4 pt-[84px] pb-5">
        <div aria-hidden="true" className="mb-[14px] size-[52px] rounded-[13px] bg-[#e0e0e0]" />
        <h1 className="text-[21px] leading-[1.4] font-bold">상속, 무엇부터 할지<br />알려드립니다</h1>
        <p className="mt-[14px] text-xs leading-normal text-neutral-500">AI가 필요한 절차만 골라 순서대로 안내합니다</p>
        <form className="mt-[42px] space-y-[14px]" onSubmit={(event) => {
          event.preventDefault()
          setNotice('로그인 기능은 준비 중입니다. 입력한 정보는 전송하거나 저장하지 않습니다.')
        }}>
          <label className="block text-[11px] leading-[1.5] font-medium text-[#737373]">아이디
            <input name="username" autoComplete="username" required placeholder="아이디를 입력하세요" className="mt-1.5 h-11 w-full rounded-lg border border-[#d9d9d9] bg-[#f9f9f9] px-3 text-xs font-normal text-[#333] placeholder:text-[#9e9e9e]" />
          </label>
          <label className="block text-[11px] leading-[1.5] font-medium text-[#737373]">비밀번호
            <input name="password" type="password" autoComplete="current-password" required placeholder="비밀번호를 입력하세요" className="mt-1.5 h-11 w-full rounded-lg border border-[#d9d9d9] bg-[#f9f9f9] px-3 text-xs font-normal text-[#333] placeholder:text-[#9e9e9e]" />
          </label>
          <button className="h-[46px] w-full rounded-lg bg-[#2e2e2e] text-[13px] font-medium text-white hover:bg-neutral-700" type="submit">로그인</button>
        </form>
        <div className="mt-[14px] text-center">
          <button type="button" className="min-h-11 text-[11px] font-medium text-[#595959] underline-offset-4 hover:underline" onClick={() => setNotice('회원가입 기능은 준비 중입니다.')}>회원가입</button>
        </div>
        <p role="status" className="mt-4 text-xs leading-relaxed text-neutral-600">{notice}</p>
      </main>
      <footer className="px-4 pt-3 pb-[22px]">
        <p className="rounded-[10px] bg-[#f6f6f6] px-[14px] py-3 text-[10px] leading-[1.6] text-[#7a7a7a]">본 서비스는 문서 정보 정리와 절차 안내를 제공하며,<br />상속포기·한정승인 등 법률·세무 결론은 확정하지 않습니다.</p>
      </footer>
    </div>
  )
}
