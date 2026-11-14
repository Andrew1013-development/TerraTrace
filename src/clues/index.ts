import type { Question, Variable } from "../types";

export { questions } from "./questions";

export function narrow(_suspects: Variable[], _option: { tags: string[] }): Variable[] {
  throw new Error("not implemented");
}

export function liveOptions(_question: Question, _suspects: Variable[]): Question["options"] {
  throw new Error("not implemented");
}

export function nextQuestion(_suspects: Variable[], _askedIds: string[], _questions: Question[]): Question | null {
  throw new Error("not implemented");
}
