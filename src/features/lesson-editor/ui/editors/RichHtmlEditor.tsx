import {useCallback, useEffect, useMemo, useRef, useState, type ComponentType} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';

import {useI18n} from '../../../../shared/i18n';
import {colors, radii} from '../../../../shared/config/theme';
import {ColorPickerModal} from '../../../../shared/ui';

type Props = {
  html: string;
  onChangeHtml: (html: string) => void;
  minHeight?: number;
  placeholder?: string;
};

// Intersection of platform WebView props can collapse to `never` in this RN version.
const EditorWebView = WebView as unknown as ComponentType<any>;

const TOOLBAR: Array<{cmd: string; label: string; arg?: string}> = [
  {cmd: 'bold', label: 'B'},
  {cmd: 'italic', label: 'I'},
  {cmd: 'underline', label: 'U'},
  {cmd: 'insertUnorderedList', label: '•'},
  {cmd: 'insertOrderedList', label: '1.'},
  {cmd: 'justifyLeft', label: '⬅'},
  {cmd: 'justifyCenter', label: '☰'},
  {cmd: 'justifyRight', label: '➡'},
  {cmd: 'foreColor', label: 'A'},
  {cmd: 'createLink', label: '🔗'},
];

function buildEditorHtml(initialHtml: string, placeholder: string) {
  const safe = JSON.stringify(initialHtml || '');
  const ph = JSON.stringify(placeholder || '');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  #editor {
    min-height: 160px;
    padding: 12px;
    font-size: 16px;
    line-height: 1.45;
    color: #1a1a1a;
    outline: none;
  }
  #editor:empty:before {
    content: ${ph};
    color: #9ca3af;
  }
  #editor ul, #editor ol {
    padding-left: 1.5em;
    margin: 0.35em 0;
    list-style-position: outside;
  }
  #editor ul { list-style-type: disc; }
  #editor ol { list-style-type: decimal; }
  #editor li {
    display: list-item;
    margin: 0.15em 0;
  }
  /* Keep marker and text on one line even if a <p>/<div> sneaks into <li> */
  #editor li > p,
  #editor li > div {
    display: inline;
    margin: 0;
  }
  #editor a { color: #3F28C6; }
</style>
</head>
<body>
<div id="editor" contenteditable="true"></div>
<script>
(function() {
  var editor = document.getElementById('editor');
  var initial = ${safe};
  editor.innerHTML = initial || '';
  var emitTimer = null;
  var savedRange = null;

  function post(type, payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
    }
  }

  function emitChange() {
    post('change', editor.innerHTML);
  }

  function scheduleEmit() {
    if (emitTimer) clearTimeout(emitTimer);
    emitTimer = setTimeout(emitChange, 120);
  }

  editor.addEventListener('input', scheduleEmit);
  editor.addEventListener('blur', emitChange);

  document.addEventListener('message', handleNative);
  window.addEventListener('message', handleNative);

  function handleNative(event) {
    var raw = event.data;
    try {
      var msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!msg || !msg.type) return;
      if (msg.type === 'setHtml') {
        var next = msg.payload || '';
        if (editor.innerHTML !== next) {
          editor.innerHTML = next;
        }
      } else if (msg.type === 'saveSelection') {
        var sel = window.getSelection();
        savedRange = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
      } else if (msg.type === 'exec') {
        var cmd = msg.payload && msg.payload.cmd;
        var arg = msg.payload && msg.payload.arg;
        if (savedRange) {
          var restore = window.getSelection();
          restore.removeAllRanges();
          restore.addRange(savedRange);
        }
        editor.focus();
        if (cmd === 'createLink') {
          var url = arg || prompt('URL', 'https://');
          if (url) document.execCommand('createLink', false, url);
        } else if (cmd === 'foreColor') {
          document.execCommand('foreColor', false, arg || '#3F28C6');
        } else {
          document.execCommand(cmd, false, arg || null);
        }
        editor.focus();
        emitChange();
      } else if (msg.type === 'getHtml') {
        post('html', editor.innerHTML);
      }
    } catch (e) {}
  }

  post('ready', true);
})();
</script>
</body>
</html>`;
}

export function RichHtmlEditor({
  html,
  onChangeHtml,
  minHeight = 180,
  placeholder,
}: Props) {
  const {t} = useI18n();
  const resolvedPlaceholder = placeholder || t('editor.contentPlaceholder');
  const webRef = useRef<any>(null);
  const lastSent = useRef(html);
  const ready = useRef(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [textColor, setTextColor] = useState<string>(colors.primary);

  const source = useMemo(
    () => ({html: buildEditorHtml(html, resolvedPlaceholder)}),
    // Only bootstrap once; later updates go via postMessage
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!ready.current) {
      return;
    }
    if (html === lastSent.current) {
      return;
    }
    lastSent.current = html;
    const msg = JSON.stringify({type: 'setHtml', payload: html || ''});
    webRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(
        msg,
      )}}));true;`,
    );
  }, [html]);

  const onMessage = useCallback(
    (event: {nativeEvent: {data: string}}) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'ready') {
          ready.current = true;
          if (html) {
            lastSent.current = html;
            const payload = JSON.stringify({type: 'setHtml', payload: html});
            webRef.current?.injectJavaScript(
              `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(
                payload,
              )}}));true;`,
            );
          }
          return;
        }
        if (msg.type === 'change' || msg.type === 'html') {
          const next = String(msg.payload || '');
          lastSent.current = next;
          onChangeHtml(next);
        }
      } catch {
        // ignore
      }
    },
    [html, onChangeHtml],
  );

  const inject = (payload: object) => {
    const msg = JSON.stringify(payload);
    webRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(
        msg,
      )}}));true;`,
    );
  };

  const runCmd = (cmd: string, arg?: string) => {
    inject({type: 'exec', payload: {cmd, arg}});
  };

  const onToolbarPress = (cmd: string, arg?: string) => {
    if (cmd === 'foreColor') {
      inject({type: 'saveSelection'});
      setTimeout(() => setColorPickerOpen(true), 20);
      return;
    }
    runCmd(cmd, arg);
  };

  const applyTextColor = (hex: string) => {
    setTextColor(hex);
    runCmd('foreColor', hex);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        {TOOLBAR.map(item => (
          <Pressable
            key={item.cmd + (item.arg || '')}
            style={styles.toolBtn}
            onPress={() => onToolbarPress(item.cmd, item.arg)}>
            <Text
              style={[
                styles.toolLabel,
                item.cmd === 'bold' && styles.bold,
                item.cmd === 'italic' && styles.italic,
                item.cmd === 'underline' && styles.underline,
                item.cmd === 'foreColor' && {color: textColor},
              ]}>
              {item.label}
            </Text>
            {item.cmd === 'foreColor' ? (
              <View style={[styles.colorBar, {backgroundColor: textColor}]} />
            ) : null}
          </Pressable>
        ))}
      </View>
      <EditorWebView
        ref={webRef}
        originWhitelist={['*']}
        source={source}
        onMessage={onMessage}
        style={[styles.web, {minHeight}]}
        scrollEnabled
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
      />
      <ColorPickerModal
        visible={colorPickerOpen}
        value={textColor}
        onChange={applyTextColor}
        onClose={() => setColorPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginBottom: 12,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#F8F7FC',
  },
  toolBtn: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  toolLabel: {fontSize: 13, fontWeight: '600', color: colors.text},
  colorBar: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 4,
    height: 3,
    borderRadius: 1,
  },
  bold: {fontWeight: '800'},
  italic: {fontStyle: 'italic'},
  underline: {textDecorationLine: 'underline'},
  web: {
    backgroundColor: colors.white,
    width: '100%',
  },
});
