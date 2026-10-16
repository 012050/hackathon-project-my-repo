/** 캠퍼스맵(public/campus-map.png, 1000×680) 위 건물 픽셀 좌표. 키는 건물 이름 */
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 680;

export type Point = { x: number; y: number };

export const GATE: Point = { x: 412, y: 595 };

const COORDS_BY_NAME: Record<string, Point> = {
  정문: GATE,
  대학본관: { x: 785, y: 65 },
  법정관: { x: 720, y: 68 },
  상경관: { x: 845, y: 73 },
  국제관: { x: 888, y: 113 },
  동의스포츠센터: { x: 700, y: 98 },
  상영관: { x: 688, y: 125 },
  수덕전: { x: 635, y: 157 },
  제1인문관: { x: 593, y: 117 },
  제2인문관: { x: 551, y: 145 },
  효민체육관: { x: 479, y: 171 },
  중앙도서관: { x: 573, y: 177 },
  성파글로벌관: { x: 694, y: 214 },
  제2효민생활관: { x: 779, y: 259 },
  의료보건관: { x: 662, y: 282 },
  생활과학관: { x: 621, y: 357 },
  음악관: { x: 556, y: 429 },
  창의관: { x: 469, y: 282 },
  지천관: { x: 459, y: 331 },
  산학협력관: { x: 356, y: 347 },
  건윤관: { x: 293, y: 419 },
  공학관: { x: 342, y: 290 },
  정보공학관: { x: 181, y: 398 },
  제1효민생활관: { x: 256, y: 160 },
  학생군사교육단: { x: 433, y: 133 },
  행복기숙사: { x: 717, y: 160 },
};

/** 다른 이름 → 지도에 있는 이름 */
const ALIASES: Record<string, string> = {
  학생회관: "수덕전",
  제2학생회관: "상영관",
};

const strip = (s: string) => s.replace(/[\s()（）[\]]/g, "");
const warned = new Set<string>();

/** 건물 이름으로 지도 좌표 찾기 (공백·괄호 무시). 못 찾으면 콘솔 경고 후 null */
export function coordsForName(name: string | null | undefined): Point | null {
  if (!name) return null;
  const candidates = [strip(name.replace(/\(.*?\)|（.*?）/g, "")), strip(name)];
  for (const c of candidates) {
    const key = ALIASES[c] ?? c;
    if (COORDS_BY_NAME[key]) return COORDS_BY_NAME[key];
  }
  if (!warned.has(name)) {
    warned.add(name);
    console.warn(`[CampusMap] 지도 좌표가 없는 건물 이름: "${name}"`);
  }
  return null;
}
