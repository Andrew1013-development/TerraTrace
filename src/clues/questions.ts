import type { Question } from "../types";

// Questions about what a person notices, never about instruments or datasets.
// Tags are exact lower-case words that catalog.json must use too.
// Every variable needs at least one tag from the first question.
export const questions: Question[] = [
  {
    id: "sphere",
    text: "Is your question about the air, water, land or living things?",
    options: [
      { label: "The air", tags: ["air"] },
      { label: "Water", tags: ["water"] },
      { label: "The land", tags: ["land"] },
      { label: "Living things", tags: ["life"] },
    ],
  },
  {
    id: "feel",
    text: "What would you notice changing?",
    options: [
      { label: "It feels hotter or colder", tags: ["temperature"] },
      { label: "It feels wetter or drier", tags: ["rain", "snow", "humidity"] },
      { label: "It feels windier or calmer", tags: ["wind"] },
      { label: "It feels sunnier or cloudier", tags: ["sun", "cloud"] },
    ],
  },
  {
    id: "wet",
    text: "Is it rain, snow, or moisture in the air?",
    options: [
      { label: "Rain", tags: ["rain"] },
      { label: "Snow", tags: ["snow"] },
      { label: "Moisture in the air", tags: ["humidity"] },
    ],
  },
  {
    id: "extreme",
    text: "Are you curious about a usual day, or the hottest and coldest times?",
    options: [
      { label: "A usual day", tags: ["average"] },
      { label: "The hottest part of the day", tags: ["maximum"] },
      { label: "The coldest part of the night", tags: ["minimum"] },
    ],
  },
];
