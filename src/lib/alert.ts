// ─────────────────────────────────────────────────────────────────────────
// Cross-platform Alert.
//
// react-native-web ships `Alert.alert` as an empty function — on the web build
// (including the iOS Safari PWA) it does *nothing*. That silently breaks every
// button whose real work lives inside a confirmation dialog: the tap registers,
// the handler runs, `Alert.alert(...)` is called… and then nothing happens and
// nothing is sent. From the outside the button just looks dead.
//
// This shim keeps the exact `Alert.alert(title, message?, buttons?)` signature
// so call sites don't change. On native it forwards straight to React Native's
// real Alert (identical behaviour). On web it bridges to the browser's own
// blocking dialogs — window.confirm for a confirmation, window.alert for an
// informational message — and invokes the matching button's onPress, so the
// action actually runs.
// ─────────────────────────────────────────────────────────────────────────
import { Alert as RNAlert, AlertButton, AlertOptions, Platform } from 'react-native';

function webAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  const text = [title, message].filter(Boolean).join('\n\n');
  const hasWindow = typeof window !== 'undefined';

  // No buttons, or a single acknowledge button → purely informational.
  if (!buttons || buttons.length <= 1) {
    if (hasWindow) window.alert(text);
    // A lone button may still carry an onPress (an "OK" that does something).
    buttons?.[0]?.onPress?.();
    return;
  }

  // Confirmation dialog: a cancel button plus one (or more) action buttons.
  // The browser confirm gives two outcomes — OK runs the primary action,
  // Cancel runs the cancel handler (usually there isn't one). When no button
  // is explicitly marked 'cancel', fall back to RN's visual convention where
  // the last button is the default action and the first is the dismiss.
  const cancel = buttons.find((b) => b.style === 'cancel') ?? buttons[0];
  const primary = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
  const confirmed = hasWindow ? window.confirm(text) : false;
  if (confirmed) primary?.onPress?.();
  else if (cancel !== primary) cancel?.onPress?.();
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions): void {
    if (Platform.OS === 'web') {
      webAlert(title, message, buttons);
    } else {
      RNAlert.alert(title, message, buttons, options);
    }
  },
};
