import type { Question, Variable } from "../types";

export { questions } from "./questions";

export function narrow(suspects: Variable[], option: { tags: string[] }): Variable[] {
  return suspects.filter((v) => v.tags.some((t) => option.tags.includes(t)));
}

export function liveOptions(question: Question, suspects: Variable[]): Question["options"] {
  return question.options.filter((o) => narrow(suspects, o).length > 0);
}

// Picks the unasked question, answerable by every suspect, whose largest remaining group
// is smallest; ties go to the earlier one.
export function nextQuestion(suspects: Variable[], askedIds: string[], questions: Question[]): Question | null {
  if (suspects.length <= 1) return null;
  let best: Question | null = null;
  let bestScore = Infinity;
  for (const q of questions) {
    if (askedIds.includes(q.id)) continue;
    const live = liveOptions(q, suspects);
    const sizes = live.map((o) => narrow(suspects, o).length);
    if (sizes.length < 2 || !sizes.some((n) => n < suspects.length)) continue;
    // Every suspect must be able to answer, or asking strands it.
    if (narrow(suspects, { tags: live.flatMap((o) => o.tags) }).length < suspects.length) continue;
    const score = Math.max(...sizes);
    if (score < bestScore) {
      best = q;
      bestScore = score;
    }
  }
  return best;
}
