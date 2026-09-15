import { useMutation, useQuery } from 'convex/react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { KeyboardAvoidingView, KeyboardStickyView } from 'react-native-keyboard-controller';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { PressableScale, Skeleton } from '../../../components/anim';
import { Avatar } from '../../../components/gameUi';
import { ArrowUp, Users } from '../../../components/icons';
import { TextField, useTheme, type ThemeColors } from '../../../components/ui';

type Message = {
  id: Id<'messages'>;
  body: string;
  at: number;
  userId: Id<'users'>;
  isMe: boolean;
  displayName: string;
  avatarUrl: string | null;
};

type Row = Message & {
  groupStart: boolean;
  groupEnd: boolean;
  showDay: boolean;
  sending: boolean;
};

/** Messages from one sender closer together than this collapse into one group. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;
const MAX_LEN = 500;
/** Android's reported keyboard height + nav bar tuck the last message under the composer. */
const ANDROID_KEYBOARD_EXTRA = 52;

let optimisticSeq = 0;

/** Built outside render so the impure `Date.now()` never runs during rendering. */
function makeOptimisticMessage(body: string): Message {
  optimisticSeq += 1;
  return {
    id: `optimistic-${optimisticSeq}` as Id<'messages'>,
    body,
    at: Date.now(),
    userId: 'optimistic' as Id<'users'>,
    isMe: true,
    displayName: 'You',
    avatarUrl: null,
  };
}

export default function Chat() {
  const { gameId } = useLocalSearchParams<{ gameId: Id<'games'> }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const messages = useQuery(api.chat.listMessages, { gameId });
  const markRead = useMutation(api.chat.markRead);

  // Mark read on entering and again on leaving, so messages that arrive while
  // this screen is open don't show as unread once you're back on the map.
  useFocusEffect(
    useCallback(() => {
      markRead({ gameId }).catch(() => {});
      return () => {
        markRead({ gameId }).catch(() => {});
      };
    }, [gameId, markRead]),
  );

  const sendMessage = useMutation(api.chat.sendMessage).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.chat.listMessages, { gameId: args.gameId });
    if (!current) return;
    const body = args.body.trim().slice(0, MAX_LEN);
    if (!body) return;
    store.setQuery(api.chat.listMessages, { gameId: args.gameId }, [
      ...current,
      makeOptimisticMessage(body),
    ]);
  });

  const [draft, setDraft] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const nearBottom = useRef(true);

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated }));
  }, []);

  useEffect(() => {
    const showEvt = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvt = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
      if (nearBottom.current) scrollToEnd();
    });
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scrollToEnd]);

  useEffect(() => {
    if (messages?.length && nearBottom.current) scrollToEnd(false);
  }, [messages, scrollToEnd]);

  const rows = useMemo(() => buildRows(messages ?? []), [messages]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    nearBottom.current = distanceFromBottom < 140;
  }, []);

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    nearBottom.current = true;
    scrollToEnd();
    try {
      await sendMessage({ gameId, body });
    } catch {
      setDraft(body);
      Alert.alert('Not sent', 'Your message could not be sent. Check your connection and try again.');
    }
  }, [draft, gameId, sendMessage, scrollToEnd]);

  const canSend = draft.trim().length > 0;
  const keyboardOpen = keyboardHeight > 0;
  const listPadBottom =
    18 + keyboardHeight + (keyboardOpen && Platform.OS === 'android' ? ANDROID_KEYBOARD_EXTRA : 0);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {messages === undefined ? (
        <ChatSkeleton theme={theme} />
      ) : rows.length === 0 ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={'translate-with-padding'}>
          <ChatEmpty theme={theme} />
        </KeyboardAvoidingView>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 18, paddingBottom: listPadBottom }}
          onScroll={onScroll}
          scrollEventThrottle={64}
          onContentSizeChange={() => {
            if (nearBottom.current) scrollToEnd(false);
          }}
          keyboardShouldPersistTaps="never"
          keyboardDismissMode='on-drag'
          showsVerticalScrollIndicator={false}
        >
          {rows.map((row) => (
            <MessageBubble key={row.id} row={row} theme={theme} />
          ))}
        </ScrollView>
      )}

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View
          className="flex-row items-end gap-2 px-3 pt-2.5"
          style={{ paddingBottom: keyboardOpen ? 8 : insets.bottom + 8 }}
        >
          <TextField
            theme={theme}
            value={draft}
            onChangeText={(t) => setDraft(t.slice(0, MAX_LEN))}
            placeholder="Message your team"
            multiline
            className="flex-1"
            style={{
              maxHeight: 120,
              minHeight: 42,
              borderRadius: 21,
              paddingTop: 11,
              paddingBottom: 11,
              fontSize: 15.5,
            }}
          />
          <PressableScale
            onPress={send}
            disabled={!canSend}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 1,
              backgroundColor: canSend ? theme.primary : theme.chipBackground,
            }}
          >
            <ArrowUp size={20} color={canSend ? theme.textOnPrimary : theme.textTertiary} strokeWidth={2.6} />
          </PressableScale>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

function MessageBubble({ row, theme }: { row: Row; theme: ThemeColors }) {
  const mine = row.isMe;
  const bg = mine ? theme.primary : theme.surfaceSecondary;
  const fg = mine ? theme.textOnPrimary : theme.text;

  const big = 20;
  const small = 7;
  const radii = mine
    ? {
        borderTopLeftRadius: big,
        borderBottomLeftRadius: big,
        borderTopRightRadius: row.groupStart ? big : small,
        borderBottomRightRadius: row.groupEnd ? big : small,
      }
    : {
        borderTopRightRadius: big,
        borderBottomRightRadius: big,
        borderTopLeftRadius: row.groupStart ? big : small,
        borderBottomLeftRadius: row.groupEnd ? big : small,
      };

  return (
    <View style={{ marginTop: row.groupStart ? 14 : 2 }}>
      {row.showDay ? <DaySeparator ts={row.at} theme={theme} /> : null}

      <Animated.View
        entering={FadeInDown.duration(180)}
        className={`flex-row items-end ${mine ? 'justify-end' : 'justify-start'}`}
      >
        {!mine ? (
          <View style={{ width: 28, marginRight: 8 }}>
            {row.groupEnd ? <Avatar url={row.avatarUrl} name={row.displayName} size={28} /> : null}
          </View>
        ) : null}

        <View style={{ maxWidth: '78%', alignSelf: mine ? 'flex-end' : 'flex-start' }}>
          {!mine && row.groupStart ? (
            <Text
              className="text-xs font-semibold mb-1 ml-1"
              style={{ color: theme.textSecondary }}
              numberOfLines={1}
            >
              {row.displayName}
            </Text>
          ) : null}

          <View
            style={[
              {
                paddingHorizontal: 13,
                paddingVertical: 8,
                backgroundColor: bg,
                opacity: row.sending ? 0.55 : 1,
                alignSelf: mine ? 'flex-end' : 'flex-start',
              },
              radii,
              mine ? null : { borderWidth: 1, borderColor: theme.cardBorder },
            ]}
          >
            <Text selectable style={{ color: fg, fontSize: 15.5, lineHeight: 21 }}>
              {row.body}
            </Text>
          </View>

          {row.groupEnd ? (
            <Text
              className={`text-[10px] mt-1 ${mine ? 'text-right mr-1' : 'ml-1'}`}
              style={{ color: theme.textQuaternary }}
            >
              {row.sending ? 'Sending…' : formatTime(row.at)}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

function DaySeparator({ ts, theme }: { ts: number; theme: ThemeColors }) {
  return (
    <View className="items-center my-3">
      <View
        style={{
          backgroundColor: theme.surfaceSecondary,
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: theme.textTertiary, fontSize: 11, fontWeight: '700' }}>
          {formatDay(ts)}
        </Text>
      </View>
    </View>
  );
}

function ChatEmpty({ theme }: { theme: ThemeColors }) {
  return (
    <View className="flex-1 items-center justify-center px-12">
      <View
        className="items-center justify-center mb-4"
        style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: theme.primaryLight }}
      >
        <Users size={26} color={theme.primaryDark} />
      </View>
      <Text className="text-base font-bold mb-1" style={{ color: theme.text }}>
        Team chat
      </Text>
      <Text className="text-sm text-center" style={{ color: theme.textTertiary }}>
        Only players in this game can see these messages. Say hi.
      </Text>
    </View>
  );
}

function ChatSkeleton({ theme }: { theme: ThemeColors }) {
  return (
    <View className="flex-1 px-4 pt-6" style={{ gap: 18 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          className={`flex-row ${i % 2 ? 'justify-end' : 'justify-start'}`}
          style={{ gap: 8 }}
        >
          {i % 2 ? null : <Skeleton color={theme.surfaceSecondary} width={28} height={28} radius={14} />}
          <Skeleton
            color={theme.surfaceSecondary}
            width={i % 2 ? 160 : 200}
            height={38}
            radius={18}
          />
        </View>
      ))}
    </View>
  );
}

function buildRows(messages: Message[]): Row[] {
  return messages.map((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const key = m.isMe ? 'me' : String(m.userId);
    const prevKey = prev ? (prev.isMe ? 'me' : String(prev.userId)) : null;
    const nextKey = next ? (next.isMe ? 'me' : String(next.userId)) : null;

    const groupStart =
      !prev || prevKey !== key || m.at - prev.at > GROUP_WINDOW_MS || !sameDay(prev.at, m.at);
    const groupEnd =
      !next || nextKey !== key || next.at - m.at > GROUP_WINDOW_MS || !sameDay(m.at, next.at);
    const showDay = !prev || !sameDay(prev.at, m.at);

    return { ...m, groupStart, groupEnd, showDay, sending: String(m.id).startsWith('optimistic-') };
  });
}

function sameDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatTime(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h < 12 ? 'AM' : 'PM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatDay(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startToday - startThatDay) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return WEEKDAYS[d.getDay()];
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
