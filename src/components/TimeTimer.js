import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, shadow, radius } from '../utils/theme';
import { isDoneToday, shouldShowToday } from '../utils/storage';

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const WINDOW_MINUTES = 180; // 3時間 = 満円

export default function TimeTimer({ events }) {
  const [now, setNow] = useState(new Date());

  // 30秒ごとに更新
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // 次の未完了予定を探す
  const upcoming = events
    .filter(ev => shouldShowToday(ev) && !isDoneToday(ev))
    .map(ev => {
      const [hh, mm] = ev.time.split(':').map(Number);
      const d = new Date(now);
      d.setHours(hh, mm, 0, 0);
      return { ...ev, evDate: d, diffMin: (d - now) / 60000 };
    })
    .filter(ev => ev.diffMin > -5)
    .sort((a, b) => a.diffMin - b.diffMin)[0];

  if (!upcoming || upcoming.diffMin > WINDOW_MINUTES) {
    return (
      <View style={styles.card}>
        <Text style={styles.restEmoji}>☕</Text>
        <Text style={styles.restText}>次の予定まで{'\n'}ゆっくりしてね</Text>
      </View>
    );
  }

  const minsLeft = Math.max(0, Math.round(upcoming.diffMin));
  const hLeft = Math.floor(minsLeft / 60);
  const mLeft = minsLeft % 60;
  const progress = Math.min(1, minsLeft / WINDOW_MINUTES);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const timerColor = minsLeft <= 10 ? colors.danger : minsLeft <= 30 ? colors.warning : colors.primary;
  const msgStyle = minsLeft <= 10 ? styles.msgNow : minsLeft <= 30 ? styles.msgSoon : styles.msgOk;
  const msgText = minsLeft <= 10 ? '🚨 今すぐ準備して！' : minsLeft <= 30 ? '⚡ そろそろ準備しよう' : '✅ 時間に余裕あり';
  const countdownText = hLeft > 0 ? `${hLeft}:${String(mLeft).padStart(2, '0')}` : String(minsLeft);
  const unitText = hLeft > 0 ? '時間後' : '分後';

  return (
    <View style={styles.card}>
      {/* 円形タイマー */}
      <View style={styles.circleWrap}>
        <Svg width={96} height={96} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={48} cy={48} r={RADIUS} fill="none" stroke={colors.primaryLight} strokeWidth={8} />
          <Circle
            cx={48} cy={48} r={RADIUS}
            fill="none"
            stroke={timerColor}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
          />
        </Svg>
        <View style={styles.timerCenter}>
          <Text style={[styles.countdown, { color: timerColor }]}>{countdownText}</Text>
          <Text style={styles.unit}>{unitText}</Text>
        </View>
      </View>

      {/* 予定情報 */}
      <View style={styles.info}>
        <Text style={styles.label}>次の予定</Text>
        <Text style={styles.eventName}>{upcoming.emoji} {upcoming.title}</Text>
        <Text style={styles.eventTime}>
          {upcoming.time}〜{upcoming.prep > 0 ? `（${upcoming.prep}分前準備）` : ''}
        </Text>
        <View style={msgStyle}>
          <Text style={styles.msgText}>{msgText}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadow,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  circleWrap: { width: 96, height: 96, position: 'relative' },
  timerCenter: {
    position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  countdown: { fontSize: 20, fontWeight: '800', lineHeight: 24 },
  unit: { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  info: { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  eventName: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 4 },
  eventTime: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  msgOk:   { backgroundColor: '#E8F5E9', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, alignSelf: 'flex-start' },
  msgSoon: { backgroundColor: '#FFF8E6', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, alignSelf: 'flex-start' },
  msgNow:  { backgroundColor: '#FFEBEE', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, alignSelf: 'flex-start' },
  msgText: { fontSize: 12, fontWeight: '600', color: colors.text },
  restEmoji: { fontSize: 32, textAlign: 'center' },
  restText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
