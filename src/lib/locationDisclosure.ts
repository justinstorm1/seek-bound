import { Alert } from 'react-native';

const BACKGROUND_TITLE = 'Location in the background';
const BACKGROUND_MESSAGE =
  "SeekBound shares your live location with the other players in your game — including while the app is in the background or your screen is locked — so they can see your position on the map. This only happens during an active game and stops the moment it ends. We never collect your location outside of a game.";

const FOREGROUND_TITLE = 'Location access';
const FOREGROUND_MESSAGE =
  "SeekBound uses your location to center the map on you and set the game's play area, and — once a game starts — to share your position with the other players so they can find (or avoid) you. We never collect your location outside of a game.";

/**
 * Google Play / App Store require a "prominent in-app disclosure" — shown by
 * the app itself, not the OS permission dialog — before requesting location
 * access. This is informational only: it always resolves and the caller must
 * always follow it with the real `Location.request*PermissionsAsync()` call.
 * Apple rejected a version of this that offered a "Not Now" to skip/delay the
 * real permission request — the disclosure has to lead into the system
 * prompt every time, with the OS dialog itself as the only place to decline.
 */
export function confirmBackgroundLocationDisclosure(): Promise<void> {
  return acknowledge(BACKGROUND_TITLE, BACKGROUND_MESSAGE);
}

export function confirmForegroundLocationDisclosure(): Promise<void> {
  return acknowledge(FOREGROUND_TITLE, FOREGROUND_MESSAGE);
}

function acknowledge(title: string, message: string): Promise<void> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [{ text: 'Continue', onPress: () => resolve() }], {
      cancelable: false,
    });
  });
}
