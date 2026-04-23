# 브랜드 KPI — 매체 추가 시 예산 동시 입력 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매체 추가 폼에서 예산을 한 번에 입력하고, 확장 패널은 금액만 수정하도록 간소화해 매체 기간 = 예산 기간으로 일원화한다.

**Architecture:** 단일 React 클라이언트 컴포넌트(`BrandKpiManager`)의 상태/폼/저장 플로우를 수정한다. 스키마 변경은 없고, 예산 API에서 `total_budget = 0` 을 허용하도록 가드 한 줄만 고친다. 다른 관리자 화면(`/admin/campaigns/[id]/budget` 등)은 손대지 않는다.

**Tech Stack:** Next.js 15 App Router, React client component, Supabase JS client (`createClient`), Tailwind/CSS 변수 기반 디자인 토큰. 테스트 프레임워크가 레포에 없으므로 **수동 브라우저 검증**을 사용한다.

**참조 스펙:** `docs/superpowers/specs/2026-04-23-brand-kpi-add-budget-design.md`

---

## File Structure

- **Modify** `src/app/api/admin/budget/route.ts` — POST 핸들러의 falsy 체크가 `total_budget = 0` 을 잘못 거부하는 문제 수정.
- **Modify** `src/components/admin/BrandKpiManager.tsx` — 유일한 UI 변경 대상.
  - `campaignForm` 상태에 `total_budget` 추가
  - `budgetForm` 타입에서 `period_start`/`period_end` 제거, `total_budget` 만 남김
  - `addCampaign()` 에 budget 저장 로직 병합 + 검증 확장
  - `toggleExpand()` 초기화 로직 간소화
  - `saveBudget()` 가 campaign 행의 `start_date`/`end_date` 를 period로 사용
  - 확장 패널 JSX: 날짜 2개 제거, 금액 단일 필드만 남김
  - 매체 추가 폼 JSX: 예산 필드 한 행 추가
  - 부분 실패 시 리스트 상단 안내 배너 상태 추가 (`postAddNotice`)

---

## Task 1: Budget API 가 `total_budget = 0` 을 허용하도록 수정

**Files:**
- Modify: `src/app/api/admin/budget/route.ts:20`

이유: 현재 `if (!campaign_id || !period_start || !period_end || !total_budget)` 는 `0` 을 falsy로 잡아 "0원 예산" 입력을 차단한다. 스펙의 "0도 유효한 입력값" 규칙을 지키려면 `total_budget` 만 `null/undefined` 체크로 분리해야 한다.

- [ ] **Step 1.1: route.ts 수정**

`src/app/api/admin/budget/route.ts` 의 POST 핸들러(15~33라인)에서 검증부만 교체:

```ts
  const { campaign_id, period_start, period_end, total_budget } = await request.json()
  if (!campaign_id || !period_start || !period_end || total_budget === undefined || total_budget === null) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 })
  }
  const budgetNum = Number(total_budget)
  if (!Number.isFinite(budgetNum) || budgetNum < 0) {
    return NextResponse.json({ error: "total_budget은 0 이상의 숫자여야 합니다" }, { status: 400 })
  }
```

그리고 바로 아래 insert 의 `total_budget: Number(total_budget)` 를 `total_budget: budgetNum` 으로 치환.

- [ ] **Step 1.2: 타입/빌드 검증**

Run: `npx tsc --noEmit`
Expected: 오류 없음.

- [ ] **Step 1.3: 커밋**

```bash
git add src/app/api/admin/budget/route.ts
git commit -m "fix(admin/budget): allow total_budget=0 and reject negatives"
```

---

## Task 2: `campaignForm` 상태에 `total_budget` 필드 추가

**Files:**
- Modify: `src/components/admin/BrandKpiManager.tsx:44-50`

- [ ] **Step 2.1: 상태 변경**

`BrandKpiManager.tsx` 의 `campaignForm` useState 블록을 다음으로 교체 (라인 44~50 부근):

```tsx
  // 새 매체 폼
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    channel: "",
    start_date: "",
    end_date: "",
    total_budget: "",
  })
```

- [ ] **Step 2.2: 타입 검증**

Run: `npx tsc --noEmit`
Expected: 오류 없음.

- [ ] **Step 2.3: 커밋은 Task 3 이후 함께**

(폼 상태만 바꿔두고 아직 UI에 연결하지 않으므로 Task 3 과 같이 커밋)

---

## Task 3: 매체 추가 폼 JSX 에 예산 입력 필드 추가

**Files:**
- Modify: `src/components/admin/BrandKpiManager.tsx:225-268` (기존 `form-grid cols-4` 블록 바로 아래에 한 행 추가)

- [ ] **Step 3.1: 예산 입력 필드 JSX 추가**

`showNewCampaign && (...)` 블록 안에서 기존 `<div className="form-grid cols-4">...</div>` 닫는 `</div>` 바로 다음 줄(`{campaignError && ...}` 앞)에 다음을 삽입:

```tsx
          <div className="form-grid cols-1" style={{ marginTop: "0.75rem" }}>
            <div>
              <label className="form-label">예산 (원)</label>
              <input
                type="number"
                min={0}
                value={campaignForm.total_budget}
                onChange={(e) => setCampaignForm({ ...campaignForm, total_budget: e.target.value })}
                className="form-input"
                placeholder="선택 입력 · 예: 5000000"
              />
              <p style={{ fontSize: "0.7rem", color: "var(--dim)", marginTop: "0.25rem" }}>
                입력 시 종료일이 필수이며, 예산 기간은 매체 시작/종료일과 동일하게 저장됩니다.
              </p>
            </div>
          </div>
```

- [ ] **Step 3.2: 타입 검증**

Run: `npx tsc --noEmit`
Expected: 오류 없음.

- [ ] **Step 3.3: 커밋**

```bash
git add src/components/admin/BrandKpiManager.tsx
git commit -m "feat(brand-kpi): add optional budget input to new-campaign form"
```

---

## Task 4: `addCampaign()` 에 budget 생성 + 검증 로직 병합

**Files:**
- Modify: `src/components/admin/BrandKpiManager.tsx:95-126`

- [ ] **Step 4.1: 상단에 안내 배너 상태 추가**

`const [campaignError, setCampaignError] = useState("")` 바로 아래(라인 52 근처)에 추가:

```tsx
  const [postAddNotice, setPostAddNotice] = useState("")
```

- [ ] **Step 4.2: `addCampaign` 본문 교체**

기존 `async function addCampaign() { ... }` 전체(95~126라인)를 다음으로 교체:

```tsx
  // 매체 추가 (+ 옵션: 예산)
  async function addCampaign() {
    if (!campaignForm.channel || !campaignForm.name || !campaignForm.start_date) {
      setCampaignError("매체, 매체명, 시작일은 필수입니다.")
      return
    }

    const budgetRaw = campaignForm.total_budget.trim()
    const hasBudget = budgetRaw !== ""
    let budgetNum = 0
    if (hasBudget) {
      if (!campaignForm.end_date) {
        setCampaignError("예산 입력 시 종료일을 설정해주세요.")
        return
      }
      budgetNum = Number(budgetRaw.replace(/,/g, ""))
      if (!Number.isFinite(budgetNum) || budgetNum < 0) {
        setCampaignError("예산은 0 이상의 숫자로 입력해주세요.")
        return
      }
    }

    setCampaignSaving(true)
    setCampaignError("")
    setPostAddNotice("")

    const supabase = createClient()
    const { data: campaign, error: campaignErr } = await supabase
      .from("campaigns")
      .insert({
        brand_id: brandId,
        name: campaignForm.name,
        channel: campaignForm.channel,
        status: "active",
        start_date: campaignForm.start_date,
        end_date: campaignForm.end_date || null,
      })
      .select("id, name, channel, start_date, end_date")
      .single()

    if (campaignErr || !campaign) {
      setCampaignError(campaignErr?.message ?? "매체 생성에 실패했습니다.")
      setCampaignSaving(false)
      return
    }

    setCampaigns((prev) => [...prev, { ...campaign, kpiCount: 0 }])

    if (hasBudget) {
      const res = await fetch("/api/admin/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaign.id,
          period_start: campaign.start_date,
          period_end: campaign.end_date,
          total_budget: budgetNum,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setBudgets((prev) => [...prev, json])
      } else {
        setPostAddNotice(`매체는 추가되었지만 예산 저장에 실패했습니다: ${json.error ?? "알 수 없는 오류"}. 해당 매체 행을 펼쳐 다시 저장해주세요.`)
      }
    }

    setCampaignForm({ name: "", channel: "", start_date: "", end_date: "", total_budget: "" })
    setShowNewCampaign(false)
    router.refresh()
    setCampaignSaving(false)
  }
```

- [ ] **Step 4.3: 안내 배너 렌더링 추가**

`<div className="p-head" ...>` 블록과 `{showNewCampaign && (...` 사이(라인 220 근처)에 다음을 삽입:

```tsx
      {postAddNotice && (
        <div
          style={{
            padding: "0.625rem 1.25rem",
            background: "var(--bg-2)",
            borderBottom: "1px solid var(--line)",
            fontSize: "0.8rem",
            color: "var(--amber)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <span>{postAddNotice}</span>
          <button
            onClick={() => setPostAddNotice("")}
            className="btn"
            style={{ fontSize: "0.7rem" }}
          >
            닫기
          </button>
        </div>
      )}
```

- [ ] **Step 4.4: 타입/빌드 검증**

Run: `npx tsc --noEmit`
Expected: 오류 없음.

- [ ] **Step 4.5: 커밋**

```bash
git add src/components/admin/BrandKpiManager.tsx
git commit -m "feat(brand-kpi): save budget alongside campaign on add"
```

---

## Task 5: `budgetForm` 상태를 금액 단일 필드로 축소

**Files:**
- Modify: `src/components/admin/BrandKpiManager.tsx:55-62, 67-84`

- [ ] **Step 5.1: `budgetForm` 타입/초기값 축소**

기존:

```tsx
  // 예산 폼 (매체당 1개)
  const [budgetForm, setBudgetForm] = useState({
    period_start: "",
    period_end: "",
    total_budget: "",
  })
```

를 다음으로 교체:

```tsx
  // 예산 폼 (매체당 1개 · 금액만 편집, 기간은 매체 기간을 상속)
  const [budgetForm, setBudgetForm] = useState({
    total_budget: "",
  })
```

- [ ] **Step 5.2: `toggleExpand` 초기화 로직 간소화**

기존 `toggleExpand` 본문의 `if (existing) { setBudgetForm({...}) } else { setBudgetForm({...}) }` 블록을 다음으로 교체:

```tsx
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      setBudgetError("")
      const existing = getBudget(id)
      setBudgetForm({ total_budget: existing ? String(existing.total_budget) : "" })
    }
```

- [ ] **Step 5.3: 타입 검증 (다음 Task 와 함께 커밋)**

Run: `npx tsc --noEmit`
Expected: 다른 파일에서 `budgetForm.period_start` 등에 접근하는 곳이 있으면 오류. 같은 파일 내 JSX/함수는 Task 6 에서 정리하므로 여기서는 일시적으로 오류가 남을 수 있다. 이 단계에서는 **오류를 수정하지 않고** Task 6 로 진행해 한 번에 해소한다.

---

## Task 6: `saveBudget()` 및 확장 패널 JSX 간소화

**Files:**
- Modify: `src/components/admin/BrandKpiManager.tsx:144-199, 369-447` (확장 패널 블록)

- [ ] **Step 6.1: `saveBudget` 을 matching campaign 의 dates 를 사용하도록 변경**

기존 `async function saveBudget(campaignId: string) { ... }` 전체(144~182라인)를 다음으로 교체:

```tsx
  // 예산 저장 (기존 삭제 후 새로 삽입 · 기간은 매체 기간을 사용)
  async function saveBudget(campaignId: string) {
    const campaign = campaigns.find((c) => c.id === campaignId)
    if (!campaign) {
      setBudgetError("매체 정보를 찾을 수 없습니다.")
      return
    }
    if (!campaign.end_date) {
      setBudgetError("이 매체의 종료일을 먼저 설정해야 예산을 저장할 수 있습니다.")
      return
    }
    const raw = budgetForm.total_budget.trim()
    if (raw === "") {
      setBudgetError("예산을 입력해주세요.")
      return
    }
    const budgetNum = Number(raw.replace(/,/g, ""))
    if (!Number.isFinite(budgetNum) || budgetNum < 0) {
      setBudgetError("예산은 0 이상의 숫자로 입력해주세요.")
      return
    }
    setBudgetSaving(true)
    setBudgetError("")

    // 기존 예산 삭제
    const existing = getBudget(campaignId)
    if (existing) {
      await fetch("/api/admin/budget", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: existing.id }),
      })
    }

    // 새 예산 추가
    const res = await fetch("/api/admin/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_id: campaignId,
        period_start: campaign.start_date,
        period_end: campaign.end_date,
        total_budget: budgetNum,
      }),
    })

    const json = await res.json()
    if (res.ok) {
      setBudgets((prev) => [...prev.filter((b) => b.campaign_id !== campaignId), json])
      router.refresh()
    } else {
      setBudgetError(json.error ?? "저장 실패")
    }
    setBudgetSaving(false)
  }
```

- [ ] **Step 6.2: `deleteBudget` 의 `setBudgetForm` 초기화 수정**

`deleteBudget` 함수 안에서 `setBudgetForm({ period_start: "", period_end: "", total_budget: "" })` 를 다음으로 교체:

```tsx
      setBudgetForm({ total_budget: "" })
```

- [ ] **Step 6.3: 확장 패널 JSX 교체**

기존 `{isExpanded && (...)}` 블록(라인 369~447, "예산 설정" 영역과 "매체 삭제" 영역 포함) 내부에서 `{/* 예산 설정 */}` 하위 블록 전체를 다음으로 교체 ("매체 삭제" 블록은 그대로 유지):

```tsx
                    {/* 예산 설정 */}
                    <div>
                      <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-2)", marginBottom: "0.5rem" }}>
                        예산 설정
                        <span style={{ marginLeft: "0.5rem", color: "var(--dim)", fontWeight: 400 }}>
                          (기간: {c.start_date}{c.end_date ? ` ~ ${c.end_date}` : " ~ 종료일 미설정"} · 매체 기간 기준
                          {budget && ` · 현재 ${formatCurrency(budget.total_budget)}`})
                        </span>
                      </p>
                      {!c.end_date && (
                        <p style={{ fontSize: "0.75rem", color: "var(--amber)", marginBottom: "0.5rem" }}>
                          이 매체의 종료일을 먼저 설정해야 예산을 저장할 수 있습니다.
                        </p>
                      )}
                      <div className="form-grid cols-1">
                        <div>
                          <label className="form-label">예산 (원)</label>
                          <input
                            type="number"
                            min={0}
                            value={budgetForm.total_budget}
                            onChange={(e) => setBudgetForm({ total_budget: e.target.value })}
                            placeholder="5000000"
                            className="form-input"
                            disabled={!c.end_date}
                          />
                        </div>
                      </div>
                      {budgetError && <p className="form-error">{budgetError}</p>}
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <button
                          onClick={() => saveBudget(c.id)}
                          disabled={budgetSaving || !c.end_date}
                          className="btn primary"
                        >
                          {budgetSaving ? "저장 중..." : budget ? "예산 수정" : "예산 저장"}
                        </button>
                        {budget && (
                          <button
                            onClick={() => deleteBudget(c.id)}
                            className="btn"
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                          >
                            <Trash2 className="w-3 h-3" />
                            예산 삭제
                          </button>
                        )}
                      </div>
                    </div>
```

- [ ] **Step 6.4: 타입/빌드 검증**

Run: `npx tsc --noEmit`
Expected: 오류 없음 (Task 5에서 남겨둔 오류 포함 모두 해소).

- [ ] **Step 6.5: 커밋**

```bash
git add src/components/admin/BrandKpiManager.tsx
git commit -m "refactor(brand-kpi): unify media & budget period, simplify budget form"
```

---

## Task 7: 린트 / 프로덕션 빌드 검증

- [ ] **Step 7.1: ESLint**

Run: `npm run lint`
Expected: 0 errors. 기존 경고 수준 이상 증가 없음.

- [ ] **Step 7.2: Next.js build**

Run: `npm run build`
Expected: 성공. `/admin/brands/[id]` 경로(혹은 `BrandKpiManager` 가 사용되는 경로)가 깨지지 않음.

실패 시: 로그를 읽고 해당 Task 로 돌아가 수정 후 `npm run build` 재실행.

- [ ] **Step 7.3: 통과하면 여기서는 커밋 생성 불필요** (앞선 Task 커밋으로 충분).

---

## Task 8: 수동 브라우저 검증 (dev server)

자동 테스트 인프라가 없으므로 아래 시나리오를 브라우저에서 직접 확인한다.

- [ ] **Step 8.1: dev server 기동**

Run: `npm run dev`
브라우저에서 브랜드 KPI 페이지로 이동 (예: `/admin/brands/<brand-id>`).

- [ ] **Step 8.2: 시나리오 1 — 매체 + 예산 동시 생성**

"매체 추가" → 매체/매체명/시작일/종료일 + **예산 1,500,000** 입력 → "추가".
Expected:
- 폼이 닫히고 목록에 새 행이 생김.
- 우측 금액 컬럼에 `1,500,000원` (또는 포맷된 값) 표시. 오늘 날짜가 기간에 포함되면 하이라이트, 아니면 흐린 색.

- [ ] **Step 8.3: 시나리오 2 — 예산 생략**

"매체 추가" → 예산 필드만 비운 채 저장.
Expected: 매체만 생성, 우측에 "예산 미설정" 표시.

- [ ] **Step 8.4: 시나리오 3 — 예산 입력 + 종료일 누락**

예산 입력, 종료일 공란으로 "추가" 클릭.
Expected: `"예산 입력 시 종료일을 설정해주세요."` 에러, 저장되지 않음.

- [ ] **Step 8.5: 시나리오 4 — 음수/NaN**

예산 `-1` 입력 후 저장.
Expected: `"예산은 0 이상의 숫자로 입력해주세요."` 에러.

- [ ] **Step 8.6: 시나리오 5 — 0원 예산**

예산 `0` 입력 후 저장.
Expected: 매체 + 0원 budget 생성. API 레벨에서도 400이 반환되지 않음 (Task 1 검증).

- [ ] **Step 8.7: 시나리오 6 — 확장 패널에서 금액만 수정**

기존 매체 행 클릭 → 금액 필드만 노출됨. 새 금액 입력 → "예산 수정".
Expected: 저장 후 상단 안내문의 금액이 갱신됨. 기간은 매체 기간(`start_date ~ end_date`)을 유지.

- [ ] **Step 8.8: 시나리오 7 — 종료일 없는 매체**

종료일이 비어있는 기존 매체 행을 펼침.
Expected: 예산 입력 및 저장 버튼 **비활성**, `"이 매체의 종료일을 먼저 설정해야 예산을 저장할 수 있습니다."` 안내 표시.

- [ ] **Step 8.9: 시나리오 8 — 예산 삭제**

예산이 있는 매체에서 "예산 삭제".
Expected: 예산만 사라지고 매체는 유지. 목록 금액 컬럼이 "예산 미설정"으로 돌아감.

- [ ] **Step 8.10: 하나라도 실패 시**

실패한 시나리오에 해당하는 Task 로 돌아가 수정 후 `npm run dev` 재확인. 모든 시나리오 PASS 시 완료.

---

## 완료 조건

- Task 1~7 모두 커밋 완료, `npm run build` / `npm run lint` 통과.
- Task 8 의 시나리오 1~8 모두 수동 PASS.
- 브랜치에서 스펙(`docs/superpowers/specs/2026-04-23-brand-kpi-add-budget-design.md`)의 요구사항이 모두 구현되었는지 최종 점검.
