import {useEffect, useRef, useState} from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import {CHAT_ALLOWED_EMOJIS} from '../lib/chatReactions';
import type {ChatMessage, ChatReaction} from '../lib/chatWs';
import {useLessonChat} from '../model/useLessonChat';

type Props = {
  visible: boolean;
  lessonId: number;
  studentId?: number;
  sessionId?: number;
  onClose: () => void;
};

function formatEditedAt(value?: string | null) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

export function LessonChatModal({
  visible,
  lessonId,
  studentId,
  sessionId,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const keyboardHeight = useKeyboardBottomOffset(visible);
  const {messageList, connected, sendMessage, editMessage, toggleReaction} =
    useLessonChat(lessonId, studentId, sessionId, visible);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [reactionForId, setReactionForId] = useState<number | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!visible) {
      setDraft('');
      setReplyTo(null);
      setEditing(null);
      setReactionForId(null);
    }
  }, [visible]);

  useEffect(() => {
    if (messageList.length) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({animated: true});
      });
    }
  }, [messageList.length]);

  const clearComposerMode = () => {
    setReplyTo(null);
    setEditing(null);
    setDraft('');
  };

  const startReply = (message: ChatMessage) => {
    setEditing(null);
    setReplyTo(message);
    setReactionForId(null);
  };

  const startEdit = (message: ChatMessage) => {
    setReplyTo(null);
    setEditing(message);
    setDraft(message.message || '');
    setReactionForId(null);
  };

  const onSend = () => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    if (editing) {
      editMessage(editing.id, text);
    } else {
      sendMessage(text, replyTo?.id || null);
    }
    clearComposerMode();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={[styles.header, {paddingTop: insets.top + 8}]}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('lessons.lessonChat')}</Text>
            <Text style={styles.status}>
              {connected
                ? t('lessons.chatConnected')
                : t('lessons.chatConnecting')}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={messageList}
          keyExtractor={(item, index) =>
            item.id ? String(item.id) : `m-${index}`
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>{t('lessons.chatEmpty')}</Text>
          }
          renderItem={({item}) => {
            const mine = item.is_mine || item.direction === 'outgoing';
            const editedLabel = formatEditedAt(item.edited_at);
            const isReplyTarget = replyTo?.id === item.id;
            const myEmoji = item.reactions?.find(
              (r: ChatReaction) => r.reacted_by_me,
            )?.emoji;
            const showPicker = reactionForId === item.id;

            return (
              <View
                style={[
                  styles.bubbleWrap,
                  mine ? styles.bubbleWrapMine : styles.bubbleWrapOther,
                ]}>
                <View
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMine : styles.bubbleOther,
                    isReplyTarget && styles.bubbleReplyTarget,
                  ]}>
                  {!mine ? (
                    <Text style={styles.sender}>{item.sender}</Text>
                  ) : null}
                  {item.reply_to ? (
                    <View
                      style={[
                        styles.replyQuote,
                        mine && styles.replyQuoteMine,
                      ]}>
                      <Text
                        style={[
                          styles.replySender,
                          mine && styles.replySenderMine,
                        ]}
                        numberOfLines={1}>
                        {item.reply_to.sender}
                      </Text>
                      <Text
                        style={[
                          styles.replyText,
                          mine && styles.replyTextMine,
                        ]}
                        numberOfLines={2}>
                        {item.reply_to.message}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={[styles.body, mine && styles.bodyMine]}>
                    {item.message}
                  </Text>
                  {item.edited_at ? (
                    <Text style={[styles.edited, mine && styles.editedMine]}>
                      {t('lessons.chatEdited')}
                      {editedLabel ? ` ${editedLabel}` : ''}
                    </Text>
                  ) : null}
                  {!!item.reactions?.length && (
                    <View style={styles.reactions}>
                      {item.reactions.map((reaction: ChatReaction) => (
                        <Pressable
                          key={reaction.emoji}
                          onPress={() =>
                            toggleReaction(item.id, reaction.emoji)
                          }
                          style={[
                            styles.reactionChip,
                            reaction.reacted_by_me && styles.reactionMine,
                          ]}>
                          <Text style={styles.reactionText}>
                            {reaction.emoji} {reaction.count}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <View style={styles.actions}>
                    <Pressable onPress={() => startReply(item)}>
                      <Text
                        style={[
                          styles.actionBtn,
                          mine && styles.actionBtnMine,
                        ]}>
                        {t('lessons.chatReply')}
                      </Text>
                    </Pressable>
                    {mine ? (
                      <Pressable onPress={() => startEdit(item)}>
                        <Text style={[styles.actionBtn, styles.actionBtnMine]}>
                          {t('lessons.chatEdit')}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() =>
                        setReactionForId(showPicker ? null : item.id)
                      }>
                      <Text
                        style={[
                          styles.actionBtn,
                          mine && styles.actionBtnMine,
                        ]}>
                        {t('lessons.chatReact')}
                      </Text>
                    </Pressable>
                  </View>
                  {showPicker ? (
                    <View style={styles.emojiPicker}>
                      {CHAT_ALLOWED_EMOJIS.map(emoji => (
                        <Pressable
                          key={emoji}
                          onPress={() => {
                            toggleReaction(item.id, emoji);
                            setReactionForId(null);
                          }}
                          style={[
                            styles.emojiBtn,
                            myEmoji === emoji && styles.emojiBtnActive,
                          ]}>
                          <Text style={styles.emoji}>{emoji}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }}
        />

        {(replyTo || editing) && (
          <View style={styles.modeBar}>
            <View style={styles.modeTextWrap}>
              <Text style={styles.modeTitle}>
                {editing
                  ? t('lessons.chatEditing')
                  : `${t('lessons.chatReplyingTo')} ${replyTo?.sender || ''}`}
              </Text>
              <Text style={styles.modePreview} numberOfLines={1}>
                {editing ? editing.message : replyTo?.message}
              </Text>
            </View>
            <Pressable onPress={clearComposerMode} hitSlop={8}>
              <Text style={styles.modeCancel}>✕</Text>
            </Pressable>
          </View>
        )}

        <View
          style={[
            styles.composer,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              marginBottom: keyboardHeight,
            },
          ]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('lessons.typeMessage')}
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            maxLength={2000}
          />
          <Pressable
            onPress={onSend}
            disabled={!draft.trim()}
            style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}>
            <Text style={styles.sendText}>
              {editing ? t('lessons.chatSave') : t('lessons.chatSend')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  headerText: {flex: 1, gap: 2},
  title: {fontSize: 20, fontWeight: '800', color: colors.primary},
  status: {fontSize: 12, color: colors.muted},
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {fontSize: 22, color: colors.muted},
  list: {padding: 16, gap: 12, flexGrow: 1},
  empty: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 40,
  },
  bubbleWrap: {maxWidth: '88%'},
  bubbleWrapMine: {alignSelf: 'flex-end'},
  bubbleWrapOther: {alignSelf: 'flex-start'},
  bubble: {
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
  },
  bubbleOther: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleReplyTarget: {
    borderWidth: 2,
    borderColor: '#F5C542',
  },
  sender: {fontSize: 11, fontWeight: '700', color: colors.primary},
  replyQuote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 8,
    marginBottom: 2,
    gap: 2,
  },
  replyQuoteMine: {
    borderLeftColor: 'rgba(255,255,255,0.7)',
  },
  replySender: {fontSize: 11, fontWeight: '700', color: colors.primary},
  replySenderMine: {color: 'rgba(255,255,255,0.9)'},
  replyText: {fontSize: 12, color: colors.textSecondary},
  replyTextMine: {color: 'rgba(255,255,255,0.85)'},
  body: {fontSize: 15, lineHeight: 20, color: colors.text},
  bodyMine: {color: colors.white},
  edited: {fontSize: 11, color: colors.muted},
  editedMine: {color: 'rgba(255,255,255,0.75)'},
  reactions: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  reactionChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reactionMine: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  reactionText: {fontSize: 13},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2},
  actionBtn: {fontSize: 12, fontWeight: '700', color: colors.primary},
  actionBtnMine: {color: 'rgba(255,255,255,0.92)'},
  emojiPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  emojiBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  emoji: {fontSize: 18},
  modeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.primarySoft,
  },
  modeTextWrap: {flex: 1, gap: 2},
  modeTitle: {fontSize: 12, fontWeight: '700', color: colors.primary},
  modePreview: {fontSize: 12, color: colors.textSecondary},
  modeCancel: {fontSize: 18, color: colors.muted, paddingHorizontal: 4},
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.inputBg,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {opacity: 0.45},
  sendText: {color: colors.white, fontWeight: '700'},
});
