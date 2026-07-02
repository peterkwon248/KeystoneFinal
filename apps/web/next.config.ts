import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @keystone/core는 소스(TS) 배포 — Next가 직접 트랜스파일
  transpilePackages: ["@keystone/core"],
};

export default nextConfig;
