import { useQuery } from 'convex/react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { CenteredLoader } from '../../../components/ui';

export default function GameIndex() {
  const { gameId } = useLocalSearchParams<{ gameId: Id<'games'> }>();
  const state = useQuery(api.games.getGameState, { gameId });

  if (state === undefined) return <CenteredLoader />;
  if (state === null) return <Redirect href="/(tabs)/(home)" />;

  if (state.status === 'finished') {
    return <Redirect href={{ pathname: '/game/[gameId]/results', params: { gameId } }} />;
  }
  if (state.status === 'lobby') {
    return <Redirect href={{ pathname: '/game/[gameId]/lobby', params: { gameId } }} />;
  }
  return <Redirect href={{ pathname: '/game/[gameId]/play', params: { gameId } }} />;
}
