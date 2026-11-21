interface CasePromptDisplayProps {
  title: string;
  prompt: string;
  questionsText?: string;
  compact?: boolean;
  heading?: string;
}

const CasePromptDisplay = ({ prompt, questionsText, compact, heading = "Silahkan Dijawab" }: CasePromptDisplayProps) => {
  if (compact) {
    return (
      <div className="flex flex-col gap-3 p-4 h-full overflow-y-auto">
        <h2 className="text-lg font-bold text-foreground">{heading}</h2>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm leading-relaxed text-card-foreground whitespace-pre-wrap">
            {prompt}
          </p>
        </div>
        {questionsText && (
          <div className="bg-card border border-primary/30 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-primary mb-2">Soal / Pertanyaan</h3>
            <p className="text-sm leading-relaxed text-card-foreground whitespace-pre-wrap">
              {questionsText}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full flex-col gap-4 sm:gap-6 p-0 sm:p-4 lg:p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{heading}</h2>
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6 lg:p-8">
        <p className="text-base sm:text-xl leading-relaxed text-card-foreground whitespace-pre-wrap">
          {prompt}
        </p>
      </div>
      {questionsText && (
        <div className="bg-card border border-primary/30 rounded-lg p-4 sm:p-6 lg:p-8">
          <h3 className="text-lg font-semibold text-primary mb-3">Soal / Pertanyaan</h3>
          <p className="text-base sm:text-xl leading-relaxed text-card-foreground whitespace-pre-wrap">
            {questionsText}
          </p>
        </div>
      )}
    </div>
  );
};

export default CasePromptDisplay;
