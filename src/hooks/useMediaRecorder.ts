import { useRef, useState, useCallback, useEffect } from "react";
import { EXAM_AUDIO_BITS_PER_SECOND } from "@/lib/examPerformance";

interface UseMediaRecorderReturn {
  isRecording: boolean;
  chunkCount: number;
  recordedBytes: number;
  error: string | null;
  start: (stream: MediaStream) => void;
  stop: () => Promise<Blob | null>;
}

const useMediaRecorder = (): UseMediaRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [chunkCount, setChunkCount] = useState(0);
  const [recordedBytes, setRecordedBytes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopPromiseRef = useRef<Promise<Blob | null> | null>(null);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      // Preserve an already requested stop callback so submission can finish.
      if (recorder.state !== "inactive") recorder.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
    stopPromiseRef.current = null;
  }, []);

  const start = useCallback((stream: MediaStream) => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") return;
    chunksRef.current = [];
    stopPromiseRef.current = null;
    setChunkCount(0);
    setRecordedBytes(0);
    setError(null);

    try {
      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
      const isSafari = isIOS || (/Safari/.test(ua) && !/Chrome|Chromium|CriOS|Android/.test(ua));

      const mimeType = isSafari
        ? MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : ""
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, {
          ...(mimeType ? { mimeType } : {}),
          audioBitsPerSecond: EXAM_AUDIO_BITS_PER_SECOND,
        });
      } catch {
        // Older Safari versions can reject bitrate options.
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          setChunkCount((c) => c + 1);
          setRecordedBytes((b) => b + e.data.size);
        }
      };

      recorder.onerror = () => {
        setError("Perekaman audio bermasalah.");
      };

      // Safari's timeslice mode produces empty/broken MP4 chunks — record as one piece.
      if (isSafari) recorder.start();
      else recorder.start(3000); // 3s chunks
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("MediaRecorder start failed:", err);
      setError("Perangkat tidak dapat merekam audio.");
      setIsRecording(false);
    }
  }, []);

  const stop = useCallback((): Promise<Blob | null> => {
    if (stopPromiseRef.current) return stopPromiseRef.current;
    const promise = new Promise<Blob | null>((resolve) => {
      const recorder = recorderRef.current;
      const buildBlob = () => {
        const blob = chunksRef.current.length > 0
          ? new Blob(chunksRef.current, { type: chunksRef.current[0].type || "audio/webm" })
          : null;
        chunksRef.current = [];
        if (recorder) {
          recorder.ondataavailable = null;
          recorder.onerror = null;
          recorder.onstop = null;
        }
        recorderRef.current = null;
        return blob;
      };

      if (!recorder || recorder.state === "inactive") {
        setIsRecording(false);
        resolve(buildBlob());
        return;
      }

      recorder.onstop = () => {
        setIsRecording(false);
        recorderRef.current = null;
        resolve(buildBlob());
      };

      try {
        recorder.stop();
      } catch {
        setIsRecording(false);
        resolve(buildBlob());
      }
    });
    stopPromiseRef.current = promise;
    void promise.then(() => { if (stopPromiseRef.current === promise) stopPromiseRef.current = null; });
    return promise;
  }, []);

  return { isRecording, chunkCount, recordedBytes, error, start, stop };
};

export default useMediaRecorder;
