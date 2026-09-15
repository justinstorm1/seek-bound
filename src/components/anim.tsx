import { Children, isValidElement, type ReactNode, useEffect, useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Fade + spring-slide up on mount. */
export function FadeInView({
  children,
  delay = 0,
  duration = 480,
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(duration).springify().damping(22)}
      className={className}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** Wraps each child in a `FadeInView`, incrementing the delay down the list. */
export function Stagger({
  children,
  delay = 0,
  gap = 80,
}: {
  children: ReactNode;
  delay?: number;
  gap?: number;
}) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <>
      {items.map((child, i) => (
        <FadeInView key={child.key ?? i} delay={delay + i * gap}>
          {child}
        </FadeInView>
      ))}
    </>
  );
}

/** Fade + gentle scale-up on mount. Good for hero elements and modals. */
export function ScaleIn({
  children,
  delay = 0,
  duration = 420,
  from = 0.94,
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  from?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
  }, [t, duration]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ scale: from + (1 - from) * t.value }],
  }));
  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(1)}
      className={className}
      style={[style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}

/** Shimmering placeholder block for loading states. */
export function Skeleton({
  width,
  height = 16,
  radius = 8,
  color,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [t]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: 0.35 + t.value * 0.4 }));
  return (
    <Animated.View
      style={[
        { width: width ?? '100%', height, borderRadius: radius, backgroundColor: color },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** A column of shimmer lines — quick stand-in for a loading card body. */
export function SkeletonLines({
  lines = 3,
  color,
  gap = 10,
}: {
  lines?: number;
  color: string;
  gap?: number;
}) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          color={color}
          height={12}
          width={i === lines - 1 ? '55%' : '100%'}
        />
      ))}
    </View>
  );
}

/** Infinite gentle breathing scale — use sparingly, for glow or urgency. */
export function Pulse({
  children,
  min = 1,
  max = 1.06,
  duration = 1600,
  className,
  style,
}: {
  children: ReactNode;
  min?: number;
  max?: number;
  duration?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(min);
  useEffect(() => {
    scale.value = withRepeat(
      withTiming(max, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [scale, min, max, duration]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View className={className} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

/** Pressable that dips to `scaleTo` while held. Forwards press + style props. */
export function PressableScale({
  children,
  onPress,
  disabled,
  scaleTo = 0.96,
  className,
  style,
  ...rest
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  scaleTo?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
} & Omit<PressableProps, 'onPress' | 'disabled' | 'style' | 'children'>) {
  const [pressed, setPressed] = useState(false);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: pressed
          ? withTiming(scaleTo, { duration: 90 })
          : withSpring(1, { damping: 12, stiffness: 220 }),
      },
    ],
  }));
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      className={className}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
