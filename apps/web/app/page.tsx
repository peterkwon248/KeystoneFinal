// 루트 — 기본 뷰(플랜)로 리다이렉트. 인증/온보딩 가드는 (shell) 레이아웃이 담당.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/plans");
}
