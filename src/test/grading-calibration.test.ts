import { describe, expect, it } from 'vitest';
import { buildUserContent, coveragePoints } from '../../supabase/functions/evaluate-exam/grading-prompt';

describe('clinical competency calibration boundaries', () => {
  it('preserves raw interrupted speech rather than normalizing the evidence', () => {
    const raw = 'Saya uji... sebentar dokter... tajam tumpul dan ujirah baringan. Bukan kanan, saya koreksi kiri. Dosis 80-100 unit per kilo.';
    const content = buildUserContent({ title: 'Kasus uji' }, { enabled: false, items: [] }, '', '', raw);
    expect(content.split('Candidate Transcript:\n')[1]).toBe(raw);
  });
  it('awards 2 for full core competency', () => {
    expect(coveragePoints('full')).toBe(2);
  });
  it('awards 1 for genuinely partial competency', () => {
    expect(coveragePoints('partial')).toBe(1);
  });
  it('awards 0 for absent or unsafe competency', () => {
    expect(coveragePoints('none')).toBe(0);
  });
  it('prepares answer-free rubric data without changing the saved rubric', () => {
    const original = { text: 'Pemeriksaan nadi bilateral.\nSKOR: 2 = semua; 1 = sebagian.', points: 2, isCritical: false, answer: 'Kunci privat per butir' };
    const content = buildUserContent({ title: 'Kasus uji' }, { enabled: true, items: [original] }, '', '', 'Saya periksa kedua kaki.');
    const json = content.split('Weighted Checklist Rubric:\n')[1].split('\n\n')[0];
    expect(JSON.parse(json)).toEqual([{ text: 'Pemeriksaan nadi bilateral.', points: 2, isCritical: false }]);
    expect(original.answer).toBe('Kunci privat per butir');
    expect(original.text).toBe('Pemeriksaan nadi bilateral.\nSKOR: 2 = semua; 1 = sebagian.');
    expect(content.endsWith('Saya periksa kedua kaki.')).toBe(true);
  });
});
