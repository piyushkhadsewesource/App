// ─────────────────────────────────────────────────────────────────────────
// Capture or pick a photo, then downscale + compress it to a small base64
// JPEG so it fits comfortably inside a synced record (well under Firestore's
// 1 MB document limit) with no separate file storage to configure.
// ─────────────────────────────────────────────────────────────────────────
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type PhotoSource = 'camera' | 'library';

const MAX_WIDTH = 1000;
const QUALITY = 0.5;

async function ensurePermission(source: PhotoSource): Promise<boolean> {
  if (source === 'camera') {
    const res = await ImagePicker.requestCameraPermissionsAsync();
    return res.granted;
  }
  const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return res.granted;
}

/**
 * Returns a `data:image/jpeg;base64,...` string, or null if the user cancelled.
 * Throws Error('permission-denied') if access was refused.
 */
export async function capturePhoto(source: PhotoSource): Promise<string | null> {
  const granted = await ensurePermission(source);
  if (!granted) throw new Error('permission-denied');

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 5],
    quality: 1,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const edited = await manipulateAsync(
    asset.uri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: QUALITY, base64: true, format: SaveFormat.JPEG },
  );
  if (!edited.base64) return null;
  return `data:image/jpeg;base64,${edited.base64}`;
}
