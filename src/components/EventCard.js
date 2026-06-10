import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { colors, shadow, radius, REPEAT_LABEL } from '../utils/theme';
import { isDoneToday } from '../utils/storage';

export default function EventCard({ ev, onCheck, onPress, isLast }) {
  const done = isDoneToday(ev);
  const now = new Date();
  const [hh, mm] = ev.time.split(':').map(Number);
  const evDate = new Date(now); evDate.setHours(hh, mm, 0, 0);
  const isCurrent = Math.abs(evDate - now) < 3600000 && !done;

  // チェック時のスケール animation
  const scale = useRef(new Animated.Value(1)).current;
  const handleCheck = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,   duration: 100, useNativeDriver: true }),
    ]).start();
    onCheck(ev.id);
  };

  return (
    <View style={styles.row}>
      {/* 時刻ラベル */}
      <Text style={styles.timeLabel}>{ev.time}</Text>

      {/* タイムライン線 */}
      <View style={styles.timelineCol}>
        <View style={[styles.dot, done && styles.dotDone, isCurrent && styles.dotCurrent]} />
        {!isLast && <View style={styles.connector} />}
      </View>

      {/* カード */}
      <TouchableOpacity
        style={[styles.card, done && styles.cardDone, { borderLeftColor: done ? 'transparent' : isCurrent ? colors.warning : ev.color }]}
        onPress={() => onPress(ev)}
        activeOpacity={0.85}
      >
        <View style={styles.top}>
          <View style={[styles.emojiBox, { backgroundColor: ev.color + '22' }]}>
            <Text style={styles.emoji}>{ev.emoji}</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.title, done && styles.titleDone]}>{ev.title}</Text>
            <Text style={styles.timeText}>{ev.time}〜</Text>
          </View>
          <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity style={[styles.check, done && styles.checkDone]} onPress={handleCheck}>
              {done && <Text style={styles.checkMark}>✓</Text>}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* バッジ行 */}
        <View style={styles.badges}>
          {ev.prep > 0 && !done && (
            <View style={styles.badgePrep}><Text style={styles.badgePrepText}>⏱ {ev.prep}分前アラート</Text></View>
          )}
          {ev.repeat && ev.repeat !== 'none' && (
            <View style={styles.badgeRepeat}><Text style={styles.badgeRepeatText}>🔁 {REPEAT_LABEL[ev.repeat]}</Text></View>
          )}
          {isCurrent && (
            <View style={styles.badgeCurrent}><Text style={styles.badgeCurrentText}>🔴 今この時間！</Text></View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  timeLabel: { width: 42, fontSize: 12, color: colors.textMuted, paddingTop: 16, textAlign: 'right' },
  timelineCol: { width: 10, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 16, borderWidth: 2, borderColor: '#fff' },
  dotDone: { backgroundColor: colors.textMuted },
  dotCurrent: { backgroundColor: colors.warning },
  connector: { width: 2, flex: 1, backgroundColor: colors.border, minHeight: 12 },
  card: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 14, borderLeftWidth: 4, borderLeftColor: 'transparent', ...shadow,
  },
  cardDone: { opacity: 0.5 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emojiBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20 },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  titleDone: { textDecorationLine: 'line-through' },
  timeText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  check: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badgePrep:    { backgroundColor: '#FFF8E6', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  badgePrepText: { fontSize: 11, fontWeight: '600', color: '#B07800' },
  badgeRepeat:    { backgroundColor: colors.primaryLight, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  badgeRepeatText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  badgeCurrent:    { backgroundColor: '#FFEBEE', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  badgeCurrentText: { fontSize: 11, fontWeight: '600', color: '#C62828' },
});
