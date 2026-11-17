import {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';

import {ensureApiBase, getApiUrl, STORAGE_KEYS} from '../../../shared/config';
import {readStorage} from '../../../shared/lib/storage';
import {isYandexTtsLanguageSupported} from '../lib/ttsLanguages';

type SpeechState = {
  activeId: string | null;
  loadingId: string | null;
  uri: string | null;
  token: number;
};

const idleState: SpeechState = {
  activeId: null,
  loadingId: null,
  uri: null,
  token: 0,
};

let state: SpeechState = idleState;
let generation = 0;
const listeners = new Set<() => void>();

function emit(next: SpeechState) {
  state = next;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return encodeBase64(binary);
}

function encodeBase64(value: string) {
  const encode = (globalThis as {btoa?: (data: string) => string}).btoa;
  if (!encode) {
    throw new Error('');
  }
  return encode(value);
}

async function requestSpeechDataUri(text: string, languageCode?: string) {
  await ensureApiBase();
  const token = await readStorage(STORAGE_KEYS.token);
  const response = await fetch(`${getApiUrl()}/speech/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify({
      text,
      ...(languageCode?.trim() ? {languageCode: languageCode.trim()} : {}),
    }),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || contentType.includes('application/json')) {
    let message = '';
    try {
      const payload = (await response.json()) as {message?: string};
      message = payload?.message || '';
    } catch {
      message = '';
    }
    throw new Error(message);
  }

  const buffer = await response.arrayBuffer();
  if (!buffer.byteLength) {
    throw new Error('');
  }
  return `data:audio/mpeg;base64,${arrayBufferToBase64(buffer)}`;
}

function audioDocument(uri: string) {
  const src = JSON.stringify(uri);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<audio id="speech" src=${src} playsinline></audio>
<script>
  var audio = document.getElementById('speech');
  function report(kind) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(kind);
    }
  }
  audio.onended = function () { report('ended'); };
  audio.onerror = function () { report('error'); };
  var played = audio.play();
  if (played && played.catch) {
    played.catch(function () { report('error'); });
  }
</script>
</body>
</html>`;
}

export function stopSpeechPlayback() {
  generation += 1;
  emit(idleState);
}

function finishSpeech(token: number) {
  if (state.token !== token) {
    return;
  }
  emit(idleState);
}

export async function speakWord(id: string, text: string, languageCode?: string) {
  const trimmed = text.trim();
  if (!trimmed || !isYandexTtsLanguageSupported(languageCode)) {
    return;
  }
  const token = ++generation;
  emit({activeId: id, loadingId: id, uri: null, token});
  try {
    const uri = await requestSpeechDataUri(trimmed, languageCode);
    if (token !== generation) {
      return;
    }
    emit({activeId: id, loadingId: null, uri, token});
  } catch (error) {
    if (token !== generation) {
      return;
    }
    emit(idleState);
    throw error;
  }
}

export function useSpeechPlayback() {
  const [snapshot, setSnapshot] = useState(state);
  useEffect(() => subscribe(() => setSnapshot(state)), []);
  return {
    activeId: snapshot.activeId,
    uri: snapshot.uri,
    token: snapshot.token,
    isLoading: (id: string) => snapshot.loadingId === id,
    speak: speakWord,
    stop: stopSpeechPlayback,
  };
}

/** Hidden player for dictionary pronunciation. Mount once near the app root. */
export function SpeechPlaybackHost() {
  const {uri, token} = useSpeechPlayback();
  if (!uri) {
    return null;
  }
  return (
    <View pointerEvents="none" style={styles.host}>
      <WebView
        key={token}
        originWhitelist={['*']}
        source={{html: audioDocument(uri)}}
        style={styles.web}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onMessage={event => {
          const kind = event.nativeEvent.data;
          if (kind === 'ended' || kind === 'error') {
            finishSpeech(token);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
  web: {width: 1, height: 1, backgroundColor: 'transparent'},
});
