import { Text, View } from 'react-native';
import { ACHIEVEMENTS } from '../lib/achievements';
import type { ThemeColors } from './ui';

export function XpBar({
  theme,
  level,
  xpIntoLevel,
  xpForNextLevel,
}: {
  theme: ThemeColors;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}) {
  const pct = Math.max(0, Math.min(1, xpForNextLevel > 0 ? xpIntoLevel / xpForNextLevel : 0));
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>Level {level}</Text>
        <Text style={{ color: theme.textTertiary, fontSize: 12 }}>
          {xpIntoLevel} / {xpForNextLevel} XP
        </Text>
      </View>
      <View
        style={{ height: 8, borderRadius: 4, backgroundColor: theme.surfaceSecondary, overflow: 'hidden' }}
      >
        <View style={{ height: 8, width: `${pct * 100}%`, backgroundColor: theme.primary }} />
      </View>
    </View>
  );
}

export function AchievementGrid({
  theme,
  unlocked,
}: {
  theme: ThemeColors;
  unlocked: string[];
}) {
  const set = new Set(unlocked);
  return (
    <View className="flex-row flex-wrap" style={{ gap: 10 }}>
      {ACHIEVEMENTS.map((a) => {
        const got = set.has(a.key);
        return (
          <View
            key={a.key}
            className="items-center"
            style={{ width: '30%', opacity: got ? 1 : 0.4 }}
          >
            <View
              className="items-center justify-center rounded-2xl"
              style={{
                width: 52,
                height: 52,
                backgroundColor: got ? theme.primaryLight : theme.surfaceSecondary,
                borderWidth: got ? 1 : 0,
                borderColor: theme.primary,
              }}
            >
              <Text style={{ fontSize: 24 }}>{got ? a.emoji : '🔒'}</Text>
            </View>
            <Text
              className="text-center"
              style={{ color: theme.textSecondary, fontSize: 10.5, fontWeight: '600', marginTop: 4 }}
              numberOfLines={2}
            >
              {a.title}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
