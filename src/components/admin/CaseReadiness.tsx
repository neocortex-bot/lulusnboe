import { getCaseMediaReadiness } from "@/lib/caseReadiness";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function CaseReadiness({ rubric, checkedAt }: { rubric: unknown; checkedAt?: string | null }) {
  const media = getCaseMediaReadiness(rubric);
  const mediaLabel = media.required === 0 ? "Tidak ada properti ditandai butuh media" : media.ready
    ? `Media lengkap: ${media.completed}/${media.required} properti yang butuh media sudah dilengkapi`
    : `Media belum lengkap: ${media.completed}/${media.required} properti yang butuh media sudah dilengkapi`;
  const syncLabel = checkedAt
    ? `AI pernah dicek: ${new Date(checkedAt).toLocaleString("id-ID")}. Riwayat pemeriksaan, bukan konfirmasi saran sudah disimpan atau isi media sudah diverifikasi.`
    : "Belum pernah berhasil menjalankan Sinkronkan properti dengan jawaban (AI)";
  return (
    <div className="flex w-16 items-center justify-center gap-2">
      {[{ emoji: media.required === 0 ? "➖" : media.ready ? "✅" : "⏳", label: mediaLabel },
        { emoji: checkedAt ? "🔄" : "⚪", label: syncLabel }].map(({ emoji, label }) => (
        <Tooltip key={label}>
          <TooltipTrigger asChild><span tabIndex={0} role="img" aria-label={label} className="cursor-help text-base">{emoji}</span></TooltipTrigger>
          <TooltipContent className="max-w-72">{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}