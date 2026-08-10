import {useCallback, useMemo, useRef, useState, type ComponentType, type RefObject} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../../shared/i18n';
import {colors, radii} from '../../../../shared/config/theme';
import {Button, TextField} from '../../../../shared/ui';
import {newId} from './editorShared';
import {editorStyles} from './EditorShell';

const EditorWebView = WebView as unknown as ComponentType<any>;

export type FillGapsOption = {
  id: string;
  value: string;
  isCorrect: boolean;
};

export type FillGapsGap = {
  id: string;
  options: FillGapsOption[];
  originalText?: string;
};

export type SlateText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
};

export type SlateGapEl = {
  type: 'gap';
  gapId: string;
  children: SlateText[];
};

export type SlateParagraph = {
  type: 'paragraph';
  children: Array<SlateText | SlateGapEl>;
};

type Props = {
  content: SlateParagraph[];
  gaps: FillGapsGap[];
  onChange: (next: {content: SlateParagraph[]; gaps: FillGapsGap[]}) => void;
  makeGapLabel?: string;
  hint?: string;
  minHeight?: number;
};

function defaultContent(): SlateParagraph[] {
  return [{type: 'paragraph', children: [{text: ''}]}];
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textNodeToHtml(node: SlateText): string {
  let html = escapeHtml(node.text || '');
  if (node.bold) {
    html = `<strong>${html}</strong>`;
  }
  if (node.italic) {
    html = `<em>${html}</em>`;
  }
  if (node.underline) {
    html = `<u>${html}</u>`;
  }
  if (node.color) {
    html = `<span style="color:${escapeHtml(node.color)}">${html}</span>`;
  }
  return html;
}

export function slateToEditorHtml(
  content: SlateParagraph[],
  gaps: FillGapsGap[],
): string {
  const labels = new Map(
    gaps.map(g => {
      const correct = (g.options || []).find(o => o.isCorrect)?.value;
      return [g.id, correct || g.originalText || '…'] as const;
    }),
  );
  const paras = content?.length ? content : defaultContent();
  return paras
    .map(p => {
      const inner = (p.children || [])
        .map(child => {
          if ('type' in child && child.type === 'gap') {
            const label = escapeHtml(labels.get(child.gapId) || '…');
            return `<span class="gap" data-gap-id="${escapeHtml(
              child.gapId,
            )}" contenteditable="false">${label}</span>`;
          }
          return textNodeToHtml(child as SlateText);
        })
        .join('');
      return `<p>${inner || '<br>'}</p>`;
    })
    .join('');
}

function buildFillGapsHtml(
  initialHtml: string,
  makeGapLabel: string,
) {
  const safe = JSON.stringify(initialHtml || '<p><br></p>');
  const makeLabel = JSON.stringify(makeGapLabel);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  #editor {
    min-height: 180px;
    padding: 12px;
    font-size: 16px;
    line-height: 1.5;
    color: #1a1a1a;
    outline: none;
  }
  #editor p { margin: 0 0 10px; }
  .gap {
    display: inline-block;
    min-width: 48px;
    padding: 2px 10px;
    margin: 0 2px;
    border-radius: 8px;
    background: #EDE9FE;
    color: #3F28C6;
    font-weight: 700;
    border: 1px dashed #3F28C6;
    vertical-align: baseline;
    cursor: pointer;
  }
  #bar {
    position: sticky; top: 0; z-index: 2;
    display: none;
    gap: 8px; padding: 8px; background: #F8F7FC;
    border-bottom: 1px solid #E5E7EB;
  }
  #bar.show { display: flex; }
  #makeGap {
    border: 0; background: #3F28C6; color: #fff;
    font-weight: 700; border-radius: 8px; padding: 8px 12px;
  }
</style>
</head>
<body>
<div id="bar"><button id="makeGap" type="button"></button></div>
<div id="editor" contenteditable="true"></div>
<script>
(function() {
  var editor = document.getElementById('editor');
  var bar = document.getElementById('bar');
  var makeBtn = document.getElementById('makeGap');
  makeBtn.textContent = ${makeLabel};
  editor.innerHTML = ${safe};

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function post(type, payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
    }
  }

  function serialize() {
    var paras = [];
    var gapIds = [];
    var blocks = Array.from(editor.childNodes);
    if (!blocks.length) {
      paras.push({ type: 'paragraph', children: [{ text: '' }] });
      return { content: paras, gapIds: gapIds };
    }
    blocks.forEach(function(node) {
      if (node.nodeType === 3) {
        var t = node.textContent || '';
        if (t) paras.push({ type: 'paragraph', children: [{ text: t }] });
        return;
      }
      if (node.nodeType !== 1) return;
      var el = node;
      var tag = el.tagName.toLowerCase();
      if (tag !== 'p' && tag !== 'div') {
        // wrap stray content
        el = document.createElement('p');
        el.appendChild(node.cloneNode(true));
      }
      var children = [];
      function walk(n, marks) {
        if (n.nodeType === 3) {
          var text = n.textContent || '';
          if (!text) return;
          var leaf = { text: text };
          if (marks.bold) leaf.bold = true;
          if (marks.italic) leaf.italic = true;
          if (marks.underline) leaf.underline = true;
          if (marks.color) leaf.color = marks.color;
          children.push(leaf);
          return;
        }
        if (n.nodeType !== 1) return;
        var e = n;
        if (e.classList && e.classList.contains('gap')) {
          var gid = e.getAttribute('data-gap-id') || uuid();
          gapIds.push(gid);
          children.push({ type: 'gap', gapId: gid, children: [{ text: '' }] });
          return;
        }
        var next = Object.assign({}, marks);
        var tn = e.tagName.toLowerCase();
        if (tn === 'strong' || tn === 'b') next.bold = true;
        if (tn === 'em' || tn === 'i') next.italic = true;
        if (tn === 'u') next.underline = true;
        if (tn === 'span' && e.style && e.style.color) next.color = e.style.color;
        if (tn === 'br') {
          children.push({ text: '\\n' });
          return;
        }
        Array.from(e.childNodes).forEach(function(c) { walk(c, next); });
      }
      Array.from(el.childNodes).forEach(function(c) { walk(c, {}); });
      if (!children.length) children.push({ text: '' });
      paras.push({ type: 'paragraph', children: children });
    });
    return { content: paras, gapIds: gapIds };
  }

  var emitTimer = null;
  function emitChange() {
    post('change', serialize());
  }
  function scheduleEmit() {
    if (emitTimer) clearTimeout(emitTimer);
    emitTimer = setTimeout(emitChange, 150);
  }

  function selectionHasGap() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return true;
    var range = sel.getRangeAt(0);
    var node = range.commonAncestorContainer;
    var el = node.nodeType === 1 ? node : node.parentElement;
    while (el && el !== editor) {
      if (el.classList && el.classList.contains('gap')) return true;
      el = el.parentElement;
    }
    return false;
  }

  function updateBar() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim() || selectionHasGap()) {
      bar.classList.remove('show');
      return;
    }
    if (!editor.contains(sel.anchorNode)) {
      bar.classList.remove('show');
      return;
    }
    bar.classList.add('show');
  }

  makeBtn.addEventListener('click', function() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim() || selectionHasGap()) return;
    var text = sel.toString().trim();
    var gapId = uuid();
    var span = document.createElement('span');
    span.className = 'gap';
    span.setAttribute('data-gap-id', gapId);
    span.setAttribute('contenteditable', 'false');
    span.textContent = text;
    var range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(span);
    sel.removeAllRanges();
    bar.classList.remove('show');
    post('gapCreated', { gapId: gapId, text: text });
    emitChange();
  });

  editor.addEventListener('click', function(e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('gap')) {
      post('gapTap', { gapId: t.getAttribute('data-gap-id') });
    }
  });

  document.addEventListener('selectionchange', updateBar);
  editor.addEventListener('input', scheduleEmit);
  editor.addEventListener('keyup', updateBar);
  editor.addEventListener('mouseup', updateBar);

  document.addEventListener('message', handleNative);
  window.addEventListener('message', handleNative);

  function handleNative(event) {
    var raw = event.data;
    try {
      var msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!msg || !msg.type) return;
      if (msg.type === 'setHtml') {
        editor.innerHTML = msg.payload || '<p><br></p>';
      } else if (msg.type === 'updateGapLabel') {
        var id = msg.payload && msg.payload.gapId;
        var label = (msg.payload && msg.payload.label) || '…';
        var el = editor.querySelector('[data-gap-id=\"' + id + '\"]');
        if (el) el.textContent = label;
      } else if (msg.type === 'removeGap') {
        var rid = msg.payload && msg.payload.gapId;
        var gel = editor.querySelector('[data-gap-id=\"' + rid + '\"]');
        if (gel) {
          var textNode = document.createTextNode(gel.textContent || '');
          gel.parentNode.replaceChild(textNode, gel);
          emitChange();
        }
      } else if (msg.type === 'makeGap') {
        makeBtn.click();
      } else if (msg.type === 'getState') {
        post('change', serialize());
      }
    } catch (e) {}
  }

  post('ready', true);
})();
</script>
</body>
</html>`;
}

function postToWeb(webRef: RefObject<any>, payload: object) {
  const msg = JSON.stringify(payload);
  webRef.current?.injectJavaScript(
    `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(
      msg,
    )}}));true;`,
  );
}

export function FillGapsRichEditor({
  content,
  gaps,
  onChange,
  makeGapLabel,
  hint,
  minHeight = 220,
}: Props) {
  const {t} = useI18n();
  const insets = useSafeAreaInsets();
  const webRef = useRef<any>(null);
  const ready = useRef(false);
  const gapsRef = useRef(gaps);
  const contentRef = useRef(content);
  gapsRef.current = gaps;
  contentRef.current = content;

  const [activeGapId, setActiveGapId] = useState<string | null>(null);
  const [draftOptions, setDraftOptions] = useState<FillGapsOption[]>([]);

  const label = makeGapLabel || t('editor.makeGap');
  const initialHtml = useMemo(
    () => slateToEditorHtml(content, gaps),
    // bootstrap only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const source = useMemo(
    () => ({html: buildFillGapsHtml(initialHtml, label)}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const openGapModal = useCallback(
    (gapId: string, seedText?: string) => {
      const existing = gapsRef.current.find(g => g.id === gapId);
      if (existing) {
        setDraftOptions(
          existing.options.length
            ? existing.options.map(o => ({...o}))
            : [
                {
                  id: newId(),
                  value: seedText || existing.originalText || '',
                  isCorrect: true,
                },
              ],
        );
      } else {
        setDraftOptions([
          {
            id: newId(),
            value: seedText || '',
            isCorrect: true,
          },
        ]);
      }
      setActiveGapId(gapId);
    },
    [],
  );

  const applyChangeFromWeb = useCallback(
    (payload: {content: SlateParagraph[]; gapIds: string[]}) => {
      const nextContent =
        payload.content?.length > 0 ? payload.content : defaultContent();
      const ids = new Set(payload.gapIds || []);
      let nextGaps = gapsRef.current.filter(g => ids.has(g.id));
      // keep order of appearance
      nextGaps = (payload.gapIds || [])
        .map(id => nextGaps.find(g => g.id === id) || gapsRef.current.find(g => g.id === id))
        .filter(Boolean) as FillGapsGap[];
      contentRef.current = nextContent;
      gapsRef.current = nextGaps;
      onChange({content: nextContent, gaps: nextGaps});
    },
    [onChange],
  );

  const onMessage = useCallback(
    (event: {nativeEvent: {data: string}}) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'ready') {
          ready.current = true;
          const html = slateToEditorHtml(contentRef.current, gapsRef.current);
          postToWeb(webRef, {type: 'setHtml', payload: html});
          return;
        }
        if (msg.type === 'change') {
          applyChangeFromWeb(msg.payload);
          return;
        }
        if (msg.type === 'gapCreated') {
          const gapId = String(msg.payload.gapId);
          const text = String(msg.payload.text || '').trim();
          const nextGaps = gapsRef.current.concat({
            id: gapId,
            originalText: text,
            options: text
              ? [{id: newId(), value: text, isCorrect: true}]
              : [],
          });
          gapsRef.current = nextGaps;
          onChange({content: contentRef.current, gaps: nextGaps});
          openGapModal(gapId, text);
          return;
        }
        if (msg.type === 'gapTap') {
          openGapModal(String(msg.payload.gapId));
        }
      } catch {
        // ignore
      }
    },
    [applyChangeFromWeb, onChange, openGapModal],
  );

  const saveGapModal = () => {
    if (!activeGapId) {
      return;
    }
    const labelText =
      draftOptions.find(o => o.isCorrect)?.value ||
      draftOptions[0]?.value ||
      '…';
    const nextGaps = gapsRef.current.map(g =>
      g.id === activeGapId
        ? {
            ...g,
            options: draftOptions.map(o => ({
              ...o,
              value: o.value.trim(),
            })),
            originalText: g.originalText || labelText,
          }
        : g,
    );
    // if somehow missing (race), append
    if (!nextGaps.some(g => g.id === activeGapId)) {
      nextGaps.push({
        id: activeGapId,
        originalText: labelText,
        options: draftOptions,
      });
    }
    gapsRef.current = nextGaps;
    onChange({content: contentRef.current, gaps: nextGaps});
    postToWeb(webRef, {
      type: 'updateGapLabel',
      payload: {gapId: activeGapId, label: labelText},
    });
    setActiveGapId(null);
  };

  const deleteActiveGap = () => {
    if (!activeGapId) {
      return;
    }
    postToWeb(webRef, {type: 'removeGap', payload: {gapId: activeGapId}});
    const nextGaps = gapsRef.current.filter(g => g.id !== activeGapId);
    gapsRef.current = nextGaps;
    onChange({content: contentRef.current, gaps: nextGaps});
    setActiveGapId(null);
  };

  return (
    <View style={styles.wrap}>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.toolbar}>
        <Pressable
          style={styles.makeGapBtn}
          onPress={() => postToWeb(webRef, {type: 'makeGap'})}>
          <Text style={styles.makeGapText}>{label}</Text>
        </Pressable>
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
      />
      <Text style={styles.gapCount}>
        {t('editor.gaps')}: {gaps.length}
      </Text>

      <Modal
        visible={!!activeGapId}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveGapId(null)}>
        <View style={[styles.modalRoot, {paddingTop: insets.top + 8}]}>
          <Text style={styles.modalTitle}>{t('editor.gapOptions')}</Text>
          <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 40}}>
            {draftOptions.map((opt, index) => (
              <View key={opt.id} style={editorStyles.itemCard}>
                <TextField
                  label={`${t('editor.option')} ${index + 1}`}
                  value={opt.value}
                  onChangeText={value =>
                    setDraftOptions(prev =>
                      prev.map(o => (o.id === opt.id ? {...o, value} : o)),
                    )
                  }
                />
                <Pressable
                  style={[
                    editorStyles.chip,
                    opt.isCorrect && editorStyles.chipActive,
                    {alignSelf: 'flex-start'},
                  ]}
                  onPress={() =>
                    setDraftOptions(prev =>
                      prev.map(o =>
                        o.id === opt.id
                          ? {...o, isCorrect: !o.isCorrect}
                          : o,
                      ),
                    )
                  }>
                  <Text
                    style={[
                      editorStyles.chipText,
                      opt.isCorrect && editorStyles.chipTextActive,
                    ]}>
                    {opt.isCorrect
                      ? t('editor.correct')
                      : t('editor.markCorrect')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setDraftOptions(prev => prev.filter(o => o.id !== opt.id))
                  }>
                  <Text style={editorStyles.removeText}>
                    {t('common.delete')}
                  </Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              style={editorStyles.addBtn}
              onPress={() =>
                setDraftOptions(prev =>
                  prev.concat({
                    id: newId(),
                    value: '',
                    isCorrect: false,
                  }),
                )
              }>
              <Text style={editorStyles.addBtnText}>
                + {t('editor.addOption')}
              </Text>
            </Pressable>
            <Button title={t('common.save')} onPress={saveGapModal} />
            <Pressable style={styles.deleteGap} onPress={deleteActiveGap}>
              <Text style={editorStyles.removeText}>
                {t('editor.deleteGap')}
              </Text>
            </Pressable>
            <Pressable
              style={styles.cancel}
              onPress={() => setActiveGapId(null)}>
              <Text style={{color: colors.muted, fontWeight: '600'}}>
                {t('common.cancel')}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
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
  hint: {
    paddingHorizontal: 12,
    paddingTop: 10,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  toolbar: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#F8F7FC',
  },
  makeGapBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  makeGapText: {color: colors.white, fontWeight: '700'},
  web: {width: '100%', backgroundColor: colors.white},
  gapCount: {
    padding: 10,
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  modalRoot: {flex: 1, backgroundColor: colors.inputBg},
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    color: colors.text,
  },
  deleteGap: {alignItems: 'center', paddingVertical: 14},
  cancel: {alignItems: 'center', paddingVertical: 10},
});
