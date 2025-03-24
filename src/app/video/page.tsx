import dynamic from "next/dynamic";

const VideoClient = dynamic(() => import("../components/VideoClient"), {
  ssr: false,
});

export default function VideoPage() {
  return <VideoClient />;
}
