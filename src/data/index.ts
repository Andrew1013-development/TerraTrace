import type { DemoCase, Lead, Place, Region, Series, Variable } from "../types";

export class DataError extends Error {
  kind: "rate-limit" | "network" | "unavailable";
  constructor(kind: DataError["kind"]) {
    super("not implemented");
    this.kind = kind;
  }
}

export function loadCatalog(): Promise<Variable[]> {
  throw new Error("not implemented");
}

export function loadRegions(): Promise<Region[]> {
  throw new Error("not implemented");
}

export function loadLeads(): Promise<Lead[]> {
  throw new Error("not implemented");
}

export function getSeries(_variable: Variable, _place: Place): Promise<Series> {
  throw new Error("not implemented");
}

export const demoCases: DemoCase[] = [];
