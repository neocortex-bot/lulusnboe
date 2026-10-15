import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NONE, toCategoryKey, toCategoryLabel } from "@/lib/caseCategory";

interface Props {
  categories: string[];
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}

const NEW = "__new__";

const CategoryPicker = ({ categories, value, onChange, disabled }: Props) => {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const options = value && !categories.includes(value) ? [...categories, value].sort() : categories;

  if (creating) {
    const key = toCategoryKey(draft);
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          placeholder="Nama kategori baru"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          disabled={!key}
          onClick={() => { onChange(key); setCreating(false); setDraft(""); }}
        >
          Tambah
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>Batal</Button>
      </div>
    );
  }

  return (
    <Select
      value={value ?? NONE}
      disabled={disabled}
      onValueChange={(v) => (v === NEW ? setCreating(true) : onChange(v === NONE ? null : v))}
    >
      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Tanpa Kategori</SelectItem>
        {options.map((c) => (
          <SelectItem key={c} value={c}>{toCategoryLabel(c)}</SelectItem>
        ))}
        <SelectItem value={NEW}>+ Kategori baru…</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default CategoryPicker;
