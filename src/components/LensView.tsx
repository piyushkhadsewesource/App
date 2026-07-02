// ─────────────────────────────────────────────────────────────────────────
// The Lens — hold the world up to your camera and see which way they are.
//
// A full-screen camera pass-through with a minimal ink overlay: when your
// heading is within a few degrees of the bearing to your partner, the reticle
// blooms — "{name} is straight ahead". Otherwise a soft chevron tells you
// which way to turn. With no live heading available (older binary / desktop),
// it falls back to the 16-wind direction so the moment still lands.
//
// expo-camera is loaded via a guarded require at module scope: on binaries
// built before the dependency existed the require throws, CameraMod stays
// null, and the caller sees a graceful "not available yet" body instead of a
// crash. Web uses getUserMedia through the same API.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { hSuccess } from '../lib/haptics';
import { cardinal16 } from '../lib/geo';
import { useHeading } from '../lib/useHeading';
import { colors, font, radius, spacing } from '../theme';

let CameraMod: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  CameraMod = require('expo-camera');
} catch {
  /* binary predates expo-camera — lens shows its fallback body */
}

export default function LensView({
  visible,
  onClose,
  bearing,
  partnerName,
  km,
}: {
  visible: boolean;
  onClose: () => void;
  bearing: number;
  partnerName: string;
  km: number;
}) {
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      {CameraMod?.CameraView ? (
        <LensBody onClose={onClose} bearing={bearing} partnerName={partnerName} km={km} />
      ) : (
        <View style={[styles.fill, styles.center, { backgroundColor: colors.bg }]}>
          <Text style={styles.fallbackTitle}>The lens needs a newer build</Text>
          <Text style={styles.fallbackSub}>
            {partnerName} is {km.toLocaleString()} km to the {cardinal16(bearing)} — the camera view
            arrives with the next app update.
          </Text>
          <CloseButton onClose={onClose} dark={false} />
        </View>
      )}
    </Modal>
  );
}

/** Separate component so camera hooks only ever run when the module exists. */
function LensBody({
  onClose,
  bearing,
  partnerName,
  km,
}: {
  onClose: () => void;
  bearing: number;
  partnerName: string;
  km: number;
}) {
  const { CameraView, useCameraPermissions } = CameraMod;
  const [permission, requestPermission] = useCameraPermissions();
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

  const heading = useHeading();
  // Signed offset to the target: 0 = dead ahead, negative = turn left.
  const diff = heading == null ? null : ((bearing - heading + 540) % 360) - 180;
  const ahead = diff != null && Math.abs(diff) <= 12;
  useEffect(() => {
    if (ahead) hSuccess(); // the "found them" pulse
  }, [ahead]);

  const guide =
    diff == null
      ? `${partnerName} is to the ${cardinal16(bearing)}`
      : ahead
        ? `${partnerName} is straight ahead 🤍`
        : diff < 0
          ? `‹ turn left`
          : `turn right ›`;

  if (!permission?.granted) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.bg }]}>
        <Text style={styles.fallbackTitle}>The lens needs your camera</Text>
        <Text style={styles.fallbackSub}>
          Allow camera access and the world will show you which way {partnerName} is.
        </Text>
        <CloseButton onClose={onClose} dark={false} />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />
      {/* Scrim + reticle overlay */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
        <View style={[styles.reticle, ahead && styles.reticleFound]}>
          {ahead ? <Text style={{ fontSize: 34 }}>🤍</Text> : null}
        </View>
      </View>
      <View pointerEvents="none" style={styles.captionWrap}>
        <Text style={styles.caption}>{guide}</Text>
        <Text style={styles.captionSub}>
          {km.toLocaleString()} km, through everything in the way
        </Text>
      </View>
      <CloseButton onClose={onClose} dark />
    </View>
  );
}

function CloseButton({ onClose, dark }: { onClose: () => void; dark: boolean }) {
  return (
    <Pressable
      onPress={onClose}
      accessibilityRole="button"
      accessibilityLabel="Close the lens"
      style={[styles.close, dark ? styles.closeDark : styles.closeLight]}
    >
      <Text style={[styles.closeText, { color: dark ? colors.white : colors.text }]}>Close</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },

  reticle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleFound: { borderColor: colors.primary, borderWidth: 3, backgroundColor: 'rgba(236,110,148,0.18)' },

  captionWrap: { position: 'absolute', left: 0, right: 0, bottom: 120, alignItems: 'center', paddingHorizontal: spacing.xl },
  caption: {
    color: colors.white,
    fontFamily: font.family.displaySemi,
    fontSize: font.size.xxl,
    textAlign: 'center',
    letterSpacing: font.tracking.heading,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 12,
  },
  captionSub: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: font.family.body,
    fontSize: font.size.md,
    marginTop: spacing.sm,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 10,
  },

  close: { position: 'absolute', top: 56, right: 20, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  closeDark: { backgroundColor: 'rgba(0,0,0,0.45)' },
  closeLight: { position: 'relative', top: undefined, right: undefined, marginTop: spacing.xl, backgroundColor: colors.surfaceAlt },
  closeText: { fontFamily: font.family.bold, fontSize: font.size.md },

  fallbackTitle: {
    fontFamily: font.family.displaySemi,
    fontSize: font.size.xl,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  fallbackSub: {
    fontFamily: font.family.body,
    fontSize: font.size.md,
    color: colors.textSoft,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  },
});
