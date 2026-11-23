import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CaseTransferList from "@/components/admin/CaseTransferList";

afterEach(cleanup);
const cases = [
  { id: "nboe", title: "Echo HOCM", is_nboe: true, nboe_period: "2026-09" },
  { id: "regular", title: "Echo Reguler", is_nboe: false },
  { id: "legacy", title: "Soal Lama" },
];
describe("NBOE deployment picker filter", () => {
  it("shows all cases initially and only marked cases while checked, restoring all when unchecked", () => {
    render(<CaseTransferList cases={cases} selectedCases={[]} onSelectedCasesChange={vi.fn()} />);
    const checkbox = screen.getByRole("checkbox", { name: "Soal NBOE" });
    expect(checkbox).not.toBeChecked();
    expect(screen.getAllByRole("button")).toHaveLength(3);
    fireEvent.click(checkbox);
    expect(screen.queryByRole("button", { name: "Echo Reguler" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Echo HOCM NBOE September 2026" })).toBeInTheDocument();
    fireEvent.click(checkbox);
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });
  it("combines the filter with search and adds the marked case normally", () => {
    const change = vi.fn();
    render(<CaseTransferList cases={cases} selectedCases={[]} onSelectedCasesChange={change} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Soal NBOE" }));
    fireEvent.change(screen.getByPlaceholderText("Cari case..."), { target: { value: "Reguler" } });
    expect(screen.queryByRole("button", { name: /Echo HOCM/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Cari case..."), { target: { value: "Echo" } });
    fireEvent.click(screen.getByRole("button", { name: "Echo HOCM NBOE September 2026" }));
    expect(change).toHaveBeenCalledWith([cases[0]]);
  });
  it("preserves already selected regular cases and does not change the deployment order", () => {
    const change = vi.fn();
    render(<CaseTransferList cases={cases} selectedCases={[cases[1]]} onSelectedCasesChange={change} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Soal NBOE" }));
    expect(screen.getByText("Echo Reguler")).toBeInTheDocument();
    expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Echo HOCM NBOE September 2026" }));
    expect(change).toHaveBeenCalledWith([cases[1], cases[0]]);
  });
});