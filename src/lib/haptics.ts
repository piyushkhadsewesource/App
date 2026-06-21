// Safe haptic helpers. No-ops on web; never throw.
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const native = Platform.OS === 'ios' || Platform.OS === 'android';

export function hLight() {
  if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
export function hMedium() {
  if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
export function hHeavy() {
  if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}
export function hSuccess() {
  if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
export function hWarn() {
  if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
