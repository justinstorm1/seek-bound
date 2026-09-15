import { useMutation } from 'convex/react';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

/**
 * Reports foreground/background state to the game so other players can see when
 * someone has the app closed. The closest we can get to "away" without a native
 * background build.
 */
export function usePresenceReporter({
  gameId,
  active,
}: {
  gameId: Id<'games'> | null;
  active: boolean;
}) {
  const reportPresence = useMutation(api.games.reportPresence);

  useEffect(() => {
    if (!active || gameId === null) return;

    const send = (away: boolean) => {
      void reportPresence({ gameId, away }).catch(() => {});
    };
    send(AppState.currentState !== 'active');

    const sub = AppState.addEventListener('change', (state) => {
      send(state !== 'active');
    });
    return () => {
      sub.remove();
      send(false);
    };
  }, [gameId, active, reportPresence]);
}
