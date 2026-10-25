import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PropertyDisplay from "@/components/station/PropertyDisplay";

afterEach(() => { cleanup(); vi.useRealTimers(); });
const property = { label: "Tanda vital", value: "TD 140/90 mmHg" };

describe("participant information modal", () => {
  it("dismisses exactly at 10 seconds", () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    render(<PropertyDisplay property={property} onDismiss={dismiss} />);
    act(() => { vi.advanceTimersByTime(9000); });
    expect(dismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(dismiss).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("keeps the modal open when its information is clicked", () => {
    const dismiss = vi.fn();
    render(<PropertyDisplay property={property} onDismiss={dismiss} />);
    fireEvent.click(screen.getByText(property.value));
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("dismisses on outside interaction", () => {
    const dismiss = vi.fn();
    render(<PropertyDisplay property={property} onDismiss={dismiss} />);
    // Radix registers outside pointer listeners after the opening event.
    vi.useFakeTimers();
    act(() => { vi.runOnlyPendingTimers(); });
    fireEvent.pointerDown(document.body);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("cancels the countdown when unmounted", () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    const view = render(<PropertyDisplay property={property} onDismiss={dismiss} />);
    view.unmount();
    act(() => { vi.advanceTimersByTime(10000); });
    expect(dismiss).not.toHaveBeenCalled();
  });
});