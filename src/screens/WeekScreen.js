import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, shadow, radius, REPEAT_LABEL } from '../utils/theme';
import { loadEvents, shouldShowToday } from '../utils/storage';

const DAYS = ['日','月','火','水','木','金','土'];

export default function WeekScreen() {
  const [events, setEvents] = useState([]);
  const now = new Date();
  const [selectedIndex, setSelectedIndex] = useState(now.getDay());
  const [weekOffset, setWeekOffset] = useState(0); // 0=今週, -1=先週, 1=来週

  useFocusEffect(useCallback(() => { loadEvents().then(setEvents); }, []));

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + weekOffset * 7);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const hasEvents = (dayIndex) => events.some(ev => {
    if (ev.repeat === 'daily') return true;
    if (ev.repeat === 'weekly') return dayIndex === (ev.repeatDay ?? now.getDay());
    if (ev.repeat === 'monthly') return true;
    return dayIndex === now.getDay();
  });

  const dayEvents = events
    .filter(ev => {
      if (ev.repeat === 'daily') return true;
      if (ev.repeat === 'weekly') return selectedIndex === (ev.repeatDay ?? now.getDay());
      if (ev.repeat === 'monthly') return true;
      return selectedIndex === now.getDay();
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>スケジュール</Text>
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => { setWeekOffset(w => w - 1); setSelectedIndex(0); }} style={styles.navBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.dateLabel}>
            {weekOffset === 0 ? '今週' : weekOffset === -1 ? '先週' : weekOffset === 1 ? '来週' : `${weekOffset > 0 ? '+' : ''}${weekOffset}週`}
          </Text>
          <TouchableOpacity onPress={() => { setWeekOffset(w => w + 1); setSelectedIndex(0); }} style={styles.navBtn}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 曜日セレクター */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll} contentContainerStyle={styles.weekRow}>
        {weekDays.map((d, i) => {
          const isToday = d.toDateString() === now.toDateString();
          const isSelected = i === selectedIndex;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dayBtn, isSelected && styles.dayBtnSelected]}
              onPress={() => setSelectedIndex(i)}
            >
              <Text style={[styles.dayName, isSelected && styles.dayTextSelected]}>{DAYS[i]}</Text>
              <Text style={[styles.dayNum, isToday && styles.dayNumToday, isSelected && styles.dayTextSelected]}>
                {d.getDate()}
              </Text>
              <View style={[styles.dayDot, hasEvents(i) && styles.dayDotActive, isSelected && styles.dayDotSelected]} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 予定リスト */}
      <ScrollView contentContainerStyle={styles.eventList}>
        {dayEvents.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>📅</Text>
            <Text style={styles.emptyText}>この日の予定はありません</Text>
          </View>
        ) : (
          dayEvents.map(ev => (
            <View key={ev.id} style={[styles.eventItem, { borderLeftColor: ev.color }]}>
              <Text style={styles.eventEmoji}>{ev.emoji}</Text>
              <View>
                <Text style={styles.eventTitle}>{ev.title}</Text>
                <Text style={styles.eventMeta}>
                  {ev.time}{ev.repeat !== 'none' ? ` ・ 🔁${REPEAT_LABEL[ev.repeat]}` : ''}{ev.prep > 0 ? ` ・ ⏱${ev.prep}分前` : ''}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.card, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  appName: { fontSize: 20, fontWeight: '800', color: colors.text },
  weekNav: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  navBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  navArrow: { fontSize: 22, color: colors.primary, fontWeight: '700' },
  dateLabel: { fontSize: 13, color: colors.textMuted, minWidth: 40, textAlign: 'center' },
  weekScroll: { maxHeight: 90, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  weekRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  dayBtn: { width: 52, paddingVertical: 10, borderRadius: 14, alignItems: 'center' },
  dayBtnSelected: { backgroundColor: colors.primary },
  dayName: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  dayNum: { fontSize: 20, fontWeight: '800', color: colors.text, marginVertical: 4 },
  dayNumToday: { color: colors.primary },
  dayTextSelected: { color: '#fff' },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.border },
  dayDotActive: { backgroundColor: colors.primary },
  dayDotSelected: { backgroundColor: 'rgba(255,255,255,0.6)' },
  eventList: { padding: 16, gap: 10 },
  eventItem: { ...shadow, backgroundColor: colors.card, borderRadius: radius.md, padding: 14, borderLeftWidth: 4, flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventEmoji: { fontSize: 20 },
  eventTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  eventMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: colors.textMuted, marginTop: 10 },
});
