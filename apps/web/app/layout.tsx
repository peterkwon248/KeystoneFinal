import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keystone — 투자 트래킹 워크스페이스",
  description: "시나리오·전략·체결을 한 곳에서. 가격이 아니라 당신의 판단을 추적하는 투자 워크스페이스.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
