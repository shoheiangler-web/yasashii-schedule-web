import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadEventsFromCloud, saveEventsToCloud } from './cloudStorage';
import { scheduleAllNotifications } from './notifications';

const EVENTS_KEY = 'yasashii_events_v1';
const NEXT_ID_KEY = 'yasashii_next_id';

export const DEFAULT_EVENTS = [
  { id: 1, title: '薬を飲む',     emoji: '💊', time: '08:00', color: '#5CB85C', prep: 0,  repeat: 'daily',  repeatDay: null, repeatDate: null, lastDoneDate: null, done: false },
  { id: 2, title: '歯医者',       emoji: '🏥', time: '14:00', color: '#7C6FE0', prep: 30, repeat: 'none',   repeatDay: null, repeatDate: null, lastDoneDate: null, done: false },
  { id: 3, title: '夕食の買い物', emoji: '🛒', time: '17:30', color: '#F0A500', prep: 15, repeat: 'none',   repeatDay: null, repeatDate: null, lastDoneDate: null, done: false },
];

// UID を保持する変数（App.js から setCurrentUid() で設定）
let _uid = null;
export function setCurrentUid(uid) { _uid = uid; }
export function getCurrentUid() { return _uid; }

export async function loadEvents() {
  // クラウドが使える場合はクラウドを優先
  if (_uid) {
    try {
      const cloudEvents = await loadEventsFromCloud(_uid);
      if (cloudEvents) {
        await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(cloudEvents));
        return cloudEvents;
      }
    } catch (e) {
      // オフライン時はローカルにフォールバック
    }
  }

  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_EVENTS.map(e => ({ ...e }));
}

export async function saveEvents(events) {
  try {
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch (e) {}

  if (_uid) {
    try {
      await saveEventsToCloud(_uid, events);
    } catch (e) {
      // オフラインでも保存失敗を無視（ローカルには保存済み）
    }
  }

  scheduleAllNotifications(events).catch(() => {});
}

export async function loadNextId() {
  try {
    const raw = await AsyncStorage.getItem(NEXT_ID_KEY);
    if (raw) return parseInt(raw);
  } catch (e) {}
  return 10;
}

export async function saveNextId(id) {
  try {
    await AsyncStorage.setItem(NEXT_ID_KEY, String(id));
  } catch (e) {}
}

export async function clearAllData() {
  await AsyncStorage.multiRemove([EVENTS_KEY, NEXT_ID_KEY]);
}

// ── ヘルパー ──────────────────────────────────────────────
export const TODAY_STR = new Date().toDateString();

export function isDoneToday(ev) {
  if (!ev.repeat || ev.repeat === 'none') return ev.done;
  return ev.lastDoneDate === new Date().toDateString();
}

export function shouldShowToday(ev) {
  if (!ev.repeat || ev.repeat === 'none') return true;
  const d = new Date();
  if (ev.repeat === 'daily') return true;
  if (ev.repeat === 'weekly') return d.getDay() === (ev.repeatDay ?? d.getDay());
  if (ev.repeat === 'monthly') return d.getDate() === (ev.repeatDate ?? d.getDate());
  return true;
}
