// Quiz questions of the Player Studio seed: the text typed in the Wizard (English) and its
// translations for the Studio design (game.quiz.translations), so that the seeded quiz
// designs show no warning in the Studio.
export const QUESTIONS = [
  {
    text: "What is the capital of Algeria?",
    options: ["Oran", "Algiers", "Constantine"],
    correct: 1,
    translated: {
      text: {
        fr: "Quelle est la capitale de l'Algérie ?",
        ar: "ما هي عاصمة الجزائر؟",
        en: "What is the capital of Algeria?",
      },
      options: [
        { fr: "Oran", ar: "وهران", en: "Oran" },
        { fr: "Alger", ar: "الجزائر", en: "Algiers" },
        { fr: "Constantine", ar: "قسنطينة", en: "Constantine" },
      ],
    },
  },
  {
    text: "How many wilayas does Algeria have?",
    options: ["48", "58", "69"],
    correct: 1,
    translated: {
      text: {
        fr: "Combien de wilayas compte l'Algérie ?",
        ar: "كم عدد ولايات الجزائر؟",
        en: "How many wilayas does Algeria have?",
      },
      options: [
        { fr: "48", ar: "48", en: "48" },
        { fr: "58", ar: "58", en: "58" },
        { fr: "69", ar: "69", en: "69" },
      ],
    },
  },
];
