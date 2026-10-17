import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useToast } from "@/hooks/use-toast";
import { TOAST_AUTO_DISMISS_MS, TOAST_ERROR_DISMISS_MS, toastDurationFor } from "@/lib/toastTiming";
import { Toaster as LegacyToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster, toast as sonnerToast } from "@/components/ui/sonner";

describe("auto-dismiss notifikasi", () => {
  it("pesan biasa hilang dalam 1,5 detik, error lebih lama", () => {
    expect(toastDurationFor()).toBe(1500);
    expect(toastDurationFor("default")).toBe(1500);
    expect(toastDurationFor("destructive")).toBe(4000);
    expect(TOAST_AUTO_DISMISS_MS).toBe(1500);
    expect(TOAST_ERROR_DISMISS_MS).toBe(4000);
  });

  it("toast hook lama memasang durasi hilang otomatis", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: "Soal dipublikasikan" });
    });
    expect(result.current.toasts[0].duration).toBe(1500);

    act(() => {
      result.current.toast({ title: "Gagal menyimpan", variant: "destructive" });
    });
    expect(result.current.toasts[0].duration).toBe(4000);
  });

  it("area notifikasi lama tidak menangkap klik, hanya kartu toast-nya", () => {
    const { result } = renderHook(() => useToast());
    render(<LegacyToaster />);

    act(() => {
      result.current.toast({ title: "Draft tersimpan" });
    });

    const viewport = document.querySelector('[role="region"] ol');
    const card = document.querySelector('li[role="status"]');
    expect(viewport).not.toBeNull();
    expect(card).not.toBeNull();
    expect(viewport!.className).toContain("pointer-events-none");
    expect(card!.className).toContain("pointer-events-auto");
  });

  it("notifikasi sonner hilang sendiri dalam 1,5 detik", async () => {
    render(<SonnerToaster />);
    const t0 = Date.now();

    act(() => {
      sonnerToast.success("Soal dipublikasikan");
    });
    await waitFor(() => expect(screen.getByText("Soal dipublikasikan")).toBeInTheDocument());
    await waitFor(
      () => expect(screen.queryByText("Soal dipublikasikan")).not.toBeInTheDocument(),
      { timeout: 3000 },
    );

    const elapsed = Date.now() - t0;
    expect(elapsed).toBeGreaterThan(1000);
    expect(elapsed).toBeLessThan(2600);
  });

  it("pesan error sonner masih bisa dibaca sebelum hilang", async () => {
    render(<SonnerToaster />);

    act(() => {
      sonnerToast.error("Gagal menyimpan soal");
    });
    await waitFor(() => expect(screen.getByText("Gagal menyimpan soal")).toBeInTheDocument());

    await new Promise((resolve) => setTimeout(resolve, TOAST_AUTO_DISMISS_MS + 200));
    expect(screen.getByText("Gagal menyimpan soal")).toBeInTheDocument();

    await waitFor(
      () => expect(screen.queryByText("Gagal menyimpan soal")).not.toBeInTheDocument(),
      { timeout: TOAST_ERROR_DISMISS_MS + 1500 },
    );
  });
});
