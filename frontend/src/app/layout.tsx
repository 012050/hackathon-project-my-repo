import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "자취생 하루 영양 채우기",
  description: "영수증 재료로 집 메뉴, 공강·동선으로 학교 메뉴",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
