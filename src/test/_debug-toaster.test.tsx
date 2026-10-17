import { act, render, waitFor, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toaster, toast } from "@/components/ui/sonner";

describe("debug sonner real timers", () => {
  it("success auto dismiss timing", async () => {
    render(<Toaster />);
    console.log("API>>>" + typeof (toast as any).getHistory + "|" + typeof (toast as any).getToasts);
    let id: any;
    act(() => {
      id = toast.success("HaloA");
    });
    const t0 = Date.now();
    await waitFor(() => expect(screen.getByText("HaloA")).toBeInTheDocument(), { timeout: 2000 });
    const tAppear = Date.now() - t0;
    await waitFor(() => expect(screen.queryByText("HaloA")).not.toBeInTheDocument(), { timeout: 4000 });
    const tGone = Date.now() - t0;
    console.log("TIMING>>>appear=" + tAppear + " gone=" + tGone);
    const hist = (toast as any).getHistory ? (toast as any).getHistory() : [];
    console.log("HIST>>>" + JSON.stringify(hist.map((h: any) => ({ id: h.id, type: h.type, duration: h.duration }))));
    console.log("ACTIVE>>>" + JSON.stringify((toast as any).getToasts ? (toast as any).getToasts().map((h: any) => ({ id: h.id, type: h.type, duration: h.duration })) : []));
    expect(true).toBe(true);
  });

  it("error duration via store", async () => {
    render(<Toaster />);
    act(() => {
      toast.error("GagalB");
    });
    await waitFor(() => expect(screen.getByText("GagalB")).toBeInTheDocument(), { timeout: 2000 });
    const hist = (toast as any).getHistory ? (toast as any).getHistory() : [];
    console.log("ERRHIST>>>" + JSON.stringify(hist.map((h: any) => ({ id: h.id, type: h.type, duration: h.duration }))));
    const t0 = Date.now();
    await waitFor(() => expect(screen.queryByText("GagalB")).not.toBeInTheDocument(), { timeout: 8000 });
    console.log("ERRGONE>>>" + (Date.now() - t0));
    expect(true).toBe(true);
  });
});
