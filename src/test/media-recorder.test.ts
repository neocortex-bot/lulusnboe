import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useMediaRecorder from "@/hooks/useMediaRecorder";

class Recorder {
  static isTypeSupported = () => true;
  static instances: Recorder[] = [];
  state = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror = null;
  start = vi.fn(() => { this.state = "recording"; });
  stop = vi.fn(() => {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["final"], { type: "audio/mp4" }) });
    this.onstop?.();
  });
  constructor(_stream: MediaStream, public options?: MediaRecorderOptions) { Recorder.instances.push(this); }
}
beforeEach(() => { Recorder.instances = []; vi.stubGlobal("MediaRecorder", Recorder); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("recorder lifecycle", () => {
  it("uses MP4 without timeslice on iPhone", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1");
    const { result } = renderHook(() => useMediaRecorder());
    act(() => result.current.start({} as MediaStream));
    const recorder = Recorder.instances[0];
    expect(recorder.options?.mimeType).toBe("audio/mp4");
    expect(recorder.start).toHaveBeenCalledWith();
    await act(async () => { expect((await result.current.stop())?.size).toBe(5); });
    expect(result.current.error).toBeNull();
  });
  it("falls back to native Safari settings when bitrate options are rejected", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Safari/604.1");
    const attempts: (MediaRecorderOptions | undefined)[] = [];
    class SafariRecorder extends Recorder {
      constructor(stream: MediaStream, options?: MediaRecorderOptions) {
        attempts.push(options);
        if (options?.audioBitsPerSecond) throw new Error("Unsupported bitrate option");
        super(stream, options);
      }
    }
    vi.stubGlobal("MediaRecorder", SafariRecorder);
    const { result } = renderHook(() => useMediaRecorder());
    act(() => result.current.start({} as MediaStream));
    expect(attempts).toEqual([{ mimeType: "audio/mp4", audioBitsPerSecond: 32000 }, { mimeType: "audio/mp4" }]);
    expect(Recorder.instances[0].start).toHaveBeenCalledWith();
    await act(async () => { expect((await result.current.stop())?.size).toBe(5); });
    expect(result.current.error).toBeNull();
  });
  it("records at 32 kbps, includes final bytes, and releases chunks after stop", async () => {
    const { result } = renderHook(() => useMediaRecorder());
    act(() => result.current.start({} as MediaStream));
    const recorder = Recorder.instances[0];
    expect(recorder.options?.audioBitsPerSecond).toBe(32000);
    act(() => recorder.ondataavailable?.({ data: new Blob(["first"]) }));
    let blob: Blob | null = null;
    await act(async () => { blob = await result.current.stop(); });
    expect(blob?.size).toBe(10);
    expect(recorder.ondataavailable).toBeNull();
    await act(async () => { expect(await result.current.stop()).toBeNull(); });
  });
  it("stops an abandoned recorder on unmount without stopping shared microphone tracks", () => {
    const trackStop = vi.fn();
    const { result, unmount } = renderHook(() => useMediaRecorder());
    act(() => result.current.start({ getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream));
    const recorder = Recorder.instances[0];
    unmount();
    expect(recorder.stop).toHaveBeenCalledTimes(1);
    expect(trackStop).not.toHaveBeenCalled();
    expect(recorder.ondataavailable).toBeNull();
  });
});