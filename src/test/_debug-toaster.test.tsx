import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { toast as sonnerToast } from "@/components/ui/sonner";
import { Toaster as LegacyToaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

describe("debug toaster", () => {
  it("sonner without fake timers", () => {
    render(<Toaster />);
    act(() => {
      sonnerToast.success("HaloA");
    });
    console.log("NOFAKE>>>" + document.body.innerHTML.slice(0, 400));
    expect(true).toBe(true);
  });

  it("sonner with fake timers", () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      sonnerToast.success("HaloB");
    });
    console.log("FAKE>>>" + document.body.innerHTML.slice(0, 400));
    vi.advanceTimersByTime(1600);
    console.log("FAKE_AFTER>>>" + document.body.innerHTML.slice(0, 400));
    vi.useRealTimers();
    expect(true).toBe(true);
  });

  it("legacy viewport html", () => {
    const { result } = renderHookLegacy();
    render(<LegacyToaster />);
    act(() => {
      result.current.toast({ title: "Draft tersimpan" });
    });
    console.log("LEGACY>>>" + document.body.innerHTML.slice(0, 600));
    expect(true).toBe(true);
  });
});

function renderHookLegacy() {
  // minimal inline hook runner
  let out: any;
  const { renderHook } = require("@testing-library/react");
  out = renderHook(() => useToast());
  return out;
}
