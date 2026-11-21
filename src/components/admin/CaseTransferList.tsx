import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ChevronUp, ChevronDown, X } from "lucide-react";

interface CaseItem {
  id: string;
  title: string;
  is_nboe?: boolean;
}

interface CaseTransferListProps {
  cases: CaseItem[];
  selectedCases: CaseItem[];
  onSelectedCasesChange: (cases: CaseItem[]) => void;
  emptyStateMessage?: string;
  disabled?: boolean;
}

const CaseTransferList = ({
  cases,
  selectedCases,
  onSelectedCasesChange,
  emptyStateMessage,
  disabled = false,
}: CaseTransferListProps) => {
  const [search, setSearch] = useState("");

  const availableCases = cases.filter(
    (c) =>
      !selectedCases.some((s) => s.id === c.id) &&
      c.title.toLowerCase().includes(search.toLowerCase())
  );

  const addCase = (c: CaseItem) => {
    onSelectedCasesChange([...selectedCases, c]);
  };

  const removeCase = (index: number) => {
    onSelectedCasesChange(selectedCases.filter((_, i) => i !== index));
  };

  const moveCase = (index: number, direction: -1 | 1) => {
    const newArr = [...selectedCases];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newArr.length) return;
    [newArr[index], newArr[newIndex]] = [newArr[newIndex], newArr[index]];
    onSelectedCasesChange(newArr);
  };

  return (
    <div className="grid min-w-0 grid-cols-1 md:grid-cols-2 gap-4 [&>div]:min-w-0">
      {/* Available cases */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Pilih Case</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari case..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            disabled={disabled}
          />
        </div>
        <div className="border border-border rounded-md max-h-56 overflow-y-auto">
          {availableCases.length === 0 ? (
            <p className="text-muted-foreground text-sm p-3 text-center">
              {cases.length === 0
                ? emptyStateMessage ?? "Belum ada case."
                : search.trim()
                  ? "Tidak ditemukan."
                  : "Semua case tersedia sudah dipilih."}
            </p>
          ) : (
            availableCases.map((c) => (
              <Button
                type="button"
                variant="ghost"
                key={c.id}
                onClick={() => addCase(c)}
                disabled={disabled}
                className="h-auto min-h-10 w-full justify-start rounded-none whitespace-normal px-3 py-2 text-sm text-left border-b border-border last:border-0"
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 break-words">{c.title}{c.is_nboe && <Badge variant="secondary" className="ml-2 text-xs">Soal NBOE</Badge>}</div>
              </Button>
            ))
          )}
        </div>
      </div>

      {/* Selected cases */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground">
          Urutan Ujian
          {selectedCases.length > 0 && (
            <Badge variant="secondary" className="ml-2">{selectedCases.length}</Badge>
          )}
        </div>
        <div className="border border-border rounded-md min-h-[6rem] max-h-56 overflow-y-auto">
          {selectedCases.length === 0 ? (
            <p className="text-muted-foreground text-sm p-3 text-center">
              Klik case di sebelah kiri untuk menambahkan.
            </p>
          ) : (
            selectedCases.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border-b border-border last:border-0 bg-muted/30"
              >
                <span className="font-mono text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                <div className="min-w-0 flex-1 break-words">{c.title}{(cases.find(item => item.id === c.id) ?? c).is_nboe && <Badge variant="secondary" className="ml-2 text-xs">Soal NBOE</Badge>}</div>
                {selectedCases.length > 1 && (
                  <>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCase(i, -1)} disabled={i === 0}>
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCase(i, 1)} disabled={i === selectedCases.length - 1}>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCase(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseTransferList;
