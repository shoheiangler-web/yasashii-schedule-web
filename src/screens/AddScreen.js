import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
} from 'react-native';
import * as Speech from 'expo-speech';
import { colors, shadow, radius, EVENT_EMOJIS, EVENT_COLORS, REPEAT_LABEL } from '../utils/theme';
import { loadEvents, saveEvents, loadNextId, saveNextId } from '../utils/storage';

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

export default function AddScreen({ navigation, route }) {
  const prefill = route?.params?.prefill || {};
  const editEvent = route?.params?.event || null; // 編集モード用
  const isEdit = !!editEvent;

  const [title, setTitle] = useState(editEvent?.title || prefill.title || '');
  const [emoji, setEmoji] = useState(editEvent?.emoji || prefill.emoji || '🏥');
  const [time, setTime] = useState(editEvent?.time || prefill.time || '09:00');
  const [prep, setPrep] = useState(editEvent?.prep ?? 15);
  const [repeat, setRepeat] = useState(editEvent?.repeat || prefill.repeat || 'none');
  const [color, setColor] = useState(editEvent?.color || '#7C6FE0');
  const [listening, setListening] = useState(false);

  // ── ⑦ 音声入力（expo-speechはTTS。入力はVoice APIが必要）──
  // expo-speechはText-to-Speechのため、音声認識には
  // @react-native-voice/voice を別途インストールして使います。
  // ここではUIのみ実装し、実際の音声認識はコメントで示します。
  const startVoice = async () => {
    Alert.alert(
      '音声入力',
      '本番実装では @react-native-voice/voice を使います。\n\n「毎日8時に薬を飲む」のように話しかけてください。',
      [{ text: 'OK' }]
    );
    // 実装例:
    // import Voice from '@react-native-voice/voice';
    // Voice.onSpeechResults = (e) => parseVoice(e.value[0]);
    // await Voice.start('ja-JP');
  };

  // ── 予定を保存 ────────────────────────────────────────
  const handleAdd = async () => {
    if (!title.trim()) {
      Alert.alert('エラー', '予定の名前を入力してください');
      return;
    }

    if (isEdit) {
      const existing = await loadEvents();
      const updated = existing
        .map(e => e.id === editEvent.id ? { ...e, title: title.trim(), emoji, time, color, prep, repeat } : e)
        .sort((a, b) => a.time.localeCompare(b.time));
      await saveEvents(updated);
      navigation.goBack();
      return;
    }

    const existing = await loadEvents();
    const nextId = await loadNextId();
    const now = new Date();
    const newEvent = {
      id: nextId,
      title: title.trim(),
      emoji, time, color, prep, repeat,
      repeatDay: now.getDay(),
      repeatDate: now.getDate(),
      lastDoneDate: null,
      done: false,
    };
    const updated = [...existing, newEvent].sort((a, b) => a.time.localeCompare(b.time));
    await saveEvents(updated);
    await saveNextId(nextId + 1);

    Alert.alert('🎉 追加しました！', `「${title}」を登録したよ。`, [
      { text: '今日の予定を見る', onPress: () => navigation.navigate('Today') },
      { text: 'もう一つ追加', style: 'cancel', onPress: () => { setTitle(''); } },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.appName}>{isEdit ? '予定を編集' : '予定を追加'}</Text>
        <Text style={styles.dateLabel}>{isEdit ? editEvent.title : '声で話しかけるだけでOK'}</Text>
      </View>

      <View style={styles.inner}>
        {/* 音声ボタン */}
        <View style={styles.voiceArea}>
          <TouchableOpacity style={[styles.voiceBtn, listening && styles.voiceBtnListening]} onPress={startVoice}>
            <Text style={styles.voiceIcon}>🎙</Text>
          </TouchableOpacity>
          <Text style={styles.voiceLabel}>タップして話す</Text>
          <Text style={styles.voiceHint}>「毎日8時に薬を飲む」と話しかけてね</Text>
        </View>

        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} /><Text style={styles.dividerText}>または手入力</Text><View style={styles.dividerLine} />
        </View>

        {/* 名前 */}
        <View style={styles.group}>
          <Text style={styles.label}>予定の名前</Text>
          <TextInput
            style={styles.input} value={title} onChangeText={setTitle}
            placeholder="例：歯医者、会議、薬を飲む" placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* 絵文字 */}
        <View style={styles.group}>
          <Text style={styles.label}>絵文字</Text>
          <View style={styles.emojiRow}>
            {EVENT_EMOJIS.map(em => (
              <TouchableOpacity
                key={em} style={[styles.emojiOption, emoji === em && styles.emojiSelected]}
                onPress={() => setEmoji(em)}
              >
                <Text style={{ fontSize: 22 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 時間 */}
        <View style={styles.group}>
          <Text style={styles.label}>時間</Text>
          <TextInput
            style={styles.input} value={time} onChangeText={setTime}
            placeholder="09:00" placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* 準備時間 */}
        <View style={styles.group}>
          <Text style={styles.label}>準備時間</Text>
          <View style={styles.chipRow}>
            {PREP_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value} style={[styles.chip, prep === opt.value && styles.chipSelected]}
                onPress={() => setPrep(opt.value)}
              >
                <Text style={[styles.chipText, prep === opt.value && styles.chipTextSelected]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 繰り返し */}
        <View style={styles.group}>
          <Text style={styles.label}>🔁 繰り返し</Text>
          <View style={styles.chipRow}>
            {REPEAT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value} style={[styles.chip, repeat === opt.value && styles.chipSelected]}
                onPress={() => setRepeat(opt.value)}
              >
                <Text style={[styles.chipText, repeat === opt.value && styles.chipTextSelected]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* カラー */}
        <View style={styles.group}>
          <Text style={styles.label}>カラー</Text>
          <View style={styles.colorRow}>
            {EVENT_COLORS.map(c => (
              <TouchableOpacity
                key={c} style={[styles.colorOption, { backgroundColor: c }, color === c && styles.colorSelected]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleAdd}>
          <Text style={styles.submitText}>{isEdit ? '保存する' : '追加する'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 40 },
  header: { backgroundColor: colors.card, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  appName: { fontSize: 20, fontWeight: '800', color: colors.text },
  dateLabel: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  inner: { padding: 20 },
  voiceArea: { alignItems: 'center', marginBottom: 24 },
  voiceBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow },
  voiceBtnListening: { backgroundColor: colors.danger },
  voiceIcon: { fontSize: 34 },
  voiceLabel: { marginTop: 10, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  voiceHint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  dividerWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textMuted },
  group: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: 13, fontSize: 15, color: colors.text },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiOption: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  emojiSelected: { borderColor: colors.primary, backgroundColor: colors.card, ...shadow },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.primaryLight, borderWidth: 2, borderColor: 'transparent' },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  chipTextSelected: { color: '#fff' },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorOption: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: 'transparent' },
  colorSelected: { borderColor: colors.text },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
