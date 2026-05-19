import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, parseISO } from 'date-fns';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Tattoo Care Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C8A951',
    });
  }

  return true;
}

export async function scheduleMorningReminder() {
  await Notifications.cancelScheduledNotificationAsync('morning-reminder').catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: 'morning-reminder',
    content: {
      title: 'Good morning! Time to care for your tattoo',
      body: "Don't forget to wash your tattoo with gentle, unscented soap.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });
}

export async function scheduleEveningReminder() {
  await Notifications.cancelScheduledNotificationAsync('evening-reminder').catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: 'evening-reminder',
    content: {
      title: 'Evening tattoo care check-in',
      body: 'Did you moisturize your tattoo today? Log your care routine!',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function cancelMorningReminder() {
  await Notifications.cancelScheduledNotificationAsync('morning-reminder').catch(() => {});
}

export async function cancelEveningReminder() {
  await Notifications.cancelScheduledNotificationAsync('evening-reminder').catch(() => {});
}

export async function scheduleStageTransitionNotification(stageName) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Your tattoo has entered a new healing stage!`,
      body: `You're now in the "${stageName}" stage. Check the app for updated care instructions.`,
      sound: true,
    },
    trigger: null, // immediate
  });
}

export async function scheduleTouchupReminder(tattooId, tattooName, healedDate) {
  const identifier = `touchup-${tattooId}`;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

  let reminderDate;
  try {
    reminderDate = addDays(parseISO(healedDate), 90);
  } catch {
    reminderDate = addDays(new Date(), 90);
  }

  // Only schedule if the date is in the future
  if (reminderDate > new Date()) {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: `Time to check on your "${tattooName}" tattoo!`,
        body: "It's been 3 months since your tattoo healed. Consider booking a touch-up appointment with your artist.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      },
    });
  }
}

export async function cancelTouchupReminder(tattooId) {
  const identifier = `touchup-${tattooId}`;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
}
