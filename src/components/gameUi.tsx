import { Image } from 'expo-image';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { darkColors, lightColors } from '../../utils/theme';

function usePalette() {
  const isDark = useColorScheme() === 'dark';
  return isDark ? darkColors : lightColors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Role badge
// ─────────────────────────────────────────────────────────────────────────────

export function RoleBadge({
  role,
  size = 'md',
}: {
  role: 'hider' | 'seeker' | 'host';
  size?: 'sm' | 'md';
}) {
  const theme = usePalette();
  const map = {
    hider: { bg: theme.hiderLight, fg: theme.hiderDark },
    seeker: { bg: theme.seekerLight, fg: theme.seekerDark },
    host: { bg: theme.hostLight, fg: theme.hostDark },
  }[role];
  const pad = size === 'sm' ? { paddingHorizontal: 8, paddingVertical: 2 } : { paddingHorizontal: 12, paddingVertical: 4 };
  return (
    <View className="rounded-full self-start" style={{ backgroundColor: map.bg, ...pad }}>
      <Text
        className="font-bold uppercase"
        style={{ color: map.fg, fontSize: size === 'sm' ? 10 : 11, letterSpacing: 0.6 }}
      >
        {role}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  tint,
  icon,
}: {
  label: string;
  value: string;
  tint?: string;
  icon?: React.ReactNode;
}) {
  const theme = usePalette();
  return (
    <View
      className="flex-1 rounded-2xl"
      style={{
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        padding: 14,
        gap: 6,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className="font-bold uppercase"
          style={{ color: theme.textTertiary, fontSize: 10.5, letterSpacing: 0.6 }}
        >
          {label}
        </Text>
        {icon}
      </View>
      <Text style={{ color: tint ?? theme.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
        {value}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────

/** Deterministic gradient pair from a name, for avatars without a photo. */
function gradientFor(
  name: string,
  theme: Record<keyof typeof lightColors, string>,
): [string, string] {
  const pairs: [string, string][] = [
    [theme.primary, theme.teal],
    [theme.blue, theme.sky],
    [theme.purple, theme.pink],
    [theme.orange, theme.amber],
    [theme.forest, theme.moss],
    [theme.coral, theme.red],
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return pairs[Math.abs(hash) % pairs.length];
}

export function Avatar({
  url,
  name,
  size = 40,
  ring,
  ringColor,
  statusColor,
}: {
  url: string | null;
  name: string;
  size?: number;
  ring?: boolean;
  ringColor?: string;
  statusColor?: string;
}) {
  const theme = usePalette();
  const inner = size - (ring ? 4 : 0);
  const [c1, c2] = gradientFor(name || '?', theme);
  const gid = `av-${(name || 'x').replace(/[^a-z0-9]/gi, '')}-${size}`;

  const face = url ? (
    <Image
      source={{ uri: url }}
      style={{ width: inner, height: inner, borderRadius: inner / 2 }}
      contentFit="cover"
    />
  ) : (
    <View style={{ width: inner, height: inner, borderRadius: inner / 2, overflow: 'hidden' }}>
      <Svg width={inner} height={inner} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c1} />
            <Stop offset="1" stopColor={c2} />
          </LinearGradient>
        </Defs>
        <Rect width={inner} height={inner} fill={`url(#${gid})`} />
      </Svg>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: inner * 0.4 }}>
          {(name || '?').charAt(0).toUpperCase()}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: ring ? ringColor ?? theme.primary : 'transparent',
        }}
      >
        {face}
      </View>
      {statusColor ? (
        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: size * 0.15,
            backgroundColor: statusColor,
            borderWidth: 2,
            borderColor: theme.surface,
          }}
        />
      ) : null}
    </View>
  );
}

/** Overlapping avatar row with an optional "+N" overflow chip. */
export function AvatarStack({
  people,
  size = 28,
  max = 4,
}: {
  people: { name: string; avatarUrl: string | null }[];
  size?: number;
  max?: number;
}) {
  const theme = usePalette();
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <View className="flex-row items-center">
      {shown.map((p, i) => (
        <View
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -size * 0.34,
            borderRadius: size,
            borderWidth: 2,
            borderColor: theme.surface,
          }}
        >
          <Avatar url={p.avatarUrl} name={p.name} size={size} />
        </View>
      ))}
      {extra > 0 ? (
        <View
          style={{
            marginLeft: -size * 0.34,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.surfaceSecondary,
            borderWidth: 2,
            borderColor: theme.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: theme.textSecondary, fontWeight: '800', fontSize: size * 0.34 }}>
            +{extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player row
// ─────────────────────────────────────────────────────────────────────────────

export function PlayerRow({
  name,
  avatarUrl,
  isHost,
  subtitle,
  right,
  onPress,
}: {
  name: string;
  avatarUrl: string | null;
  isHost?: boolean;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const theme = usePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3 rounded-2xl"
      style={({ pressed }) => ({
        backgroundColor: pressed && onPress ? theme.cardPressed : theme.card,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        padding: 12,
      })}
    >
      <Avatar url={avatarUrl} name={name} size={40} />
      <View className="flex-1">
        <Text className="font-semibold" style={{ color: theme.text, fontSize: 15 }} numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text style={{ color: theme.textTertiary, fontSize: 12.5, marginTop: 1 }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {isHost ? (
        <View className="rounded-full" style={{ backgroundColor: theme.hostLight, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: theme.hostDark, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
            HOST
          </Text>
        </View>
      ) : null}
      {right}
    </Pressable>
  );
}
