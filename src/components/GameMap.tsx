import { AppleMaps, GoogleMaps } from 'expo-maps';
import { useState } from 'react';
import { Platform, useColorScheme, View } from 'react-native';
import { darkColors, lightColors } from '../../utils/theme';

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  kind: 'you' | 'hider' | 'seeker' | 'ping';
  /** Render greyed out — a stale ping or an "away" player. */
  muted?: boolean;
};

type LatLng = { lat: number; lng: number };

type Props = {
  /** Where the camera points on first mount. */
  center: LatLng;
  /**
   * Center of the boundary circle. Fixed for the life of the game — pass the
   * play-area center here, never the live player location. Defaults to `center`.
   */
  boundaryCenter?: LatLng;
  /** Boundary circle radius in meters. */
  radiusMeters?: number;
  markers?: MapMarker[];
  /** Initial zoom. Omit to frame the boundary circle automatically. */
  zoom?: number;
  followsUser?: boolean;
};

const SF_SYMBOL: Record<MapMarker['kind'], string> = {
  you: 'location.fill',
  hider: 'figure.run',
  seeker: 'eye.fill',
  ping: 'dot.radiowaves.left.and.right',
};

/** A zoom level that roughly frames a 2·r circle on a phone-height map. */
function zoomForRadius(radiusMeters: number): number {
  if (radiusMeters <= 150) return 16;
  if (radiusMeters <= 300) return 15;
  if (radiusMeters <= 600) return 14;
  if (radiusMeters <= 1200) return 13;
  return 12;
}

export function GameMap({
  center,
  boundaryCenter,
  radiusMeters,
  markers = [],
  zoom,
  followsUser,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? darkColors : lightColors;

  const circleAt = boundaryCenter ?? center;
  const resolvedZoom =
    zoom ?? (radiusMeters ? zoomForRadius(radiusMeters) : 15);

  // Capture the camera on first mount only, so map gestures and marker/circle
  // updates never snap the view back.
  const [initialCamera] = useState(() => ({
    coordinates: { latitude: center.lat, longitude: center.lng },
    zoom: resolvedZoom,
  }));

  const tintFor = (m: MapMarker) => {
    if (m.muted) return theme.iconTertiary;
    return m.kind === 'you'
      ? theme.mapYou
      : m.kind === 'seeker'
        ? theme.mapSeeker
        : m.kind === 'ping'
          ? theme.mapPing
          : theme.mapHider;
  };

  const circles = radiusMeters
    ? [
        {
          center: { latitude: circleAt.lat, longitude: circleAt.lng },
          radius: radiusMeters,
          color: theme.mapZone,
          lineColor: theme.mapZoneBorder,
          lineWidth: 2,
        },
      ]
    : [];

  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        style={{ flex: 1 }}
        cameraPosition={initialCamera}
        circles={circles}
        markers={markers.map((m) => ({
          id: m.id,
          coordinates: { latitude: m.lat, longitude: m.lng },
          title: m.title,
          systemImage: SF_SYMBOL[m.kind],
          tintColor: tintFor(m),
        }))}
        properties={{ isMyLocationEnabled: followsUser ?? true }}
        uiSettings={{ myLocationButtonEnabled: false }}
      />
    );
  }

  if (Platform.OS === 'android') {
    return (
      <GoogleMaps.View
        style={{ flex: 1 }}
        cameraPosition={initialCamera}
        circles={circles}
        markers={markers.map((m) => ({
          id: m.id,
          coordinates: { latitude: m.lat, longitude: m.lng },
          title: m.title,
        }))}
        properties={{ isMyLocationEnabled: followsUser ?? true }}
        uiSettings={{ myLocationButtonEnabled: false, zoomControlsEnabled: false }}
      />
    );
  }

  return <View style={{ flex: 1, backgroundColor: theme.mapBackground }} />;
}
