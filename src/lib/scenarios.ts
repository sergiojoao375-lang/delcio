export type Scenario = {
  id: string;
  emoji: string;
  title: string;
  role: string;
  goal: string;
  starter: string;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "cafe",
    emoji: "☕",
    title: "Pedindo café em Londres",
    role: "a friendly barista in a coffee shop in London",
    goal: "The student orders a drink and a snack, asks the price and pays.",
    starter: "Hi! I'd like to order something, please.",
  },
  {
    id: "aeroporto",
    emoji: "✈️",
    title: "Imigração no aeroporto",
    role: "an immigration officer at a US airport",
    goal: "The student explains the purpose of the trip, how long they will stay and where they will stay.",
    starter: "Good morning. Here is my passport.",
  },
  {
    id: "entrevista",
    emoji: "💼",
    title: "Entrevista de emprego",
    role: "a hiring manager interviewing the student for a job",
    goal: "The student introduces themselves, talks about experience, strengths and asks one question about the job.",
    starter: "Hello, I'm here for the job interview.",
  },
  {
    id: "hotel",
    emoji: "🏨",
    title: "Check-in no hotel",
    role: "a hotel receptionist",
    goal: "The student checks in, asks about breakfast and Wi-Fi, then complains politely about a problem in the room.",
    starter: "Hi, I have a reservation.",
  },
  {
    id: "medico",
    emoji: "🩺",
    title: "Consulta no médico",
    role: "a doctor at a clinic",
    goal: "The student describes symptoms, says how long they have had them and understands the advice.",
    starter: "Hello doctor, I don't feel well.",
  },
  {
    id: "compras",
    emoji: "🛍️",
    title: "Comprando roupa",
    role: "a shop assistant in a clothing store",
    goal: "The student asks for a size and color, tries it on and asks for a discount.",
    starter: "Excuse me, can you help me?",
  },
];

export function scenarioContext(s: Scenario) {
  return `ROLEPLAY MODE. You play ${s.role}. Stay in character and keep the scene realistic.
Scenario goal: ${s.goal}
Guide the student step by step toward the goal. Still apply the correction rule (✏️ line) when they make mistakes.
When the goal is reached, congratulate the student, say "🎉 Scenario complete!" and give 2 tips to sound more natural.`;
}
