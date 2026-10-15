import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL, NONE, toCategoryLabel } from "@/lib/caseCategory";

interface Props {
  categories: string[];
  value: string;
  onChange: (v: string) => void;
}

const CategoryFilter = ({ categories, value, onChange }: Props) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-56">
      <SelectValue placeholder="Kategori" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={ALL}>Semua Kategori</SelectItem>
      <SelectItem value={NONE}>Tanpa Kategori</SelectItem>
      {categories.map((c) => (
        <SelectItem key={c} value={c}>{toCategoryLabel(c)}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default CategoryFilter;
