import {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import type {WebView as WebViewType} from 'react-native-webview';

import {useAuth} from '../../../entities/session';
import {STORAGE_KEYS, WEB_URL} from '../../../shared/config';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import {readStorage} from '../../../shared/lib/storage';

type Props = {
  boardId: number;
  /** Teacher catalog/edit flow (`?catalog=1` on site). */
  catalog?: boolean;
  onClose: () => void;
};

/**
 * Hide the site page-header ✕ (not modal closes inside dialogs).
 * When `hideBackToEdit` — also hide «Back to editing» (lesson mode, like BoardEditorModal).
 */
function buildBoardChromeInjectJs(hideBackToEdit: boolean) {
  return `
(function () {
  var hideBackToEdit = ${hideBackToEdit ? 'true' : 'false'};
  function hideHeaderClose() {
    document.querySelectorAll('button[aria-label="Close"]').forEach(function (btn) {
      if (btn.closest('[role="dialog"]')) return;
      var cls = String(btn.className || '');
      var style = window.getComputedStyle ? window.getComputedStyle(btn) : null;
      var isAbs =
        cls.indexOf('absolute') !== -1 ||
        (style && style.position === 'absolute');
      if (isAbs) {
        btn.style.setProperty('display', 'none', 'important');
        btn.style.setProperty('visibility', 'hidden', 'important');
        btn.setAttribute('aria-hidden', 'true');
      }
    });
  }
  function hideBackToEditBtn() {
    if (!hideBackToEdit) return;
    document.querySelectorAll('button').forEach(function (btn) {
      var text = (btn.textContent || '').replace(/\\s+/g, ' ').trim();
      if (
        text.indexOf('Вернуться к редактированию') !== -1 ||
        text.indexOf('Back to editing') !== -1 ||
        text.indexOf('Back to edit') !== -1
      ) {
        btn.style.setProperty('display', 'none', 'important');
        btn.setAttribute('aria-hidden', 'true');
      }
    });
  }
  function hideSiteChrome() {
    try {
      document.body.classList.add('site-chat-hidden');
      document.body.setAttribute('data-lesson-board-open', '1');
    } catch (e) {}
    if (typeof window.TalkMe === 'function') {
      try { window.TalkMe('closeSupport'); } catch (e) {}
      try { window.TalkMe('hideTrigger'); } catch (e) {}
    }
    document.querySelectorAll(
      'header, footer, .site-header-root, [class*="CookieConsent"], section[aria-label]'
    ).forEach(function (el) {
      var label = (el.getAttribute('aria-label') || '').toLowerCase();
      var isCookie =
        el.tagName === 'SECTION' &&
        (label.indexOf('cookie') !== -1 || label.indexOf('соглас') !== -1);
      if (
        el.tagName === 'HEADER' ||
        el.tagName === 'FOOTER' ||
        (el.className && String(el.className).indexOf('site-header') !== -1) ||
        isCookie
      ) {
        el.style.setProperty('display', 'none', 'important');
        el.setAttribute('aria-hidden', 'true');
      }
    });
  }
  function apply() {
    hideHeaderClose();
    hideBackToEditBtn();
    hideSiteChrome();
  }
  if (!document.getElementById('rn-board-hide-close')) {
    var styleEl = document.createElement('style');
    styleEl.id = 'rn-board-hide-close';
    styleEl.textContent =
      'button[aria-label="Close"].absolute{display:none!important;visibility:hidden!important;pointer-events:none!important;}' +
      'body.site-chat-hidden iframe[src*="talk-me"],body.site-chat-hidden iframe[src*="site-chat"],body.site-chat-hidden [id*="talkme"],body.site-chat-hidden [class*="talkme"]{display:none!important;visibility:hidden!important;}' +
      'header,.site-header-root,footer,section[aria-label*="cookie" i],section[aria-label*="Cookie"],section[aria-label*="соглас"]{display:none!important;}';
    (document.head || document.documentElement).appendChild(styleEl);
  }
  apply();
  try {
    if (!window.__rnBoardCloseObserver) {
      window.__rnBoardCloseObserver = new MutationObserver(apply);
      window.__rnBoardCloseObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
  } catch (e) {}
})();
true;
`;
}

/**
 * Excalidraw board UI lives on the website. Open it in a WebView with the
 * same localStorage auth keys the site AuthContext / API client expect.
 */
export function BoardWebView({boardId, catalog, onClose}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const {profile} = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const webRef = useRef<WebViewType>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readStorage(STORAGE_KEYS.token);
      if (!cancelled) {
        setToken(stored || profile?.token || null);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.token]);

  const uri = useMemo(() => {
    const base = `${WEB_URL}/board/${boardId}`;
    return catalog ? `${base}?catalog=1` : base;
  }, [boardId, catalog]);

  const chromeInjectJs = useMemo(
    () => buildBoardChromeInjectJs(!catalog),
    [catalog],
  );

  const injectedBefore = useMemo(() => {
    const profileJson = JSON.stringify(profile || {});
    const tokenJson = JSON.stringify(token || '');
    return `
(function () {
  try {
    localStorage.setItem('token', ${tokenJson});
    localStorage.setItem('profile', ${JSON.stringify(profileJson)});
    localStorage.setItem('2easy-cookie-consent', '1');
  } catch (e) {}
})();
true;
`;
  }, [profile, token]);

  if (!ready) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!token) {
    return (
      <View style={[styles.root, styles.centered, {paddingTop: insets.top}]}>
        <Text style={styles.error}>{t('boards.loadError')}</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>{t('common.close')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, {paddingTop: insets.top}]}>
      {loadError ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{t('boards.loadError')}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>{t('common.close')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.webWrap}>
          <WebView
            ref={webRef}
            source={{uri}}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            injectedJavaScriptBeforeContentLoaded={injectedBefore}
            injectedJavaScript={chromeInjectJs}
            onLoadEnd={() => {
              webRef.current?.injectJavaScript(chromeInjectJs);
            }}
            onError={() => setLoadError(true)}
            onHttpError={() => setLoadError(true)}
            startInLoadingState
            renderLoading={() => (
              <View style={[styles.centered, StyleSheet.absoluteFill]}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            )}
          />
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={({pressed}) => [styles.fabClose, pressed && styles.pressed]}>
            <Text style={styles.fabCloseText}>✕</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.white},
  webWrap: {flex: 1, position: 'relative'},
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  closeBtn: {
    minWidth: 36,
    minHeight: 36,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  closeText: {fontSize: 16, fontWeight: '700', color: colors.primary},
  webview: {flex: 1, backgroundColor: colors.white},
  error: {color: colors.danger, textAlign: 'center', fontSize: 15},
  fabClose: {
    position: 'absolute',
    top: 8,
    right: 10,
    zIndex: 20,
    elevation: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  fabCloseText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: -1,
  },
  pressed: {opacity: 0.85},
});
