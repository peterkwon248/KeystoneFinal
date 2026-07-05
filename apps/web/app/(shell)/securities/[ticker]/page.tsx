// 종목 상세 (screens/19·19b·21·22) — SecurityDetail 이식.
// 데이터 준비는 loadSecurityDetail(lib/security-detail-data)로 공유(SecurityPeek 서버액션과 동일 로더).
import { notFound } from "next/navigation";
import { SecurityDetailScreen } from "@/components/securities/security-detail";
import { loadSecurityDetail } from "@/lib/security-detail-data";

export default async function SecurityDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const data = await loadSecurityDetail(ticker);
  if (!data) notFound();
  return <SecurityDetailScreen {...data} />;
}
