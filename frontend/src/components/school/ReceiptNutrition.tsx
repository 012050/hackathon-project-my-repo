import { useEffect, useRef, useState } from "react";
import { ApiError, addMeal, menuLights, today } from "@/lib/api";
import type { Nutrition } from "@/lib/types";
import { LIGHT_LABELS, NUTRIENTS } from "./labels";

// ---------- POST /api/receipt/nutrition (api.ts 를 건드리지 않으려고 여기에 둠, 형식은 api.ts 와 같게) ----------
interface ReceiptItem extends Partial<Nutrition> {
  name: string;
  qty: number;
  price?: number | null;
  estimated: boolean;
  found: boolean;
}

interface ReceiptNutritionResponse {
  storeType: "convenience" | "grocery" | "unknown";
  items: ReceiptItem[];
  total: Nutrition;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function uploadReceiptNutrition(file: File): Promise<ReceiptNutritionResponse> {
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/receipt/nutrition`, { method: "POST", body: form });
  } catch {
    throw new ApiError("network_error", "서버가 꺼져 있어요. 백엔드가 실행 중인지 확인해 주세요.", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(err?.code ?? "http_error", err?.message ?? `요청에 실패했어요 (${res.status})`, res.status);
  }
  return body as ReceiptNutritionResponse;
}

const errorText = (e: unknown) => (e instanceof ApiError ? e.message : String(e));
const fmt = (n: number) => Math.round(n).toLocaleString();

function ItemCard({ item }: { item: ReceiptItem }) {
  const head = (
    <div className="school-menu-head">
      <span className="school-menu-name">
        {item.name}
        {item.qty !== 1 && <span className="muted"> × {item.qty}</span>}
        {item.found && item.estimated && <span className="school-badge">추정</span>}
      </span>
      {item.price != null && <span className="muted">{item.price.toLocaleString()}원</span>}
    </div>
  );
  if (!item.found) {
    return (
      <div className="school-menu school-receipt-missing">
        {head}
        <div className="muted">영양 정보 없음 (기록에서 제외)</div>
      </div>
    );
  }
  const n = item as ReceiptItem & Nutrition;
  const lights = menuLights(n);
  return (
    <div className="school-menu">
      {head}
      <ul className="school-nutrients">
        {NUTRIENTS.map(({ key, label, unit }) => (
          <li key={key} title={LIGHT_LABELS[lights[key]]}>
            <span className={`school-dot dot-${lights[key]}`} />
            {label} {fmt(n[key])}
            {unit}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ReceiptNutrition({
  time,
  onRecorded,
}: {
  time: string;
  onRecorded: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ReceiptNutritionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // AI 인식은 7초 안팎 걸리므로 기다리는 동안 경과 시간을 보여줌
  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(id);
  }, [loading]);

  const onFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      setResult(await uploadReceiptNutrition(file));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const eatAll = async () => {
    if (!result) return;
    const eaten = result.items.filter((i) => i.found);
    setSaving(true);
    setError(null);
    try {
      for (const item of eaten) {
        await addMeal({
          date: today(),
          time: /^\d{2}:\d{2}$/.test(time) ? time : "12:00",
          menu: {
            name: item.qty !== 1 ? `${item.name} ×${item.qty}` : item.name,
            source: "school",
            price: item.price ?? undefined,
            kcal: item.kcal ?? 0,
            carb: item.carb ?? 0,
            protein: item.protein ?? 0,
            fat: item.fat ?? 0,
            sodium: item.sodium ?? 0,
            estimated: item.estimated,
          },
        });
      }
      setSaved(true);
      onRecorded(`영수증 상품 ${eaten.length}개를 기록했어요`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  const foundCount = result?.items.filter((i) => i.found).length ?? 0;

  return (
    <div className="card school-receipt">
      <h3>편의점 영수증</h3>
      <div className="muted">편의점에서 산 걸 찍으면 상품별 영양소를 바로 보여줘요.</div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
        }}
      />
      <button className="btn" disabled={loading || saving} onClick={() => inputRef.current?.click()}>
        {loading ? "읽는 중..." : "편의점 영수증 찍기"}
      </button>

      {loading && (
        <div className="school-receipt-loading" role="status">
          <span className="school-spinner" aria-hidden="true" />
          영수증 읽는 중... {elapsed}초 <span className="muted">(보통 7초 정도 걸려요)</span>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {result?.storeType === "grocery" && (
        <div className="school-receipt-notice">마트 영수증은 집 탭에서 메뉴 추천을 받아보세요.</div>
      )}
      {result && result.storeType !== "grocery" && result.items.length === 0 && (
        <div className="school-receipt-notice">영수증에서 상품을 찾지 못했어요.</div>
      )}

      {result && result.storeType !== "grocery" && result.items.length > 0 && (
        <>
          {result.items.map((item, i) => (
            <ItemCard key={`${item.name}-${i}`} item={item} />
          ))}
          <div className="school-receipt-total">
            합계 {fmt(result.total.kcal)}kcal · 탄 {fmt(result.total.carb)}g · 단 {fmt(result.total.protein)}g · 지{" "}
            {fmt(result.total.fat)}g · 나트륨 {fmt(result.total.sodium)}mg
          </div>
          <button className="btn" disabled={saving || saved || foundCount === 0} onClick={() => void eatAll()}>
            {saved ? "기록했어요" : saving ? "기록 중..." : `다 먹었어요 (${foundCount}개)`}
          </button>
        </>
      )}
    </div>
  );
}
