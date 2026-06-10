import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, Alert, ActionSheetIOS, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, shadow, radius, EVENT_EMOJIS, EVENT_COLORS } from '../utils/theme';
import { loadEvents, saveEvents, loadNextId, isDoneToday, shouldShowToday } from '../utils/storage';
import TimeTimer from '../components/TimeTimer';
import EventCard from '../components/EventCard';

const PREP_OPTIONS = [
  { label: 'なし', value: 0 },
  { label: '15分前', value: 15 },
  { label: '30分前', value: 30 },
  { label: '1時間前', value: 60 },
];
const REPEAT_OPTIONS = [
  { label: 'なし', value: 'none' },
  { label: '毎日', value: 'daily' },
  { label: '毎週', value: 'weekly' },
  { label: '毎月', value: 'monthly' },
];

export default function TodayScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [focusMode, setFocusMode] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(false);

  // 編集モーダル
  const [editTarget, setEditTarget] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editPrep, setEditPrep] = useState(0);
  const [editRepeat, setEditRepeat] = useState('none');
  const [editColor, setEditColor] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadEvents().then(setEvents);
    }, [])
  );

  const todayEvents = events
    .filter(ev => shouldShowToday(ev))
    .sort((a, b) => a.time.localeCompare(b.time));

  const doneCount = todayEvents.filter(ev => isDoneToday(ev)).length;
  const total = todayEvents.length;
  const progress = total > 0 ? doneCount / total : 0;

  // ── 完了トグル ────────────────────────────────────────
  const toggleDone = async (id) => {
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    const wasDone = isDoneToday(ev);
    const today = new Date().toDateString();
    const updated = events.map(e => {
      if (e.id !== id) return e;
      if (!e.repeat || e.repeat === 'none') return { ...e, done: !e.done };
      return { ...e, lastDoneDate: e.lastDoneDate === today ? null : today };
    });
    setEvents(updated);
    await saveEvents(updated);

    if (!wasDone) {
      // ⑥ 完了フィードバック
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playDing();
      setConfettiVisible(true);
      setTimeout(() => setConfettiVisible(false), 2000);
    }
  };

  const playDing = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 120);
    } catch (e) {}
  };

  // ── カードタップ → アクションシート ─────────────────
  const handleCardPress = (ev) => {
    const done = isDoneToday(ev);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: `${ev.emoji} ${ev.title}`,
        message: `${ev.time}〜`,
        options: [
          done ? '✕ 未完了に戻す' : '✓ 完了にする',
          '✏️ 編集する',
          '🗑️ 削除する',
          'キャンセル',
        ],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 3,
      },
      (index) => {
        if (index === 0) toggleDone(ev.id);
        if (index === 1) openEdit(ev);
        if (index === 2) handleDelete(ev.id);
      }
    );
  };

  const openEdit = (ev) => {
    setEditTarget(ev);
    setEditTitle(ev.title);
    setEditEmoji(ev.emoji);
    setEditTime(ev.time);
    setEditPrep(ev.prep);
    setEditRepeat(ev.repeat);
    setEditColor(ev.color);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) { Alert.alert('エラー', '予定の名前を入力してください'); return; }
    const updated = events
      .map(e => e.id === editTarget.id
        ? { ...e, title: editTitle.trim(), emoji: editEmoji, time: editTime, prep: editPrep, repeat: editRepeat, color: editColor }
        : e)
      .sort((a, b) => a.time.localeCompare(b.time));
    setEvents(updated);
    await saveEvents(updated);
    setEditTarget(null);
  };

  const handleDelete = (id) => {
    Alert.alert('削除しますか？', 'この予定を削除します。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          const newEvents = events.filter(e => e.id !== id);
          setEvents(newEvents);
          await saveEvents(newEvents);
        }
      },
    ]);
  };

  // ── 励ましメッセージ ─────────────────────────────────
  const encourageTitle = doneCount === 0 ? '今日もよろしくね！'
    : doneCount === total ? '全部できた！すごい！🎉'
    : `${doneCount}つ完了！いい調子！`;
  const encourageBody = doneCount === 0 ? '最初の予定から始めてみよう 💪'
    : doneCount === total ? '今日も一日お疲れさまでした。'
    : 'このまま続けよう。あと少し！';

  // ── フォーカスモード ─────────────────────────────────
  const nextEvent = todayEvents.find(ev => !isDoneToday(ev));

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>やさしいスケジュール</Text>
          <Text style={styles.dateLabel}>
            {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.focusBtn, focusMode && styles.focusBtnActive]}
          onPress={() => setFocusMode(f => !f)}
        >
          <Text style={[styles.focusBtnText, focusMode && styles.focusBtnTextActive]}>
            {focusMode ? '🎯 全表示' : '🎯 集中'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 挨拶 */}
        <Text style={styles.summary}>
          {total === 0 ? '今日は予定がありません。ゆっくり休もう☕' : `今日は${total}つの予定があります`}
        </Text>

        {/* 進捗バー */}
        <View style={styles.progressWrap}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>今日の進み具合</Text>
            <Text style={styles.progressLabel}>{doneCount} / {total} 完了</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        {/* タイムタイマー */}
        <TimeTimer events={events} />

        {/* フォーカスモード */}
        {focusMode ? (
          nextEvent ? (
            <View style={styles.focusCard}>
              <Text style={styles.focusLabel}>今やること</Text>
              <Text style={styles.focusEmoji}>{nextEvent.emoji}</Text>
              <Text style={styles.focusTitle}>{nextEvent.title}</Text>
              <Text style={styles.focusTime}>
                ⏰ {nextEvent.time}〜{nextEvent.prep > 0 ? ` ・ ${nextEvent.prep}分前準備` : ''}
              </Text>
              <TouchableOpacity style={styles.focusCheckBtn} onPress={() => toggleDone(nextEvent.id)}>
                <Text style={styles.focusCheckBtnText}>✓ 完了した！</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.focusDoneAll}>
              <Text style={{ fontSize: 48 }}>🎉</Text>
              <Text style={styles.focusDoneText}>今日の予定は全部完了！</Text>
            </View>
          )
        ) : null}

        {/* 励ましカード */}
        <View style={styles.encourageCard}>
          <Text style={{ fontSize: 28 }}>🌟</Text>
          <View>
            <Text style={styles.encourageTitle}>{encourageTitle}</Text>
            <Text style={styles.encourageBody}>{encourageBody}</Text>
          </View>
        </View>

        {/* タイムライン */}
        {!focusMode && (
          <View style={styles.timeline}>
            {todayEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 48 }}>✨</Text>
                <Text style={styles.emptyText}>今日は予定がありません{'\n'}＋ボタンから追加してみよう</Text>
              </View>
            ) : (
              todayEvents.map((ev, i) => (
                <EventCard
                  key={ev.id}
                  ev={ev}
                  onCheck={toggleDone}
                  onPress={handleCardPress}
                  isLast={i === todayEvents.length - 1}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* 完了トースト */}
      {confettiVisible && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>🎉 やった！</Text>
        </View>
      )}

      {/* 編集モーダル */}
      <Modal visible={!!editTarget} animationType="slide" transparent>
        <View style={styles.editOverlay}>
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>予定を編集</Text>

            <Text style={styles.editLabel}>名前</Text>
            <TextInput style={styles.editInput} value={editTitle} onChangeText={setEditTitle} placeholderTextColor={colors.textMuted} />

            <Text style={styles.editLabel}>絵文字</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {EVENT_EMOJIS.map(em => (
                  <TouchableOpacity key={em} style={[styles.emojiOpt, editEmoji === em && styles.emojiOptSelected]} onPress={() => setEditEmoji(em)}>
                    <Text style={{ fontSize: 22 }}>{em}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.editLabel}>時間</Text>
            <TextInput style={styles.editInput} value={editTime} onChangeText={setEditTime} keyboardType="numbers-and-punctuation" placeholderTextColor={colors.textMuted} />

            <Text style={styles.editLabel}>準備時間</Text>
            <View style={styles.chipRow}>
              {PREP_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value} style={[styles.chip, editPrep === opt.value && styles.chipSelected]} onPress={() => setEditPrep(opt.value)}>
                  <Text style={[styles.chipText, editPrep === opt.value && styles.chipTextSelected]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.editLabel}>繰り返し</Text>
            <View style={styles.chipRow}>
              {REPEAT_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value} style={[styles.chip, editRepeat === opt.value && styles.chipSelected]} onPress={() => setEditRepeat(opt.value)}>
                  <Text style={[styles.chipText, editRepeat === opt.value && styles.chipTextSelected]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.editLabel}>カラー</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {EVENT_COLORS.map(c => (
                <TouchableOpacity key={c} style={[styles.colorOpt, { backgroundColor: c }, editColor === c && styles.colorOptSelected]} onPress={() => setEditColor(c)} />
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
              <Text style={styles.saveBtnText}>保存する</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setEditTarget(null)}>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.card, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  appName: { fontSize: 20, fontWeight: '800', color: colors.text },
  dateLabel: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  focusBtn: { backgroundColor: colors.primaryLight, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 7 },
  focusBtnActive: { backgroundColor: colors.primary },
  focusBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  focusBtnTextActive: { color: '#fff' },
  scroll: { paddingTop: 16, paddingBottom: 32 },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.text, paddingHorizontal: 20 },
  summary: { fontSize: 14, color: colors.textMuted, marginTop: 6, marginBottom: 12, paddingHorizontal: 20 },
  progressWrap: { marginHorizontal: 20, marginBottom: 16 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: colors.textMuted },
  progressTrack: { height: 6, backgroundColor: colors.primaryLight, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 99 },
  focusCard: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: colors.primary, borderRadius: radius.lg, padding: 24,
  },
  focusLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  focusEmoji: { fontSize: 48, marginTop: 12, marginBottom: 8 },
  focusTitle: { fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 28 },
  focusTime: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  focusCheckBtn: { backgroundColor: '#fff', borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: 18 },
  focusCheckBtnText: { fontSize: 16, fontWeight: '800', color: colors.primary },
  focusDoneAll: { ...shadow, backgroundColor: colors.card, borderRadius: radius.lg, padding: 32, marginHorizontal: 20, marginBottom: 16, alignItems: 'center' },
  focusDoneText: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 10 },
  encourageCard: {
    marginHorizontal: 20, marginBottom: 16, padding: 14,
    backgroundColor: colors.primary, borderRadius: radius.lg,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  encourageTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  encourageBody: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  timeline: { paddingHorizontal: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  toast: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    backgroundColor: colors.success, borderRadius: radius.full,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // 編集モーダル
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  editCard: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  editTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 },
  editLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  editInput: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: 12, fontSize: 15, color: colors.text, marginBottom: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.primaryLight },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  chipTextSelected: { color: '#fff' },
  emojiOpt: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  emojiOptSelected: { borderColor: colors.primary },
  colorOpt: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: 'transparent' },
  colorOptSelected: { borderColor: colors.text },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
