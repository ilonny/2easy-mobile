import {useEffect, useMemo, useRef, useState, type ComponentType} from 'react';
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
import type {WebView as WebViewType} from 'react-native-webview';

// Intersection of platform WebView props can collapse to `never` in this RN version.
const CallWebView = WebView as unknown as ComponentType<any>;

import {useAuth} from '../../../entities/session';
import {getJitsiDomain} from '../../../shared/config';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
const TABLET_HEADER_H = 52;
const PHONE_HEADER_H = 32;
const MIN_W = 300;
const MIN_H = 220;
const PHONE_MIN_W = 108;
const PHONE_MIN_H = 120;
const MAX_W = 720;
const MAX_H = 640;
/**
 * Phone pip is two stacked 16:9 frames (128×72 × 2).
 * Both cameras, or a camera and a shared screen, stay fully visible.
 */
const PHONE_MINI_W = 128;
const PHONE_MINI_H = 144;
/**
 * Shortest side, not useLayout().isTablet: a landscape phone is wider than 768
 * but still a phone. Tablets (shortest side >= 600) keep the large window.
 */
function isPhoneWindow(screenW: number, screenH: number) {
  return Math.min(screenW, screenH) < 600;
}

function tabletVideoSize(screenW: number, screenH: number) {
  return {
    w: Math.min(440, Math.max(380, screenW - 64)),
    h: Math.min(420, Math.max(340, Math.floor(screenH * 0.44))),
  };
}

function phoneMiniSize(screenW: number, availH: number) {
  return {
    w: Math.max(PHONE_MIN_W, Math.min(PHONE_MINI_W, screenW - 16)),
    h: Math.max(PHONE_MIN_H, Math.min(PHONE_MINI_H, availH)),
  };
}

function phoneExpandedSize(screenW: number, screenH: number, availH: number) {
  const w = Math.min(360, Math.max(240, screenW - 16));
  const desired = Math.min(340, Math.max(210, Math.floor(screenH * 0.42)));
  return {w, h: Math.max(150, Math.min(desired, availH))};
}

function availableVideoHeight(
  screenH: number,
  headerH: number,
  top: number,
  bottom: number,
) {
  return Math.max(PHONE_MIN_H, screenH - headerH - top - bottom - 8);
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

function buildRoomUrl(
  roomName: string,
  displayName: string,
  compact: boolean,
) {
  const params = new URLSearchParams();
  params.set('config.prejoinPageEnabled', 'false');
  params.set('config.prejoinConfig.enabled', 'false');
  params.set('config.disableDeepLinking', 'true');
  params.set('config.deeplinking.disabled', 'true');
  params.set('config.enableWelcomePage', 'false');
  params.set('config.enableClosePage', 'false');
  params.set('config.requireDisplayName', 'false');
  params.set('config.enableInsecureRoomNameWarning', 'false');
  params.set('config.enableLobby', 'false');
  params.set('config.startWithAudioMuted', 'false');
  params.set('config.startWithVideoMuted', 'false');
  params.set('config.p2p.enabled', 'false');
  params.set('interfaceConfig.MOBILE_APP_PROMO', 'false');
  params.set('interfaceConfig.SHOW_JITSI_WATERMARK', 'false');
  params.set('interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS', 'true');
  if (compact) {
    // Local layout only. Tile view keeps every participant on screen,
    // and nothing is enlarged over the others.
    params.set('config.disable1On1Mode', 'true');
    params.set('config.disableTileEnlargement', 'true');
    params.set('config.hideConferenceSubject', 'true');
    params.set('config.hideConferenceTimer', 'true');
    params.set('config.disableInviteFunctions', 'true');
    params.set('config.filmstrip.disableResizable', 'true');
    params.set('interfaceConfig.SHOW_WATERMARK_FOR_GUESTS', 'false');
    params.set('interfaceConfig.SHOW_BRAND_WATERMARK', 'false');
    params.set('interfaceConfig.SHOW_POWERED_BY', 'false');
    params.set('interfaceConfig.DISABLE_FOCUS_INDICATOR', 'true');
    params.set('interfaceConfig.DISABLE_DOMINANT_SPEAKER_INDICATOR', 'true');
    params.set('interfaceConfig.VERTICAL_FILMSTRIP', 'false');
    params.set('interfaceConfig.TOOLBAR_ALWAYS_VISIBLE', 'false');
    params.set('interfaceConfig.INITIAL_TOOLBAR_TIMEOUT', '0');
    params.set('interfaceConfig.TOOLBAR_TIMEOUT', '1000');
  }
  params.set('userInfo.displayName', `"${displayName.replace(/"/g, '')}"`);
  return `https://${getJitsiDomain()}/${encodeURIComponent(roomName)}#${params
    .toString()
    .replace(/\+/g, '%20')}`;
}

/** Phone WebView only. Tablets never receive this script. */
const PHONE_PIP_CSS = `
html video, html #largeVideo {
  object-fit: contain !important;
  background-color: #000 !important;
}
html .videocontainer {
  min-width: 0 !important;
  min-height: 0 !important;
  background: #000 !important;
}
html .watermark, html .leftwatermark, html .rightwatermark,
html .subject, html .subject-conference-timer, html .conference-timer,
html .notifications-container,
html .invite-more-container, html #videoResolutionLabel, html .video-quality-label {
  display: none !important;
}
html[data-easy-pip="1"] .new-toolbox,
html[data-easy-pip="1"] .toolbox-content-wrapper,
html[data-easy-pip="1"] [data-testid="toolbox"],
html[data-easy-pip="1"] .filmstrip__toolbar,
html[data-easy-pip="1"] .filmstrip__resize,
html[data-easy-pip="1"] .connection-indicator {
  display: none !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
html[data-easy-pip="1"] .filmstrip__videos {
  padding: 1px !important;
  gap: 2px !important;
}
html[data-easy-pip="1"] .displayname,
html[data-easy-pip="1"] .displayNameContainer {
  font-size: 8px !important;
  line-height: 10px !important;
  padding: 0 2px !important;
  margin: 0 !important;
  max-height: 12px !important;
}
`;

function buildPipScript() {
  return `(function(){try{
    var css=${JSON.stringify(PHONE_PIP_CSS)};
    var style=document.getElementById('easy-pip-style');
    if(!style){
      style=document.createElement('style');
      style.id='easy-pip-style';
      style.appendChild(document.createTextNode(css));
      (document.head||document.documentElement).appendChild(style);
    }
    window.__setEasyPip=function(enabled){
      window.__easyPipWanted=!!enabled;
      if(window.__easyPipWanted) document.documentElement.setAttribute('data-easy-pip','1');
      else document.documentElement.removeAttribute('data-easy-pip');
    };
    if(typeof window.__easyPipWanted!=='boolean') window.__easyPipWanted=true;
    window.__setEasyPip(window.__easyPipWanted);
    if(!window.__easyTileWatch){
      var tries=0;
      window.__easyTileWatch=setInterval(function(){
        tries++;
        var btn=document.querySelector('[data-testid="toolbar-button-tileview"],[data-testid="tileview-button"]');
        var pressed=btn&&btn.getAttribute('aria-pressed');
        if(pressed==='false') btn.click();
        if(pressed==='true'||pressed==='false'||tries>20){
          clearInterval(window.__easyTileWatch);
          window.__easyTileWatch=0;
        }
      },600);
    }
  }catch(e){}
  })();true;`;
}

const PHONE_PIP_BOOTSTRAP = buildPipScript();

/**
 * Skip the "Join meeting" / "Launch in web" screens. Hash config already
 * requests that, but a mobile WebView still shows one of them until something
 * inside the page is clicked.
 */
function buildAutoJoinScript(displayName: string) {
  const nameJson = JSON.stringify(displayName);
  return `(function(){
    if(window.__easyJoinWatch) return;
    var name=${nameJson};
    function setVal(input, value){
      if(!input || input.value) return;
      var desc=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value');
      if(desc && desc.set) desc.set.call(input, value);
      else input.value=value;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    function fillName(){
      if(!name) return;
      var input=document.querySelector('#premeeting-name-input,[data-testid="prejoin.displayName"],.prejoin-input-area input[type="text"]');
      setVal(input, name);
    }
    function clickEl(el){
      if(!el || el.disabled || el.getAttribute('aria-disabled')==='true') return false;
      var now=Date.now();
      var last=Number(el.getAttribute('data-easy-join-at')||0);
      if(now-last<2500) return false;
      el.setAttribute('data-easy-join-at', String(now));
      el.click();
      return true;
    }
    function launchInWeb(){
      var link=document.querySelector('.deep-linking-mobile__href');
      if(link) return link;
      var nodes=document.querySelectorAll('.deep-linking-mobile button,.deep-linking-mobile a,[class*="deep-linking"] button,[class*="deep-linking"] a');
      for(var i=nodes.length-1;i>=0;i--){
        if(!nodes[i].classList || !nodes[i].classList.contains('deep-linking-mobile__button_primary')) return nodes[i];
      }
      return null;
    }
    function joined(){
      var box=document.querySelector('[data-testid="toolbox"],.new-toolbox,.toolbox-content-wrapper');
      var gate=document.querySelector('[data-testid="prejoin.joinMeeting"],.deep-linking-mobile,[data-testid="insecure-room-name-warning-ok"]');
      return !!(box && !gate);
    }
    var tries=0;
    window.__easyJoinWatch=setInterval(function(){
      tries++;
      if(joined() || tries>45){
        clearInterval(window.__easyJoinWatch);
        window.__easyJoinWatch=0;
        return;
      }
      fillName();
      if(clickEl(document.querySelector('[data-testid="prejoin.joinMeeting"]'))) return;
      if(clickEl(document.querySelector('[data-testid="insecure-room-name-warning-ok"]'))) return;
      if(clickEl(document.querySelector('[data-testid="lobby.knockButton"]'))) return;
      clickEl(launchInWeb());
    },400);
  })();true;`;
}

export function LessonVideoCallWindow({
  visible,
  lessonOwnerId,
  bottomOffset = 90,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const {width: screenW, height: screenH} = useWindowDimensions();
  const isPhone = isPhoneWindow(screenW, screenH);
  const headerH = isPhone ? PHONE_HEADER_H : TABLET_HEADER_H;
  const {profile} = useAuth();
  const {t} = useI18n();

  const availH = availableVideoHeight(
    screenH,
    headerH,
    insets.top,
    bottomOffset,
  );
  const initialSize = isPhone
    ? phoneMiniSize(screenW, availH)
    : tabletVideoSize(screenW, screenH);

  const [size, setSize] = useState(initialSize);
  const [compact, setCompact] = useState(isPhone);
  const [position, setPosition] = useState({
    x: Math.max(isPhone ? 8 : 12, screenW - initialSize.w - (isPhone ? 8 : 12)),
    y: isPhone
      ? insets.top + 6
      : Math.max(
          insets.top + 8,
          screenH - initialSize.h - headerH - bottomOffset,
        ),
  });
  const [mediaReady, setMediaReady] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [webviewKey, setWebviewKey] = useState(0);

  const sizeRef = useRef(size);
  const positionRef = useRef(position);
  const screenRef = useRef({w: screenW, h: screenH, top: insets.top});
  const dragStart = useRef({posX: 0, posY: 0});
  const resizeStart = useRef({w: 0, h: 0});
  const webRef = useRef<WebViewType>(null);
  const isPhoneRef = useRef(isPhone);
  const compactRef = useRef(compact);
  const limitsRef = useRef({
    headerH,
    minW: isPhone ? PHONE_MIN_W : MIN_W,
    minH: isPhone ? PHONE_MIN_H : MIN_H,
  });
  isPhoneRef.current = isPhone;
  compactRef.current = compact;
  limitsRef.current = {
    headerH,
    minW: isPhone ? PHONE_MIN_W : MIN_W,
    minH: isPhone ? PHONE_MIN_H : MIN_H,
  };

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  useEffect(() => {
    screenRef.current = {w: screenW, h: screenH, top: insets.top};
  }, [screenW, screenH, insets.top]);

  // Open/close only: request permissions and place the window once per session.
  // Do not remount the WebView when screen metrics or bottomOffset change
  // (e.g. leaving the lesson) — that would hang up the call.
  useEffect(() => {
    if (!visible) {
      setMediaReady(false);
      setPermissionDenied(false);
      return;
    }
    if (isPhoneWindow(screenW, screenH)) {
      const phoneHeader = PHONE_HEADER_H;
      const mini = phoneMiniSize(
        screenW,
        availableVideoHeight(screenH, phoneHeader, insets.top, bottomOffset),
      );
      setCompact(true);
      setSize(mini);
      setPosition({
        x: Math.max(8, screenW - mini.w - 8),
        y: insets.top + 6,
      });
    } else {
      const {w, h} = tabletVideoSize(screenW, screenH);
      setCompact(false);
      setSize({w, h});
      setPosition({
        x: Math.max(12, screenW - w - 12),
        y: Math.max(insets.top + 8, screenH - h - TABLET_HEADER_H - bottomOffset),
      });
    }
    let cancelled = false;
    (async () => {
      const ok = await ensureMediaPermissions();
      if (cancelled) {
        return;
      }
      setPermissionDenied(!ok);
      setMediaReady(true);
      setWebviewKey(k => k + 1);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open transition only
  }, [visible]);

  // Keep the floating window on-screen if rotation / insets change mid-call.
  useEffect(() => {
    if (!visible) {
      return;
    }
    let w = size.w;
    let h = size.h;
    if (isPhone) {
      const maxW = Math.max(80, screenW - 8);
      const maxH = Math.max(80, screenH - headerH - insets.top - bottomOffset - 4);
      w = Math.min(size.w, maxW);
      h = Math.min(size.h, maxH);
      if (w !== size.w || h !== size.h) {
        setSize({w, h});
      }
    }
    setPosition(prev => ({
      x: clamp(prev.x, 0, Math.max(0, screenW - w)),
      y: clamp(
        prev.y,
        insets.top,
        Math.max(insets.top, screenH - h - headerH),
      ),
    }));
  }, [
    visible,
    screenW,
    screenH,
    insets.top,
    size.w,
    size.h,
    headerH,
    isPhone,
    bottomOffset,
  ]);

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

  const startupScript = useMemo(() => {
    const join = buildAutoJoinScript(displayName);
    return isPhone ? `${PHONE_PIP_BOOTSTRAP}\n${join}` : join;
  }, [displayName, isPhone]);

  // Freeze the join URL for this open session so profile/i18n updates
  // do not reload the WebView mid-call.
  const [sessionUri, setSessionUri] = useState('');
  useEffect(() => {
    if (!visible) {
      setSessionUri('');
      return;
    }
    if (!roomName) {
      return;
    }
    setSessionUri(
      prev => prev || buildRoomUrl(roomName, displayName, isPhone),
    );
  }, [visible, roomName, displayName, isPhone]);

  const uri = sessionUri;

  const maxX = Math.max(0, screenW - size.w);
  const maxY = Math.max(0, screenH - size.h - headerH);

  useEffect(() => {
    if (!visible || !isPhone || !mediaReady) {
      return;
    }
    webRef.current?.injectJavaScript(
      `window.__easyPipWanted=${compact};window.__setEasyPip&&window.__setEasyPip(window.__easyPipWanted);true;`,
    );
  }, [visible, isPhone, mediaReady, compact, webviewKey]);

  const toggleCompact = () => {
    const next = !compact;
    const room = availableVideoHeight(
      screenH,
      headerH,
      insets.top,
      bottomOffset,
    );
    const preset = next
      ? phoneMiniSize(screenW, room)
      : phoneExpandedSize(screenW, screenH, room);
    setCompact(next);
    setSize(preset);
    setPosition({
      x: Math.max(8, screenW - preset.w - 8),
      y: next
        ? insets.top + 6
        : Math.max(insets.top + 4, screenH - preset.h - headerH - bottomOffset),
    });
  };

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
          const chrome = limitsRef.current.headerH;
          setPosition({
            x: clamp(
              dragStart.current.posX + g.dx,
              0,
              Math.max(0, screen.w - sizeRef.current.w),
            ),
            y: clamp(
              dragStart.current.posY + g.dy,
              screen.top,
              Math.max(screen.top, screen.h - sizeRef.current.h - chrome),
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
          const limits = limitsRef.current;
          const capW = Math.min(MAX_W, screen.w - 16);
          const capH = Math.min(MAX_H, screen.h - screen.top - 56);
          const nextW = clamp(resizeStart.current.w + g.dx, limits.minW, capW);
          const nextH = clamp(resizeStart.current.h + g.dy, limits.minH, capH);
          setSize({w: nextW, h: nextH});
          if (isPhoneRef.current) {
            // Toolbar only once the frame is wide and tall enough to tap it.
            const showToolbar = nextW >= 240 && nextH >= 200;
            setCompact(prev => (prev === !showToolbar ? prev : !showToolbar));
          }
          setPosition(prev => ({
            x: clamp(prev.x, 0, Math.max(0, screen.w - nextW)),
            y: clamp(
              prev.y,
              screen.top,
              Math.max(screen.top, screen.h - nextH - limits.headerH),
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
          isPhone && styles.windowPhone,
          {
            left: clamp(position.x, 0, maxX),
            top: clamp(position.y, insets.top, maxY),
            width: size.w,
            height: size.h + headerH,
          },
        ]}>
        <View
          style={[styles.header, {height: headerH}, isPhone && styles.headerPhone]}
          accessibilityLabel={isPhone ? undefined : t('videoCall.dragHint')}
          {...(isPhone ? {} : dragPan.panHandlers)}>
          <View
            style={styles.headerMain}
            accessibilityLabel={isPhone ? t('videoCall.dragHint') : undefined}
            {...(isPhone ? dragPan.panHandlers : {})}>
            <View
              style={[styles.dragGrip, isPhone && styles.dragGripPhone]}
              accessibilityElementsHidden>
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
            {isPhone && compact ? null : (
              <View style={styles.titleWrap}>
                <Text
                  style={[styles.title, isPhone && styles.titlePhone]}
                  numberOfLines={1}>
                  {isPhone ? t('videoCall.short') : t('videoCall.title')}
                </Text>
                {isPhone ? null : (
                  <Text style={styles.dragHint} numberOfLines={1}>
                    {t('videoCall.dragHint')}
                  </Text>
                )}
              </View>
            )}
          </View>
          {isPhone ? (
            <Pressable
              onPress={toggleCompact}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={
                compact ? t('videoCall.expand') : t('videoCall.collapse')
              }
              style={[styles.closeBtn, styles.modeBtn]}>
              <Text style={styles.modeIcon} allowFontScaling={false}>
                {compact ? '+' : '−'}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('videoCall.close')}
            style={[styles.closeBtn, isPhone && styles.closeBtnPhone]}>
            <Text
              style={[styles.close, isPhone && styles.closePhone]}
              allowFontScaling={!isPhone}>
              ✕
            </Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          {!mediaReady ? (
            <View style={[styles.loading, isPhone && compact && styles.loadingMini]}>
              <ActivityIndicator
                color={colors.primary}
                size={isPhone && compact ? 'small' : 'large'}
              />
              <Text
                style={[
                  styles.loadingText,
                  isPhone && compact && styles.loadingTextMini,
                ]}>
                {t('videoCall.loading')}
              </Text>
            </View>
          ) : permissionDenied ? (
            <View style={[styles.loading, isPhone && compact && styles.loadingMini]}>
              <Text
                style={[
                  styles.loadingText,
                  isPhone && compact && styles.loadingTextMini,
                ]}>
                {t('videoCall.permissionDenied')}
              </Text>
            </View>
          ) : uri ? (
            <CallWebView
              key={webviewKey}
              ref={webRef}
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
              bounces={!isPhone || !compact}
              showsVerticalScrollIndicator={!isPhone || !compact}
              showsHorizontalScrollIndicator={!isPhone || !compact}
              injectedJavaScriptBeforeContentLoaded={startupScript}
              injectedJavaScript={startupScript}
              onLoadEnd={() => {
                if (!isPhoneRef.current) {
                  return;
                }
                webRef.current?.injectJavaScript(
                  `window.__easyPipWanted=${compactRef.current};window.__setEasyPip&&window.__setEasyPip(window.__easyPipWanted);true;`,
                );
              }}
              onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
              renderLoading={() => (
                <View
                  style={[
                    styles.loading,
                    isPhone && compact && styles.loadingMini,
                  ]}>
                  <ActivityIndicator
                    color={colors.primary}
                    size={isPhone && compact ? 'small' : 'large'}
                  />
                  <Text
                    style={[
                      styles.loadingText,
                      isPhone && compact && styles.loadingTextMini,
                    ]}>
                    {t('videoCall.loading')}
                  </Text>
                </View>
              )}
            />
          ) : (
            <View style={[styles.loading, isPhone && compact && styles.loadingMini]}>
              <Text
                style={[
                  styles.loadingText,
                  isPhone && compact && styles.loadingTextMini,
                ]}>
                {t('videoCall.loadError')}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.resizeHandle,
              isPhone && styles.resizeHandlePhone,
              isPhone && compact && styles.resizeHandleMini,
              !isPhone && styles.resizeHandleTablet,
            ]}
            accessibilityLabel={t('videoCall.resize')}
            {...resizePan.panHandlers}>
            <View
              style={[
                styles.resizeBadge,
                isPhone && compact && styles.resizeBadgeMini,
              ]}>
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
  windowPhone: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  header: {
    height: TABLET_HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  headerPhone: {
    paddingHorizontal: 4,
    gap: 4,
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  dragGripPhone: {
    width: 16,
    height: 22,
    gap: 3,
    borderRadius: 5,
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
  titlePhone: {fontSize: 12},
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
    flexShrink: 0,
  },
  closeBtnPhone: {
    width: 26,
    height: 26,
  },
  close: {color: colors.white, fontSize: 16, fontWeight: '700'},
  closePhone: {fontSize: 13},
  modeBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: colors.primary,
  },
  modeIcon: {
    color: colors.white,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
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
  loadingMini: {padding: 6, gap: 6},
  loadingTextMini: {fontSize: 10, lineHeight: 13},
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
  resizeHandlePhone: {
    width: 40,
    height: 40,
    padding: 6,
  },
  resizeHandleMini: {
    width: 30,
    height: 30,
    padding: 3,
  },
  resizeHandleTablet: {
    width: 60,
    height: 60,
    padding: 10,
  },
  resizeBadgeMini: {
    width: 18,
    height: 18,
    borderRadius: 5,
    gap: 1,
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
