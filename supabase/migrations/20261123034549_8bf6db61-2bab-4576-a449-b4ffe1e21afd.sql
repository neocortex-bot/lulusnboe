ALTER TABLE public.clinical_cases ADD COLUMN nboe_period text;
CREATE INDEX clinical_cases_nboe_period_idx ON public.clinical_cases (nboe_period) WHERE is_nboe;
CREATE FUNCTION public.validate_nboe_period() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT NEW.is_nboe THEN
    NEW.nboe_period := NULL;
  ELSE
    IF NEW.nboe_period IS NOT NULL AND (NEW.nboe_period !~ '^(2023|2024|2025|2026)-(03|06|09|12)$' OR NEW.nboe_period < '2023-06' OR NEW.nboe_period > '2026-09') THEN
      RAISE EXCEPTION 'Periode NBOE harus antara Juni 2023 dan September 2026 (Maret, Juni, September, Desember).';
    END IF;
    IF NEW.nboe_period IS NULL THEN
      IF TG_OP = 'INSERT' THEN
        RAISE EXCEPTION 'Pilih periode untuk Soal NBOE.';
      ELSIF NOT OLD.is_nboe OR OLD.nboe_period IS NOT NULL THEN
        RAISE EXCEPTION 'Pilih periode untuk Soal NBOE.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_nboe_period BEFORE INSERT OR UPDATE OF is_nboe, nboe_period ON public.clinical_cases FOR EACH ROW EXECUTE FUNCTION public.validate_nboe_period();