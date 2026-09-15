import { BlurTargetView, BlurView } from 'expo-blur';
import { Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/build/react-navigation';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  useColorScheme,
  View,
  type ViewProps,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { darkColors, lightColors } from '../../utils/theme';
import { PressableScale } from './anim';
import { ChevronRight } from './icons';

export type ThemeColors = Record<keyof typeof lightColors, string>;

export function useTheme() {
  const isDark = useColorScheme() === 'dark';
  return { theme: (isDark ? darkColors : lightColors) as ThemeColors, isDark };
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

type ScreenProps = {
  title?: string;
  children: React.ReactNode;
  /** Use the keyboard-aware scroll view (screens with text inputs). */
  keyboardAware?: boolean;
  contentClassName?: string;
  headerRight?: React.ReactNode;
  scroll?: boolean;
};

export function Screen({
  title,
  children,
  keyboardAware,
  contentClassName = 'px-5 gap-4',
  headerRight,
  scroll = true,
}: ScreenProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const blurTargetRef = useRef<View>(null);

  const paddingBottom = insets.bottom + 28;
  // ScrollView gets the header inset automatically on iOS; the keyboard-aware
  // path and Android need it added explicitly.
  const scrollPaddingTop = Platform.OS === 'ios' ? 16 : headerHeight + 16;
  const kbPaddingTop = headerHeight + 16;

  const body = scroll ? (
    keyboardAware ? (
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ paddingTop: kbPaddingTop, paddingBottom }}
        style={{ backgroundColor: theme.background }}
        showsVerticalScrollIndicator={false}
      >
        <View className={contentClassName}>{children}</View>
      </KeyboardAwareScrollView>
    ) : (
      <ScrollView
        contentContainerStyle={{ paddingTop: scrollPaddingTop, paddingBottom }}
        contentContainerClassName={contentClassName}
        style={{ backgroundColor: theme.background }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    )
  ) : (
    <View
      className={`flex-1 ${contentClassName}`}
      style={{ backgroundColor: theme.background, paddingTop: kbPaddingTop, paddingBottom }}
    >
      {children}
    </View>
  );

  return (
    <BlurTargetView ref={blurTargetRef} style={{ flex: 1, backgroundColor: theme.background }}>
      {title !== undefined ? (
        <Stack.Screen
          options={{
            headerTitle: title,
            headerTransparent: true,
            headerTintColor: theme.text,
            headerShadowVisible: false,
            headerBackground:
              Platform.OS === 'android'
                ? () => (
                    <BlurView
                      blurTarget={blurTargetRef}
                      intensity={50}
                      tint={isDark ? 'dark' : 'light'}
                      style={StyleSheet.absoluteFill}
                      blurMethod="dimezisBlurView"
                    />
                  )
                : undefined,
          }}
        />
      ) : null}
      {headerRight}
      {body}
    </BlurTargetView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Headings
// ─────────────────────────────────────────────────────────────────────────────

/** Big screen headline + optional supporting line, used at the top of a Screen. */
export function PageTitle({
  theme,
  title,
  subtitle,
}: {
  theme: ThemeColors;
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="gap-1.5">
      <Text style={{ color: theme.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 21 }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function SectionLabel({
  theme,
  children,
  right,
}: {
  theme: ThemeColors;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text
        className="text-xs font-bold uppercase"
        style={{ color: theme.textTertiary, letterSpacing: 0.8 }}
      >
        {children}
      </Text>
      {right}
    </View>
  );
}

export function Divider({ theme, inset = 16 }: { theme: ThemeColors; inset?: number }) {
  return <View style={{ height: 1, marginHorizontal: inset, backgroundColor: theme.divider }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────

type CardTone = 'surface' | 'green' | 'blue' | 'red' | 'orange' | 'primary';

function cardToneStyle(theme: ThemeColors, tone: CardTone) {
  switch (tone) {
    case 'green':
      return { backgroundColor: theme.cardGreen, borderColor: theme.chipGreen };
    case 'blue':
      return { backgroundColor: theme.cardBlue, borderColor: theme.chipBlue };
    case 'red':
      return { backgroundColor: theme.redLighter, borderColor: theme.chipRed };
    case 'orange':
      return { backgroundColor: theme.cardOrange, borderColor: theme.chipOrange };
    case 'primary':
      return { backgroundColor: theme.primary, borderColor: theme.primary };
    default:
      return { backgroundColor: theme.surface, borderColor: theme.cardBorder };
  }
}

export function Card({
  theme,
  style,
  className,
  children,
  tone = 'surface',
  onPress,
  ...rest
}: ViewProps & {
  theme: ThemeColors;
  tone?: CardTone;
  onPress?: () => void;
}) {
  const toneStyle = cardToneStyle(theme, tone);
  const base = [
    {
      ...toneStyle,
      shadowColor: theme.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    style,
  ];
  const cls = `rounded-3xl overflow-hidden border ${className ?? ''}`;

  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.98} className={cls} style={base}>
        {children}
      </PressableScale>
    );
  }
  return (
    <View className={cls} style={base} {...rest}>
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// List rows
// ─────────────────────────────────────────────────────────────────────────────

export function ListRow({
  theme,
  icon,
  title,
  subtitle,
  right,
  onPress,
  danger,
}: {
  theme: ThemeColors;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const content = (
    <View
      className="flex-row items-center gap-3.5 px-4"
      style={{ minHeight: 56, paddingVertical: 12 }}
    >
      {icon ? (
        <View
          className="items-center justify-center rounded-xl"
          style={{ width: 34, height: 34, backgroundColor: danger ? theme.dangerLight : theme.surfaceSecondary }}
        >
          {icon}
        </View>
      ) : null}
      <View className="flex-1">
        <Text
          className="font-semibold"
          style={{ color: danger ? theme.danger : theme.text, fontSize: 15 }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: theme.textTertiary, fontSize: 13, marginTop: 1 }}>{subtitle}</Text>
        ) : null}
      </View>
      {right !== undefined ? right : onPress ? <ChevronRight size={18} color={theme.textTertiary} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: theme.cardPressed }}
        style={({ pressed }) => ({ backgroundColor: pressed ? theme.cardPressed : 'transparent' })}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fields & inputs
// ─────────────────────────────────────────────────────────────────────────────

export function Field({
  theme,
  label,
  hint,
  children,
}: {
  theme: ThemeColors;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="px-4 py-4 gap-3">
      <View className="gap-0.5">
        <Text className="font-semibold" style={{ color: theme.text, fontSize: 15 }}>
          {label}
        </Text>
        {hint ? (
          <Text style={{ color: theme.textTertiary, fontSize: 12.5, lineHeight: 17 }}>{hint}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** @deprecated prefer `Segmented` — kept for existing call sites. */
export function OptionRow({
  theme,
  options,
  value,
  onChange,
}: {
  theme: ThemeColors;
  options: { label: string; value: number }[];
  value: number;
  onChange: (value: number) => void;
}) {
  return <Segmented theme={theme} options={options} value={value} onChange={onChange} />;
}

export function Segmented<T extends string | number>({
  theme,
  options,
  value,
  onChange,
}: {
  theme: ThemeColors;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            className="rounded-full border"
            style={{
              paddingHorizontal: 16,
              paddingVertical: 9,
              backgroundColor: selected ? theme.primary : theme.chipBackground,
              borderColor: selected ? theme.primary : 'transparent',
            }}
          >
            <Text
              style={{
                color: selected ? theme.textOnPrimary : theme.chipText,
                fontSize: 13.5,
                fontWeight: '700',
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TextField({
  theme,
  style,
  ...rest
}: TextInputProps & { theme: ThemeColors }) {
  return (
    <TextInput
      placeholderTextColor={theme.inputPlaceholder}
      style={[
        {
          backgroundColor: theme.inputBackground,
          borderColor: theme.inputBorder,
          borderWidth: 1,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
          color: theme.inputText,
        },
        style,
      ]}
      {...rest}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feedback
// ─────────────────────────────────────────────────────────────────────────────

export function Banner({
  theme,
  tone = 'info',
  icon,
  children,
}: {
  theme: ThemeColors;
  tone?: 'info' | 'success' | 'danger' | 'warning';
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const bg = {
    info: theme.infoLight,
    success: theme.successLight,
    danger: theme.dangerLight,
    warning: theme.warningLight,
  }[tone];
  const fg = {
    info: theme.infoDark,
    success: theme.successDark,
    danger: theme.dangerDark,
    warning: theme.warningDark,
  }[tone];
  return (
    <View
      className="flex-row items-start px-4 py-3 rounded-2xl"
      style={{ backgroundColor: bg, gap: 10 }}
    >
      {icon ? <View style={{ marginTop: 1 }}>{icon}</View> : null}
      <Text className="flex-1 font-medium" style={{ color: fg, fontSize: 13.5, lineHeight: 19 }}>
        {children}
      </Text>
    </View>
  );
}

export function CenteredLoader() {
  const { theme } = useTheme();
  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}

export function EmptyState({
  theme,
  icon,
  title,
  message,
  action,
}: {
  theme: ThemeColors;
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="items-center px-8 py-10 gap-3">
      {icon ? (
        <View
          className="items-center justify-center rounded-3xl"
          style={{ width: 60, height: 60, backgroundColor: theme.surfaceSecondary }}
        >
          {icon}
        </View>
      ) : null}
      <Text className="font-bold text-center" style={{ color: theme.text, fontSize: 16 }}>
        {title}
      </Text>
      {message ? (
        <Text className="text-center" style={{ color: theme.textTertiary, fontSize: 14, lineHeight: 20 }}>
          {message}
        </Text>
      ) : null}
      {action ? (
        <Pressable
          onPress={action.onPress}
          className="rounded-full mt-1"
          style={{ backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 10 }}
        >
          <Text style={{ color: theme.textOnPrimary, fontWeight: '700', fontSize: 14 }}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Badges
// ─────────────────────────────────────────────────────────────────────────────

type PillTone = 'neutral' | 'green' | 'blue' | 'orange' | 'red' | 'purple';

export function Pill({
  theme,
  tone = 'neutral',
  icon,
  children,
}: {
  theme: ThemeColors;
  tone?: PillTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const bg = {
    neutral: theme.chipBackground,
    green: theme.chipGreen,
    blue: theme.chipBlue,
    orange: theme.chipOrange,
    red: theme.chipRed,
    purple: theme.chipPurple,
  }[tone];
  const fg = {
    neutral: theme.chipText,
    green: theme.chipGreenText,
    blue: theme.chipBlueText,
    orange: theme.chipOrangeText,
    red: theme.chipRedText,
    purple: theme.chipPurpleText,
  }[tone];
  return (
    <View
      className="flex-row items-center rounded-full self-start"
      style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, gap: 4 }}
    >
      {icon}
      <Text className="font-bold uppercase" style={{ color: fg, fontSize: 11, letterSpacing: 0.5 }}>
        {children}
      </Text>
    </View>
  );
}

/** A small pulsing dot — "live" / "active" indicator. */
export function LiveDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.35,
          transform: [{ scale: 1.9 }],
        }}
      />
      <View
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Buttons (icon)
// ─────────────────────────────────────────────────────────────────────────────

export function IconButton({
  theme,
  onPress,
  children,
  tone = 'surface',
  size = 40,
  disabled,
}: {
  theme: ThemeColors;
  onPress?: () => void;
  children: React.ReactNode;
  tone?: 'surface' | 'primary' | 'glass';
  size?: number;
  disabled?: boolean;
}) {
  const bg = {
    surface: theme.surfaceSecondary,
    primary: theme.primary,
    glass: theme.glassStrong,
  }[tone];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      className="items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </PressableScale>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress ring
// ─────────────────────────────────────────────────────────────────────────────

export function ProgressRing({
  size = 64,
  strokeWidth = 6,
  progress,
  color,
  trackColor,
  children,
}: {
  size?: number;
  strokeWidth?: number;
  /** 0 → 1 */
  progress: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Row of pips, `filled` of `total` lit — e.g. "hiders left". */
export function PipRow({
  total,
  filled,
  onColor,
  offColor,
  size = 8,
}: {
  total: number;
  filled: number;
  onColor: string;
  offColor: string;
  size?: number;
}) {
  return (
    <View className="flex-row" style={{ gap: 4 }}>
      {Array.from({ length: Math.max(0, total) }).map((_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: i < filled ? onColor : offColor,
          }}
        />
      ))}
    </View>
  );
}
