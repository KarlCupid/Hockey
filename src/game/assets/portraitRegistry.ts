import type { Player, Position } from "../types";

export interface PortraitDescriptor {
  key: string;
  role: "skater" | "goalie";
  ageBand: "rookie" | "prime" | "veteran";
  faceShape: "round" | "square" | "long";
  hair: "short" | "swept" | "helmet";
  expression: "calm" | "focused" | "spark";
}

export function createPortraitDescriptor(input: Pick<Player, "id" | "position" | "age" | "personality">): PortraitDescriptor {
  const hash = hashText(`${input.id}-${input.position}-${input.personality}`);
  return {
    key: deterministicPortraitKey(input.id, input.position, input.age, input.personality),
    role: input.position === "G" ? "goalie" : "skater",
    ageBand: input.age <= 22 ? "rookie" : input.age >= 32 ? "veteran" : "prime",
    faceShape: pick(["round", "square", "long"], hash),
    hair: input.position === "G" ? "helmet" : pick(["short", "swept", "helmet"], hash >> 2),
    expression: input.personality.includes("Quiet") ? "calm" : input.personality.includes("Competitive") ? "spark" : "focused"
  };
}

export function deterministicPortraitKey(id: string, position: Position, age: number, personality: string): string {
  return `portrait-${hashText(`${id}|${position}|${age}|${personality}`).toString(36)}`;
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(items: readonly T[], hash: number): T {
  return items[hash % items.length];
}
