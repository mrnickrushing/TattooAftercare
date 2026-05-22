/**
 * pushNotifications.js
 * Manages Expo push notification permissions and scheduling.
 * Includes the "This Day in Healing" anniversary scheduler.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { format, parseISO, addYears, differenceInDays } from 'date-fns';

// How notifications behave when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

/**
 * Request permission + return the Expo push token.
 * Returns null on simulator / web.
 */
export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

/**
 * Schedule daily care reminder at a given hour (default 9am).
 * Safe to call multiple times — cancels existing before rescheduling.
 */
export async function scheduleDailyCareReminder(tattooName, hour = 9) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💧 Daily Care Reminder',
      body: `Time to care for "${tattooName}" — wash and moisturize!`,
      data: { type: 'care_reminder' },
    },
    trigger: {
      hour,
      minute: 0,
      repeats: true,
    },
  });
}

/**
 * Schedule "This Day in Healing" anniversary notifications for all tattoos.
 * For each tattoo, schedule a notification on the 1-year, 2-year, etc. anniversaries.
 * Only schedules up to 2 years out (Expo limit: 64 scheduled notifications).
 */
export async function scheduleAnniversaryNotifications(tattoos = []) {
  // Cancel any previously scheduled anniversary notifications
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content?.data?.type === 'anniversary') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  const now = new Date();
  for (const tattoo of tattoos) {
    if (!tattoo.date_tattooed) continue;
    const inkDate = parseISO(tattoo.date_tattooed);
    const daysSince = differenceInDays(now, inkDate);

    // Schedule 1-year anniversary if not yet passed
    for (let year = 1; year <= 2; year++) {
      const anniversary = addYears(inkDate, year);
      if (anniversary > now) {
        const yearLabel = year === 1 ? '1 year' : `${year} years`;
        const formattedDate = format(inkDate, 'MMMM d, yyyy');
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🎂 ${yearLabel} with your ink!`,
            body: `"${tattoo.name}" — you got this on ${formattedDate}. Check out how it healed!`,
            data: { type: 'anniversary', tattooId: tattoo.id },
          },
          trigger: {
            date: anniversary,
          },
        });
        break; // only schedule the next upcoming anniversary per tattoo
      }
    }
  }
}

/**
 * Schedule a healing milestone reminder (called when a tattoo is added).
 * Schedules notifications at Day 3, 7, 14, 30 from the tattoo date.
 */
export async function scheduleMilestoneReminders(tattoo) {
  if (!tattoo?.date_tattooed || !tattoo?.id) return;
  const inkDate = parseISO(tattoo.date_tattooed);
  const milestones = [
    { days: 3,  emoji: '🌱', msg: 'Day 3 check-in! Keep it clean and moisturized.' },
    { days: 7,  emoji: '⚡', msg: 'One week in! Peeling is normal — don\'t pick.' },
    { days: 14, emoji: '✨', msg: 'Two weeks! Colors are starting to settle.' },
    { days: 30, emoji: '🏆', msg: 'Day 30 — surface healing complete!' },
  ];

  for (const m of milestones) {
    const triggerDate = new Date(inkDate.getTime() + m.days * 86400000);
    if (triggerDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${m.emoji} ${tattoo.name} — Day ${m.days}`,
          body: m.msg,
          data: { type: 'milestone', tattooId: tattoo.id, day: m.days },
        },
        trigger: { date: triggerDate },
      });
    }
  }
}

/**
 * Cancel all scheduled notifications (useful on tattoo delete).
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
