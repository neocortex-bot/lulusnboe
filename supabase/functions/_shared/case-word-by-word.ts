export interface AgentRubricItem {
  id?: string;
  text: string;
  points: number;
  isCritical: boolean;
  answer?: string;
}

// Omission preserves existing wording; an explicit empty answer clears it.
// IDs are matched before text; never match a new item by position.
export function preserveWordByWord(incoming: AgentRubricItem[], previous: AgentRubricItem[] = []): AgentRubricItem[] {
  const used = new Set<AgentRubricItem>();
  return incoming.map((item) => {
    const old = previous.find((p) => !used.has(p) && (item.id ? p.id === item.id : p.text === item.text));
    if (old) used.add(old);
    return {
      ...item,
      id: item.id || old?.id || crypto.randomUUID(),
      ...(item.answer === undefined && old?.answer !== undefined ? { answer: old.answer } : {}),
    };
  });
}

export function publicRubricItems(items: AgentRubricItem[]) {
  return items.map(({ answer: _answer, ...item }) => item);
}

export function wordByWordCoverage(items: AgentRubricItem[]) {
  const missing = items.filter((item) => !item.answer?.trim()).map((item) => item.id);
  return { total: items.length, filled: items.length - missing.length, missing_item_ids: missing,
    ai_checked: false, check_endpoint: "/functions/v1/rubric-alignment", grading_uses_word_by_word: false };
}

export function validAgentKey(provided: string | null, adminKey?: string, ingestKey?: string) {
  return Boolean(provided && provided === (adminKey || ingestKey));
}