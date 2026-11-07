import { GAME_NAME } from '@ge/shared';

// Computer opponents. They may only use the player view and commands (spec 23.3).
export * from './bot';

export function aiLabel(name: string): string {
  return `${GAME_NAME} AI: ${name}`;
}
