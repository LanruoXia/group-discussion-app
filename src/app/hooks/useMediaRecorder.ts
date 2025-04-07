// src/hooks/useMediaRecorder.ts
import { useRef, useState } from "react";

export function useMediaRecorder(onDataAvailable: (blob: Blob) => void) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      setMediaStream(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          onDataAvailable(event.data);
        }
      };

      mediaRecorder.start();
      setRecording(true);
      console.log("🎙️ MediaRecorder started");
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaStream?.getTracks().forEach((track) => track.stop());
    setRecording(false);
    console.log("🛑 MediaRecorder stopped");
  };

  return { startRecording, stopRecording, recording };
}