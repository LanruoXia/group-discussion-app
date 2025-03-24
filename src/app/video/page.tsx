"use client";

import dynamic from "next/dynamic";

// ✅ 禁用 SSR：让组件只在客户端渲染，避免触发 window 报错
const VideoClient = dynamic(() => import("../components/VideoClient"), {
  ssr: false,
});

export default function Page() {
  return <VideoClient />;
}
