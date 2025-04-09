// src/hooks/useMediaRecorder.ts
import { useRef, useState } from "react";
export function useMediaRecorder(onDataAvailable: (blob: Blob, startTime: number | null) => void) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const startTimeRef = useRef<number | null>(null); // 💡 新增

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      setMediaStream(stream);

      const startTime = Date.now();
      startTimeRef.current = startTime;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          onDataAvailable(event.data, startTimeRef.current);
        }
      };

      mediaRecorder.start();
      setRecording(true);
      console.log("🎙️ MediaRecorder started at", startTime);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = async () => {
    mediaRecorderRef.current?.stop();
    mediaStream?.getTracks().forEach((track) => track.stop());
    setRecording(false);
    console.log("🛑 MediaRecorder stopped");
  };

  return { startRecording, stopRecording, recording };
}