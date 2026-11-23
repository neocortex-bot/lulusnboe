import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NBOE_FILTER_ALL, NBOE_FILTER_ANY, NBOE_FILTER_UNSET, NBOE_PERIODS } from "@/lib/nboePeriods";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const NboePeriodFilter = ({ value, onChange }: Props) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label="Filter periode NBOE" className="min-w-0 w-full max-w-56 sm:w-56">
      <SelectValue placeholder="Periode NBOE" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={NBOE_FILTER_ALL}>Semua Soal</SelectItem>
      <SelectItem value={NBOE_FILTER_ANY}>Semua Soal NBOE</SelectItem>
      {NBOE_PERIODS.map((period) => (
        <SelectItem key={period.value} value={period.value}>NBOE {period.label}</SelectItem>
      ))}
      <SelectItem value={NBOE_FILTER_UNSET}>NBOE · Periode belum diisi</SelectItem>
    </SelectContent>
  </Select>
);

export default NboePeriodFilter;
