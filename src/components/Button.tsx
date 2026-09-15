import { ActivityIndicator, Text, useColorScheme, View } from 'react-native';
import { darkColors, lightColors } from '../../utils/theme';
import { PressableScale } from './anim';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'tonal';
type Size = 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  /** Rendered to the left of the label. */
  icon?: React.ReactNode;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  icon,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? darkColors : lightColors;

  const bg = {
    primary: theme.buttonPrimary,
    secondary: theme.buttonSecondary,
    danger: theme.buttonDanger,
    ghost: theme.buttonGhost,
    tonal: theme.surfaceSecondary,
  }[variant];
  const fg = {
    primary: theme.buttonPrimaryText,
    secondary: theme.buttonSecondaryText,
    danger: theme.buttonDangerText,
    ghost: theme.buttonGhostText,
    tonal: theme.text,
  }[variant];

  const isDisabled = disabled || loading;
  const pad = size === 'lg' ? 16 : 12;
  const fontSize = size === 'lg' ? 17 : 15;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      scaleTo={0.97}
      className="w-full flex-row items-center justify-center rounded-full"
      style={{
        backgroundColor: bg,
        paddingVertical: pad,
        opacity: isDisabled ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View className="flex-row items-center justify-center" style={{ gap: 8 }}>
          {icon}
          <Text className="font-bold" style={{ color: fg, fontSize }}>
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}
