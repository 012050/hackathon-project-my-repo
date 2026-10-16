import type { Nutrition } from "@/lib/types";

export type PresetTag = "학식" | "편의점" | "집밥";

export interface Preset extends Nutrition {
  id: string;
  name: string;
  tag: PresetTag;
  desc: string;
}

/** 미리 정한 식단 (1인분, 일반적인 값으로 추정). 가벼운 ~450 / 보통 450~750 / 든든 750~ */
export const PRESETS: Preset[] = [
  // 가벼운
  { id: "p01", name: "편의점 삶은계란 2 + 바나나 + 우유", tag: "편의점", kcal: 370, carb: 37, protein: 20, fat: 17, sodium: 380, desc: "빠르게 단백질 채우기, 나트륨 적음" },
  { id: "p02", name: "닭가슴살 샐러드 + 고구마", tag: "편의점", kcal: 410, carb: 50, protein: 32, fat: 9, sodium: 650, desc: "고단백·저지방, 공강 짧을 때" },
  { id: "p03", name: "그릭요거트 + 견과류 + 바나나", tag: "편의점", kcal: 380, carb: 45, protein: 18, fat: 15, sodium: 120, desc: "나트륨 거의 없는 간식 겸 한 끼" },
  { id: "p04", name: "두부 샐러드 + 현미 주먹밥", tag: "편의점", kcal: 430, carb: 58, protein: 20, fat: 13, sodium: 620, desc: "식물성 단백질, 가볍게" },
  { id: "p05", name: "프로틴음료 + 참치 삼각김밥", tag: "편의점", kcal: 330, carb: 40, protein: 27, fat: 7, sodium: 600, desc: "단백질 보충이 급할 때" },
  { id: "p06", name: "계란 2 + 토마토 + 통밀빵", tag: "집밥", kcal: 400, carb: 42, protein: 20, fat: 15, sodium: 450, desc: "아침·간단 저녁용" },
  { id: "p07", name: "연두부 + 김 + 잡곡밥 반 공기", tag: "집밥", kcal: 360, carb: 50, protein: 16, fat: 10, sodium: 520, desc: "속 편하고 가벼운 한 끼" },
  // 보통
  { id: "p08", name: "두부계란덮밥", tag: "집밥", kcal: 520, carb: 68, protein: 24, fat: 15, sodium: 780, desc: "냉장고 재료로 15분" },
  { id: "p09", name: "비빔밥 (국물 X)", tag: "학식", kcal: 600, carb: 90, protein: 18, fat: 16, sodium: 850, desc: "채소 많고 국물 없이 나트륨 줄이기" },
  { id: "p10", name: "닭가슴살 볶음밥", tag: "집밥", kcal: 560, carb: 70, protein: 35, fat: 14, sodium: 700, desc: "고단백 한 그릇" },
  { id: "p11", name: "생선구이 백반 (국 반만)", tag: "학식", kcal: 650, carb: 85, protein: 32, fat: 18, sodium: 900, desc: "단백질·지방 균형, 국은 반만" },
  { id: "p12", name: "닭가슴살 도시락", tag: "편의점", kcal: 550, carb: 70, protein: 33, fat: 12, sodium: 950, desc: "편의점 중 단백질 많은 도시락" },
  { id: "p13", name: "연어 포케", tag: "학식", kcal: 600, carb: 72, protein: 28, fat: 20, sodium: 700, desc: "좋은 지방 + 단백질" },
  { id: "p14", name: "참치김밥 + 삶은계란", tag: "편의점", kcal: 560, carb: 72, protein: 24, fat: 18, sodium: 1050, desc: "간편하지만 단백질 보강" },
  { id: "p15", name: "소고기 불고기 정식", tag: "학식", kcal: 720, carb: 88, protein: 35, fat: 22, sodium: 950, desc: "든든한 단백질 학식" },
  // 든든
  { id: "p16", name: "제육덮밥", tag: "학식", kcal: 800, carb: 105, protein: 30, fat: 26, sodium: 1400, desc: "든든하지만 나트륨 주의" },
  { id: "p17", name: "치킨마요덮밥", tag: "학식", kcal: 850, carb: 110, protein: 28, fat: 32, sodium: 1300, desc: "칼로리 높음, 운동한 날" },
  { id: "p18", name: "돈까스 정식 (소스 반만)", tag: "학식", kcal: 900, carb: 100, protein: 32, fat: 38, sodium: 1200, desc: "소스를 반만 쓰면 나트륨↓" },
  { id: "p19", name: "닭가슴살 현미 도시락 곱빼기", tag: "집밥", kcal: 780, carb: 100, protein: 50, fat: 16, sodium: 800, desc: "든든하면서 고단백·저나트륨" },
  { id: "p20", name: "소고기 미역국 정식", tag: "학식", kcal: 760, carb: 98, protein: 34, fat: 22, sodium: 1500, desc: "국물은 건더기 위주로" },
  { id: "p21", name: "짜장면 + 군만두", tag: "학식", kcal: 1000, carb: 140, protein: 28, fat: 35, sodium: 2400, desc: "가끔만, 나트륨 매우 높음" },
];
