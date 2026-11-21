import { getOpenAIConfig, openAIJson } from "../_shared/openai.ts";
import { buildEvaluationPrompt, buildUserContent, coveragePoints } from "./grading-prompt.ts";

// Opt-in live control: synthetic speech only, no database access or report writes.
// deno test --allow-env --allow-net=api.openai.com calibration_test.ts
Deno.test({
  name: "live grading preserves interrupted clinical meaning without rewarding unsafe or absent answers",
  ignore: !Deno.env.get("OPENAI_API_KEY"),
  async fn() {
    const config = getOpenAIConfig();
    if (!config) throw new Error("OpenAI configuration missing");
    const rubric = { enabled: true, items: [
      { text: "Communication: explain examination, obtain consent, position patient, preserve privacy, wash hands, prepare stethoscope.", points: 2, isCritical: false },
      { text: "Pulse examination: examine radial pulse bilaterally and interpret rate/rhythm.", points: 2, isCritical: false },
      { text: "Anticoagulation: choose safe heparin dosing.", points: 2, isCritical: true },
      { text: "Secondary prevention: prescribe high intensity statin.", points: 2, isCritical: false },
      { text: "Sensorik: uji raba ringan dan tajam-tumpul.", points: 2, isCritical: false },
    ] };
    const transcript = "Selamat pagi, saya dokter yang memeriksa. Saya periksa denyut kedua tangan untuk mengetahui kecepatan dan irama jantung, apakah bersedia? Silakan berbaring, tirai saya tutup, saya cuci tangan. Saya raba nadi radialis dan hitung 80 kali per menit reguler. Saya cek sensoris... sebentar dok... dengan tajam tumpul dan ujirah baringan. Saya berikan heparin bolus 8000 unit per kilogram sekaligus.";
    const report = await openAIJson<{ items: { coverage: "full" | "partial" | "none" }[] }>(config, [
      { role: "system", content: buildEvaluationPrompt(rubric, "", "") },
      { role: "user", content: buildUserContent({ title: "Synthetic safety control" }, rubric, "", "", transcript) },
    ], { deterministic: true });
    const points = report.items.map(item => coveragePoints(item.coverage));
    if (JSON.stringify(points) !== JSON.stringify([2, 2, 0, 0, 2])) {
      throw new Error(`Clinical/raw-speech control failed: ${JSON.stringify(points)}`);
    }
  },
});