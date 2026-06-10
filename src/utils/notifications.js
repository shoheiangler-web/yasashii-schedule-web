import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// 予定1件分の通知をスケジュール
export async function scheduleEventNotifications(ev) {
  await cancelEventNotifications(ev.id);

  const [hh, mm] = ev.time.split(':').map(Number);
  const now = new Date();

  const steps = [];
  if (ev.prep >= 60) steps.push({ minBefore: 60, msg: `1時間後に「${ev.title}」があります` });
  if (ev.prep >= 30) steps.push({ minBefore: 30, msg: `30分後に「${ev.title}」。そろそろ準備しよう！` });
  if (ev.prep >= 15) steps.push({ minBefore: 15, msg: `15分後に「${ev.title}」。準備はいい？` });
  steps.push({ minBefore: 0, msg: `「${ev.title}」の時間です！` });

  if (ev.repeat === 'daily') {
    // 毎日繰り返し → dailyトリガーで登録
    for (const step of steps) {
      const totalMin = hh * 60 + mm - step.minBefore;
      const triggerHour = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
      const triggerMin  = ((totalMin % 1440) + 1440) % 1440 % 60;
      await Notifications.scheduleNotificationAsync({
        identifier: `event-${ev.id}-${step.minBefore}`,
        content: { title: ev.emoji + ' ' + ev.title, body: step.msg, sound: true },
        trigger: { hour: triggerHour, minute: triggerMin, repeats: true },
      });
    }
  } else if (ev.repeat === 'weekly') {
    // 毎週繰り返し → weeklyトリガー
    const weekday = ev.repeatDay ?? now.getDay(); // 0=日〜6=土
    for (const step of steps) {
      const totalMin = hh * 60 + mm - step.minBefore;
      const triggerHour = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
      const triggerMin  = ((totalMin % 1440) + 1440) % 1440 % 60;
      await Notifications.scheduleNotificationAsync({
        identifier: `event-${ev.id}-${step.minBefore}`,
        content: { title: ev.emoji + ' ' + ev.title, body: step.msg, sound: true },
        trigger: { weekday: weekday + 1, hour: triggerHour, minute: triggerMin, repeats: true },
      });
    }
  } else if (ev.repeat === 'monthly') {
    // 毎月繰り返し → 今月・来月分を登録（expo-notificationsはmonthlyトリガー非対応のため）
    for (let monthOffset = 0; monthOffset <= 2; monthOffset++) {
      const trigger = new Date(now.getFullYear(), now.getMonth() + monthOffset, ev.repeatDate ?? now.getDate(), hh, mm, 0);
      for (const step of steps) {
        const t = new Date(trigger.getTime() - step.minBefore * 60000);
        if (t <= now) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: `event-${ev.id}-${step.minBefore}-m${monthOffset}`,
          content: { title: ev.emoji + ' ' + ev.title, body: step.msg, sound: true },
          trigger: { type: 'date', timestamp: t.getTime() },
        });
      }
    }
  } else {
    // 繰り返しなし → 当日1回だけ
    if (ev.done) return;
    for (const step of steps) {
      const trigger = new Date(now);
      trigger.setHours(hh, mm - step.minBefore, 0, 0);
      if (trigger <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `event-${ev.id}-${step.minBefore}`,
        content: { title: ev.emoji + ' ' + ev.title, body: step.msg, sound: true },
        trigger: { type: 'date', timestamp: trigger.getTime() },
      });
    }
  }
}

// 全予定の通知を一括登録
export async function scheduleAllNotifications(events) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const ev of events) {
    await scheduleEventNotifications(ev);
  }
}

export async function cancelEventNotifications(eventId) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith(`event-${eventId}-`)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
