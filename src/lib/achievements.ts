/** Client mirror of `convex/achievements.ts` CATALOG — for rendering locked/unlocked. */
export const ACHIEVEMENTS: { key: string; title: string; description: string; emoji: string }[] = [
  { key: 'first_game', title: 'Getting Started', description: 'Play your first game', emoji: '🎮' },
  { key: 'first_win', title: 'Winner', description: 'Win your first game', emoji: '🏆' },
  { key: 'escape_artist', title: 'Escape Artist', description: 'Win a round as a hider', emoji: '🫥' },
  { key: 'relentless', title: 'Relentless', description: 'Win a round as a seeker', emoji: '👁️' },
  { key: 'hat_trick', title: 'Hat Trick', description: 'Catch 3 hiders in one game', emoji: '🎯' },
  { key: 'untouchable', title: 'Untouchable', description: 'Survive a full round as a hider', emoji: '🛡️' },
  { key: 'veteran', title: 'Veteran', description: 'Play 10 games', emoji: '🎖️' },
  { key: 'champion', title: 'Champion', description: 'Win 10 games', emoji: '👑' },
  { key: 'squad', title: 'Squad', description: 'Follow 3 players', emoji: '🤝' },
];

export function achievementMeta(key: string) {
  return ACHIEVEMENTS.find((a) => a.key === key);
}

/** Distance-to-nearest-hider → a hot/cold bucket for the seeker HUD. */
export function proximityBucket(meters: number | null | undefined): {
  label: string;
  tone: 'red' | 'orange' | 'yellow' | 'blue';
  fill: number;
} | null {
  if (meters == null) return null;
  if (meters < 25) return { label: 'Burning', tone: 'red', fill: 1 };
  if (meters < 75) return { label: 'Hot', tone: 'orange', fill: 0.72 };
  if (meters < 200) return { label: 'Warm', tone: 'yellow', fill: 0.45 };
  return { label: 'Cold', tone: 'blue', fill: 0.18 };
}
