import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  it("toast hook lama memasang durasi otomatis", () => {
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

  it("toast hook lama tidak menutupi tombol di bawahnya", () => {
    const { result } = renderHook(() => useToast());
    render(<LegacyToaster />);

    act(() => {
      result.current.toast({ title: "Draft tersimpan" });
    });

    const viewport = document.querySelector("ol[data-sonner-toaster], [role='region'], ol");
    expect(viewport).not.toBeNull();
    expect(viewport!.className).toContain("pointer-events-none");
  });

  describe("sonner", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("notifikasi berhasil hilang sendiri setelah 1,5 detik", () => {
      render(<SonnerToaster />);

      act(() => {
        sonnerToast.success("Soal dipublikasikan");
      });
      expect(screen.getByText("Soal dipublikasikan")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(TOAST_AUTO_DISMISS_MS + 100);
      });
      expect(screen.queryByText("Soal dipublikasikan")).not.toBeInTheDocument();
    });

    it("error masih tampil setelah 1,5 detik dan hilang di 4 detik", () => {
      render(<SonnerToaster />);

      act(() => {
        sonnerToast.error("Gagal menyimpan");
      });

      act(() => {
        vi.advanceTimersByTime(TOAST_AUTO_DISMISS_MS + 100);
      });
      expect(screen.getByText("Gagal menyimpan")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(TOAST_ERROR_DISMISS_MS);
      });
      expect(screen.queryByText("Gagal menyimpan")).not.toBeInTheDocument();
    });
  });
});
