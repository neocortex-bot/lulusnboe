import { useState } from "react";
import { DigitalProperty, isCaptionVisible } from "@/lib/digitalProperties";

export default function PropertyDisplay({ property }: { property: DigitalProperty }) {
  const [failed, setFailed] = useState(false);
  const caption = isCaptionVisible(property);
  return (
    <section aria-label="Properti yang diberikan penguji" className="fixed inset-x-0 bottom-0 top-32 z-50 flex flex-col items-center gap-4 overflow-y-auto bg-background p-4 sm:p-8">
      {caption && property.label && <h2 className="max-w-5xl break-words text-center text-2xl font-semibold text-muted-foreground">{property.label}</h2>}
      {caption && property.value && <p className="max-w-5xl whitespace-pre-line break-words text-center text-3xl font-bold sm:text-4xl">{property.value}</p>}
      {failed ? <p role="alert" className="text-destructive">Media tidak dapat dibuka. Hubungi penguji.</p> : property.media_url && (
        property.media_type === "audio" ? <audio aria-label="Audio pemeriksaan" src={property.media_url} controls autoPlay onError={() => setFailed(true)} className="w-full max-w-2xl" /> :
        property.media_type === "video" ? <video aria-label="Video pemeriksaan" src={property.media_url} controls autoPlay onError={() => setFailed(true)} className="max-h-[65vh] w-full max-w-5xl object-contain" /> :
        <img src={property.media_url} alt={caption ? property.label : "Media pemeriksaan"} onError={() => setFailed(true)} className="max-h-[65vh] w-full max-w-5xl object-contain" />
      )}
    </section>
  );
}