import sarahImg from "@/assets/voices/sarah.jpg";
import lauraImg from "@/assets/voices/laura.jpg";
import lilyImg from "@/assets/voices/lily.jpg";
import matildaImg from "@/assets/voices/matilda.jpg";
import jessicaImg from "@/assets/voices/jessica.jpg";
import charlieImg from "@/assets/voices/charlie.jpg";
import georgeImg from "@/assets/voices/george.jpg";
import liamImg from "@/assets/voices/liam.jpg";
import brianImg from "@/assets/voices/brian.jpg";

export type VoiceOption = {
  id: string;
  name: string;
  description: string;
  gender: "f" | "m";
  avatar: string;
};

// Vozes multilingues (funcionam bem em EN e PT-BR)
export const VOICES: VoiceOption[] = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Feminina, calma e amigável", gender: "f", avatar: sarahImg },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", description: "Feminina, animada e jovem", gender: "f", avatar: lauraImg },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", description: "Feminina, doce e suave", gender: "f", avatar: lilyImg },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", description: "Feminina, quente e acolhedora", gender: "f", avatar: matildaImg },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", description: "Feminina, natural e expressiva", gender: "f", avatar: jessicaImg },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", description: "Masculina, natural e clara", gender: "m", avatar: charlieImg },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Masculina, calma e madura", gender: "m", avatar: georgeImg },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", description: "Masculina, jovem e amigável", gender: "m", avatar: liamImg },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", description: "Masculina, casual e descontraída", gender: "m", avatar: brianImg },
];

export const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

export function isValidVoiceId(id: string): boolean {
  return VOICES.some((v) => v.id === id);
}

export function getVoice(id: string): VoiceOption {
  return VOICES.find((v) => v.id === id) || VOICES[0];
}
