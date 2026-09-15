import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

/**
 * Stroke-based icon set drawn with react-native-svg (already linked via
 * react-native-qrcode-svg, so this ships fine over `eas update`). 24×24 grid,
 * round caps/joins, `color` drives the stroke.
 */
function Base({
  size = 22,
  color = '#000',
  strokeWidth = 2,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

export const ChevronRight = (p: IconProps) => (
  <Base {...p}>
    <Polyline points="9 18 15 12 9 6" />
  </Base>
);

export const ChevronLeft = (p: IconProps) => (
  <Base {...p}>
    <Polyline points="15 18 9 12 15 6" />
  </Base>
);

export const ArrowRight = (p: IconProps) => (
  <Base {...p}>
    <Line x1="5" y1="12" x2="19" y2="12" />
    <Polyline points="12 5 19 12 12 19" />
  </Base>
);

export const ArrowUp = (p: IconProps) => (
  <Base {...p}>
    <Line x1="12" y1="19" x2="12" y2="5" />
    <Polyline points="5 12 12 5 19 12" />
  </Base>
);

export const Plus = (p: IconProps) => (
  <Base {...p}>
    <Line x1="12" y1="5" x2="12" y2="19" />
    <Line x1="5" y1="12" x2="19" y2="12" />
  </Base>
);

export const Check = (p: IconProps) => (
  <Base {...p}>
    <Polyline points="20 6 9 17 4 12" />
  </Base>
);

export const X = (p: IconProps) => (
  <Base {...p}>
    <Line x1="18" y1="6" x2="6" y2="18" />
    <Line x1="6" y1="6" x2="18" y2="18" />
  </Base>
);

export const Clock = (p: IconProps) => (
  <Base {...p}>
    <Circle cx="12" cy="12" r="9" />
    <Polyline points="12 7 12 12 16 14" />
  </Base>
);

export const Users = (p: IconProps) => (
  <Base {...p}>
    <Path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <Circle cx="9.5" cy="7" r="4" />
    <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Base>
);

export const User = (p: IconProps) => (
  <Base {...p}>
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Base>
);

export const MapPin = (p: IconProps) => (
  <Base {...p}>
    <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <Circle cx="12" cy="10" r="3" />
  </Base>
);

export const Eye = (p: IconProps) => (
  <Base {...p}>
    <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <Circle cx="12" cy="12" r="3" />
  </Base>
);

export const Run = (p: IconProps) => (
  <Base {...p}>
    <Circle cx="13" cy="4" r="2" />
    <Path d="m6.5 21 3-6-2.5-3 1-5 3 3 3 1" />
    <Path d="m10 15 4 1 2 5" />
    <Path d="M9 9 6.5 8 4 10" />
  </Base>
);

export const QrCode = (p: IconProps) => (
  <Base {...p}>
    <Rect x="3" y="3" width="7" height="7" rx="1" />
    <Rect x="14" y="3" width="7" height="7" rx="1" />
    <Rect x="3" y="14" width="7" height="7" rx="1" />
    <Line x1="14" y1="14" x2="14" y2="17" />
    <Line x1="14" y1="21" x2="17" y2="21" />
    <Line x1="21" y1="14" x2="21" y2="21" />
    <Line x1="17.5" y1="17.5" x2="17.5" y2="17.5" />
  </Base>
);

export const Scan = (p: IconProps) => (
  <Base {...p}>
    <Path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <Path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <Path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <Path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <Line x1="7" y1="12" x2="17" y2="12" />
  </Base>
);

export const Crosshair = (p: IconProps) => (
  <Base {...p}>
    <Circle cx="12" cy="12" r="8" />
    <Line x1="12" y1="2" x2="12" y2="6" />
    <Line x1="12" y1="18" x2="12" y2="22" />
    <Line x1="2" y1="12" x2="6" y2="12" />
    <Line x1="18" y1="12" x2="22" y2="12" />
  </Base>
);

export const Radio = (p: IconProps) => (
  <Base {...p}>
    <Circle cx="12" cy="12" r="2" />
    <Path d="M7.5 16.5a6 6 0 0 1 0-9" />
    <Path d="M16.5 7.5a6 6 0 0 1 0 9" />
    <Path d="M4.7 19.3a10 10 0 0 1 0-14.6" />
    <Path d="M19.3 4.7a10 10 0 0 1 0 14.6" />
  </Base>
);

export const Trophy = (p: IconProps) => (
  <Base {...p}>
    <Path d="M6 9a6 6 0 0 0 12 0V4H6Z" />
    <Path d="M6 5H3v2a3 3 0 0 0 3 3" />
    <Path d="M18 5h3v2a3 3 0 0 1-3 3" />
    <Line x1="12" y1="15" x2="12" y2="19" />
    <Path d="M8 21h8l-1-2H9Z" />
  </Base>
);

export const Flag = (p: IconProps) => (
  <Base {...p}>
    <Path d="M4 22V4s1-1 4-1 5 2 8 2 4-1 4-1v10s-1 1-4 1-5-2-8-2-4 1-4 1" />
  </Base>
);

export const Shield = (p: IconProps) => (
  <Base {...p}>
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </Base>
);

export const Copy = (p: IconProps) => (
  <Base {...p}>
    <Rect x="9" y="9" width="12" height="12" rx="2" />
    <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Base>
);

export const Share = (p: IconProps) => (
  <Base {...p}>
    <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <Polyline points="16 6 12 2 8 6" />
    <Line x1="12" y1="2" x2="12" y2="15" />
  </Base>
);

export const Camera = (p: IconProps) => (
  <Base {...p}>
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
    <Circle cx="12" cy="13" r="4" />
  </Base>
);

export const Pencil = (p: IconProps) => (
  <Base {...p}>
    <Path d="M17 3a2.85 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <Line x1="15" y1="5" x2="19" y2="9" />
  </Base>
);

export const Trash = (p: IconProps) => (
  <Base {...p}>
    <Polyline points="3 6 5 6 21 6" />
    <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Base>
);

export const SignOut = (p: IconProps) => (
  <Base {...p}>
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Polyline points="16 17 21 12 16 7" />
    <Line x1="21" y1="12" x2="9" y2="12" />
  </Base>
);

export const Bolt = (p: IconProps) => (
  <Base {...p}>
    <Path d="M13 2 3 14h9l-1 8 10-12h-9Z" />
  </Base>
);

export const Sparkle = (p: IconProps) => (
  <Base {...p}>
    <Path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </Base>
);

export const Dot = ({ size = 22, color = '#000' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="5" fill={color} />
  </Svg>
);

export const MessageIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.9-.9L3 20.5l1.4-4.2A8.5 8.5 0 0 1 3.5 11 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />
  </Base>
);

export const Torch = (p: IconProps) => (
  <Base {...p}>
    <Path d="M9 2h6l-1 6H10Z" />
    <Path d="M10 8h4v4l-1 10h-2l-1-10Z" />
    <Line x1="12" y1="12" x2="12" y2="15" />
  </Base>
);
