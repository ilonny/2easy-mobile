import {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  PanResponder,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';

const JITSI_DOMAIN = 'meet.2easyeng.com';
const HEADER_H = 52;
const MIN_W = 300;
const MIN_H = 220;
const MAX_W = 720;
const MAX_H = 640;

function defaultVideoSize(
  screenW: number,
  screenH: number,
  isTablet: boolean,
) {
  if (isTablet) {
    return {
      w: Math.min(440, Math.max(380, screenW - 64)),
      h: Math.min(420, Math.max(340, Math.floor(screenH * 0.44))),
    };
  }
  return {
    w: Math.min(360, Math.max(MIN_W, screenW - 24)),
    h: Math.min(340, Math.max(MIN_H, Math.floor(screenH * 0.42))),
  };
}

/**
 * Keep a mobile Safari UA. A desktop/Macintosh UA makes WKWebView hide
 * WebRTC (RTCPeerConnection / mediaDevices) → “WebRTC is not available”.
 */
const MOBILE_SAFARI_UA =
  Platform.OS === 'ios'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';

type Props = {
  visible: boolean;
  lessonOwnerId?: number;
  bottomOffset?: number;
  onClose: () => void;
};

function resolveTeacherUserId(
  profile: ReturnType<typeof useAuth>['profile'],
  lessonOwnerId?: number,
) {
  if (!profile) {
    return lessonOwnerId ? String(lessonOwnerId) : null;
  }
  if (profile.isStudent) {
    if (profile.user_id != null && profile.user_id !== '') {
      return String(profile.user_id);
    }
    return lessonOwnerId ? String(lessonOwnerId) : null;
  }
  if (profile.id != null) {
    return String(profile.id);
  }
  return lessonOwnerId ? String(lessonOwnerId) : null;
}

/** Stable per-teacher room so switching lesson ↔ homework stays on the same call. */
function buildTeacherRoomName(teacherUserId: string) {
  return `2easy-t-${teacherUserId}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

async function ensureMediaPermissions() {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    const cam = result[PermissionsAndroid.PERMISSIONS.CAMERA];
    const mic = result[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
    return (
      cam === PermissionsAndroid.RESULTS.GRANTED &&
      mic === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch {
    return false;
  }
}

function buildRoomUrl(roomName: string, displayName: string) {
  const params = new URLSearchParams();
  params.set('config.prejoinPageEnabled', 'false');
  params.set('config.disableDeepLinking', 'true');
  params.set('config.enableLobby', 'false');
  params.set('config.startWithAudioMuted', 'false');
  params.set('config.startWithVideoMuted', 'false');
  params.set('config.p2p.enabled', 'false');
  params.set('interfaceConfig.MOBILE_APP_PROMO', 'false');
  params.set('interfaceConfig.SHOW_JITSI_WATERMARK', 'false');
  params.set('interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS', 'true');
  params.set('userInfo.displayName', `"${displayName.replace(/"/g, '')}"`);
  return `https://${JITSI_DOMAIN}/${encodeURIComponent(roomName)}#${params
    .toString()
    .replace(/\+/g, '%20')}`;
}

export function LessonVideoCallWindow({
  visible,
  lessonOwnerId,
  bottomOffset = 90,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const {width: screenW, height: screenH} = useWindowDimensions();
  const {isTablet} = useLayout();
  const {profile} = useAuth();
  const {t} = useI18n();

  const {w: defaultW, h: defaultH} = defaultVideoSize(
    screenW,
    screenH,
    isTablet,
  );

  const [size, setSize] = useState({w: defaultW, h: defaultH});
  const [position, setPosition] = useState({
    x: Math.max(12, screenW - defaultW - 12),
    y: Math.max(insets.top + 8, screenH - defaultH - HEADER_H - bottomOffset),
  });
  const [mediaReady, setMediaReady] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [webviewKey, setWebviewKey] = useState(0);

  const sizeRef = useRef(size);
  const positionRef = useRef(position);
  const screenRef = useRef({w: screenW, h: screenH, top: insets.top});
  const dragStart = useRef({posX: 0, posY: 0});
  const resizeStart = useRef({w: 0, h: 0});

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  useEffect(() => {
    screenRef.current = {w: screenW, h: screenH, top: insets.top};
  }, [screenW, screenH, insets.top]);

  useEffect(() => {
    if (!visible) {
      setMediaReady(false);
      setPermissionDenied(false);
      return;
    }
    const {w, h} = defaultVideoSize(screenW, screenH, isTablet);
    setSize({w, h});
    setPosition({
      x: Math.max(12, screenW - w - 12),
      y: Math.max(insets.top + 8, screenH - h - HEADER_H - bottomOffset),
    });
    let cancelled = false;
    void (async () => {
      const ok = await ensureMediaPermissions();
      if (cancelled) {
        return;
      }
      setPermissionDenied(!ok);
      setMediaReady(true);
      setWebviewKey(k => k + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, screenW, screenH, insets.top, bottomOffset, isTablet]);

  const teacherUserId = resolveTeacherUserId(profile, lessonOwnerId);
  const roomName = useMemo(() => {
    if (!teacherUserId) {
      return '';
    }
    return buildTeacherRoomName(teacherUserId);
  }, [teacherUserId]);

  const displayName =
    [profile?.name, profile?.surname].filter(Boolean).join(' ') ||
    profile?.login ||
    t('profile.participant');

  const uri = useMemo(() => {
    if (!roomName) {
      return '';
    }
    return buildRoomUrl(roomName, displayName);
  }, [roomName, displayName]);

  const maxX = Math.max(0, screenW - size.w);
  const maxY = Math.max(0, screenH - size.h - HEADER_H);

  const dragPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStart.current = {
            posX: positionRef.current.x,
            posY: positionRef.current.y,
          };
        },
        onPanResponderMove: (_, g) => {
          const screen = screenRef.current;
          setPosition({
            x: clamp(
              dragStart.current.posX + g.dx,
              0,
              Math.max(0, screen.w - sizeRef.current.w),
            ),
            y: clamp(
              dragStart.current.posY + g.dy,
              screen.top,
              Math.max(screen.top, screen.h - sizeRef.current.h - HEADER_H),
            ),
          });
        },
      }),
    [],
  );

  const resizePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          resizeStart.current = {
            w: sizeRef.current.w,
            h: sizeRef.current.h,
          };
        },
        onPanResponderMove: (_, g) => {
          const screen = screenRef.current;
          const capW = Math.min(MAX_W, screen.w - 16);
          const capH = Math.min(MAX_H, screen.h - screen.top - 56);
          const nextW = clamp(resizeStart.current.w + g.dx, MIN_W, capW);
          const nextH = clamp(resizeStart.current.h + g.dy, MIN_H, capH);
          setSize({w: nextW, h: nextH});
          setPosition(prev => ({
            x: clamp(prev.x, 0, Math.max(0, screen.w - nextW)),
            y: clamp(
              prev.y,
              screen.top,
              Math.max(screen.top, screen.h - nextH - HEADER_H),
            ),
          }));
        },
      }),
    [],
  );

  const onShouldStartLoadWithRequest = (request: {url: string}) => {
    const url = request.url || '';
    if (
      url.startsWith('https://') ||
      url.startsWith('http://') ||
      url.startsWith('about:') ||
      url.startsWith('blob:')
    ) {
      if (
        url.includes('apps.apple.com') ||
        url.includes('play.google.com') ||
        url.includes('itunes.apple.com')
      ) {
        return false;
      }
      return true;
    }
    // Block intent:/market:/jitsi-meet: deep links so Join stays in WebView.
    return false;
  };

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View
        style={[
          styles.window,
          {
            left: clamp(position.x, 0, maxX),
            top: clamp(position.y, insets.top, maxY),
            width: size.w,
            height: size.h + HEADER_H,
          },
        ]}>
        <View
          style={styles.header}
          accessibilityLabel={t('videoCall.dragHint')}
          {...dragPan.panHandlers}>
          <View style={styles.dragGrip} accessibilityElementsHidden>
            <View style={styles.dragCol}>
              <View style={styles.dragDot} />
              <View style={styles.dragDot} />
              <View style={styles.dragDot} />
            </View>
            <View style={styles.dragCol}>
              <View style={styles.dragDot} />
              <View style={styles.dragDot} />
              <View style={styles.dragDot} />
            </View>
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {t('videoCall.title')}
            </Text>
            <Text style={styles.dragHint} numberOfLines={1}>
              {t('videoCall.dragHint')}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          {!mediaReady ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.loadingText}>{t('videoCall.loading')}</Text>
            </View>
          ) : permissionDenied ? (
            <View style={styles.loading}>
              <Text style={styles.loadingText}>
                {t('videoCall.permissionDenied')}
              </Text>
            </View>
          ) : uri ? (
            <WebView
              key={webviewKey}
              source={{uri}}
              style={styles.webview}
              userAgent={MOBILE_SAFARI_UA}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              mediaCapturePermissionGrantType="grant"
              allowsFullscreenVideo
              allowsProtectedMedia
              setSupportMultipleWindows={false}
              javaScriptCanOpenWindowsAutomatically={false}
              mixedContentMode="always"
              originWhitelist={['*']}
              onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
              renderLoading={() => (
                <View style={styles.loading}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={styles.loadingText}>{t('videoCall.loading')}</Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.loading}>
              <Text style={styles.loadingText}>{t('videoCall.loadError')}</Text>
            </View>
          )}
          <View
            style={[styles.resizeHandle, isTablet && styles.resizeHandleTablet]}
            accessibilityLabel={t('videoCall.resize')}
            {...resizePan.panHandlers}>
            <View style={styles.resizeBadge}>
              <View style={[styles.resizeLine, styles.resizeLineLong]} />
              <View style={styles.resizeLine} />
              <View style={[styles.resizeLine, styles.resizeLineShort]} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
    elevation: 50,
  },
  window: {
    position: 'absolute',
    backgroundColor: '#1a1a2e',
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 16,
  },
  header: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  dragGrip: {
    width: 22,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  dragCol: {gap: 3, justifyContent: 'center'},
  dragDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  titleWrap: {flex: 1, gap: 1},
  title: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  dragHint: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  close: {color: colors.white, fontSize: 16, fontWeight: '700'},
  body: {flex: 1, backgroundColor: '#000'},
  webview: {flex: 1, backgroundColor: '#000'},
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#000',
    padding: 16,
  },
  loadingText: {color: colors.muted, fontSize: 13, textAlign: 'center'},
  resizeHandle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 52,
    height: 52,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 8,
  },
  resizeHandleTablet: {
    width: 60,
    height: 60,
    padding: 10,
  },
  resizeBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(63,40,198,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    transform: [{rotate: '-45deg'}],
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
  },
  resizeLine: {
    height: 2,
    width: 10,
    borderRadius: 1,
    backgroundColor: colors.white,
  },
  resizeLineLong: {width: 14},
  resizeLineShort: {width: 6},
});
