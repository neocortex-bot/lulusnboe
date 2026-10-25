import { useEffect, useRef, useState } from "react";
import { DigitalProperty, isCaptionVisible } from "@/lib/digitalProperties";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export default function PropertyDisplay({ property, onDismiss }: { property: DigitalProperty; onDismiss?: () => void }) {
  const [failed, setFailed] = useState(false);
  const [remaining, setRemaining] = useState(10);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  useEffect(() => {
    const deadline = Date.now() + 10000;
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) {
        clearInterval(timer);
        dismissRef.current?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const caption = isCaptionVisible(property);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) dismissRef.current?.(); }}>
    <DialogContent aria-describedby={undefined} className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-lg p-4 pt-12 sm:p-8 sm:pt-12">
      <DialogTitle className={caption && property.label ? "break-words text-center text-2xl font-semibold text-muted-foreground" : "sr-only"}>{caption && property.label ? property.label : "Media pemeriksaan"}</DialogTitle>
      <DialogDescription className="text-center tabular-nums">Menutup dalam {remaining} detik</DialogDescription>
      <section aria-label="Properti yang diberikan penguji" className="flex min-w-0 flex-col items-center gap-4">
      {caption && property.value && <p className="max-w-5xl whitespace-pre-line break-words text-center text-3xl font-bold sm:text-4xl">{property.value}</p>}
      {failed ? <p role="alert" className="text-destructive">Media tidak dapat dibuka. Hubungi penguji.</p> : property.media_url && (
        property.media_type === "audio" ? <audio aria-label="Audio pemeriksaan" src={property.media_url} controls autoPlay onError={() => setFailed(true)} className="w-full max-w-2xl" /> :
        property.media_type === "video" ? <video aria-label="Video pemeriksaan" src={property.media_url} controls autoPlay onError={() => setFailed(true)} className="max-h-[65vh] w-full max-w-5xl object-contain" /> :
        <img src={property.media_url} alt={caption ? property.label : "Media pemeriksaan"} onError={() => setFailed(true)} className="max-h-[65vh] w-full max-w-5xl object-contain" />
      )}
    </section>
    </DialogContent>
    </Dialog>
  );
}