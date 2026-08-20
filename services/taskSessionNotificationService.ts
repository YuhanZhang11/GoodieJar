import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const FOCUS_GOAL_NOTIFICATION_TYPE = 'GOODIEJAR_FOCUS_GOAL_REACHED';
const FOCUS_GOAL_CHANNEL_ID = 'goodiejar-focus-goals';

type FocusGoalNotificationData = {
  type: typeof FOCUS_GOAL_NOTIFICATION_TYPE;
  taskSessionId: string;
};

type NotificationSubscription = {
  remove: () => void;
};

function isFocusGoalNotification(notification: Notifications.Notification): boolean {
  return notification.request.content.data.type === FOCUS_GOAL_NOTIFICATION_TYPE;
}

async function configureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(FOCUS_GOAL_CHANNEL_ID, {
    name: 'Focus goals',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

async function hasNotificationPermission(): Promise<boolean> {
  const existingPermission = await Notifications.getPermissionsAsync();

  if (existingPermission.status === Notifications.PermissionStatus.GRANTED) {
    return true;
  }

  if (
    existingPermission.status !== Notifications.PermissionStatus.UNDETERMINED ||
    !existingPermission.canAskAgain
  ) {
    return false;
  }

  const requestedPermission = await Notifications.requestPermissionsAsync();

  return requestedPermission.status === Notifications.PermissionStatus.GRANTED;
}

export function configureFocusGoalNotifications(): NotificationSubscription {
  if (Platform.OS === 'web') {
    return { remove: () => undefined };
  }

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const shouldPresent = isFocusGoalNotification(notification);

      return {
        shouldShowBanner: shouldPresent,
        shouldShowList: shouldPresent,
        shouldPlaySound: shouldPresent,
        shouldSetBadge: false,
      };
    },
  });

  void configureAndroidChannel().catch((error) => {
    console.warn('Focus notification channel setup failed:', error);
  });

  return Notifications.addNotificationReceivedListener((notification) => {
    if (!isFocusGoalNotification(notification)) {
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      (error) => {
        console.warn('Focus goal haptic failed:', error);
      }
    );
  });
}

export async function prepareFocusGoalNotificationScheduling(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return false;
    }

    await configureAndroidChannel();
    return await hasNotificationPermission();
  } catch (error) {
    console.warn('Focus goal notification permission setup failed:', error);
    return false;
  }
}

export async function scheduleFocusGoalNotification(input: {
  taskSessionId: string;
  taskName: string;
  remainingGoalSeconds: number;
}): Promise<string | null> {
  try {
    await configureAndroidChannel();

    const data: FocusGoalNotificationData = {
      type: FOCUS_GOAL_NOTIFICATION_TYPE,
      taskSessionId: input.taskSessionId,
    };

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Goal reached',
        body: `You reached your focus goal for ${input.taskName}.`,
        data,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        channelId: Platform.OS === 'android' ? FOCUS_GOAL_CHANNEL_ID : undefined,
        repeats: false,
        seconds: Math.max(1, Math.ceil(input.remainingGoalSeconds)),
      },
    });
  } catch (error) {
    console.warn('Focus goal notification scheduling failed:', error);
    return null;
  }
}

export async function cancelFocusGoalNotification(
  notificationId: string | null
): Promise<void> {
  if (!notificationId) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Focus goal notification cancellation failed:', error);
  }
}
