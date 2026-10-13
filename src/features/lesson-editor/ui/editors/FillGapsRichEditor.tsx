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
            )}" data-label="${label}" contenteditable="false" unselectable="on"></span> `;
          }
          return textNodeToHtml(child as SlateText);
        })
        .join('');
      return `<p>${inner || '<br>'}</p>`;
    })
    .join('');
}

function buildFillGapsHtml(initialHtml: string, makeGapLabel: string) {
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
    -webkit-user-select: none !important;
    user-select: none !important;
    -webkit-touch-callout: none !important;
    -webkit-user-modify: read-only;
  }
  .gap::before {
    content: attr(data-label);
    pointer-events: none;
    -webkit-user-select: none;
    user-select: none;
  }
  #gapFloat {
    position: fixed;
    z-index: 10050;
    display: none;
    transform: translateX(-50%);
    pointer-events: auto;
    filter: drop-shadow(0 4px 16px rgba(17, 24, 39, 0.2));
  }
  #gapFloat.show { display: block; }
  #gapFloatInner {
    padding: 5px;
    border-radius: 14px;
    background: #ffffff;
    border: 1px solid rgba(63, 40, 198, 0.35);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.9) inset,
      0 12px 28px rgba(17, 24, 39, 0.18);
  }
  #makeGap {
    border: 0;
    background: #3F28C6;
    color: #fff;
    font-weight: 800;
    letter-spacing: 0.02em;
    border-radius: 10px;
    min-height: 36px;
    padding: 8px 14px;
    white-space: nowrap;
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.12) inset;
  }
</style>
</head>
<body>
<div id="editor" contenteditable="true"></div>
<div id="gapFloat"><div id="gapFloatInner"><button id="makeGap" type="button"></button></div></div>
<script>
(function() {
  var editor = document.getElementById('editor');
  var gapFloat = document.getElementById('gapFloat');
  var makeBtn = document.getElementById('makeGap');
  makeBtn.textContent = ${makeLabel};
  editor.innerHTML = ${safe};

  var SHOW_DELAY_MS = 300;
  var floatTimer = null;
  var selecting = false;

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
    var seenGapIds = {};
    var clones = [];
    var blocks = Array.from(editor.childNodes);
    if (!blocks.length) {
      paras.push({ type: 'paragraph', children: [{ text: '' }] });
      return { content: paras, gapIds: gapIds, clones: clones };
    }
    blocks.forEach(function(node) {
      if (node.nodeType === 3) {
        var t = (node.textContent || '').replace(/\\u200B/g, '');
        if (t) paras.push({ type: 'paragraph', children: [{ text: t }] });
        return;
      }
      if (node.nodeType !== 1) return;
      var el = node;
      var tag = el.tagName.toLowerCase();
      if (tag !== 'p' && tag !== 'div') {
        el = document.createElement('p');
        el.appendChild(node.cloneNode(true));
      }
      var children = [];
      function walk(n, marks) {
        if (n.nodeType === 3) {
          var text = (n.textContent || '').replace(/\\u200B/g, '');
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
          // Same word pasted twice must not share gapId / options
          if (seenGapIds[gid]) {
            var fromId = gid;
            gid = uuid();
            e.setAttribute('data-gap-id', gid);
            clones.push({ fromId: fromId, gapId: gid });
          }
          seenGapIds[gid] = true;
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
    return { content: paras, gapIds: gapIds, clones: clones };
  }

  var emitTimer = null;
  function emitChange() {
    post('change', serialize());
  }
  function scheduleEmit() {
    if (emitTimer) clearTimeout(emitTimer);
    emitTimer = setTimeout(emitChange, 150);
  }

  function closestGap(node) {
    var el = node && node.nodeType === 1 ? node : node && node.parentElement;
    while (el && el !== editor) {
      if (el.classList && el.classList.contains('gap')) return el;
      el = el.parentElement;
    }
    return null;
  }

  function selectionGap() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    var r = sel.getRangeAt(0);
    return closestGap(r.startContainer) || closestGap(r.endContainer) || closestGap(r.commonAncestorContainer);
  }

  function selectionHasGap() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return true;
    return !!selectionGap();
  }

  function makeGapEl(id, label) {
    var el = document.createElement('span');
    el.className = 'gap';
    el.setAttribute('data-gap-id', id);
    el.setAttribute('data-label', label || '…');
    el.setAttribute('contenteditable', 'false');
    el.setAttribute('unselectable', 'on');
    return el;
  }

  function paragraphOf(node) {
    var el = node && node.nodeType === 1 ? node : node && node.parentElement;
    while (el && el !== editor) {
      if (el.nodeName === 'P' || el.nodeName === 'DIV') return el;
      el = el.parentElement;
    }
    return null;
  }

  function wrapGapInParagraph(span) {
    while (
      span.parentNode &&
      span.parentNode !== editor &&
      span.parentNode.nodeName !== 'P' &&
      span.parentNode.nodeName !== 'DIV'
    ) {
      var wrap = span.parentNode;
      wrap.parentNode.insertBefore(span, wrap);
      if (!wrap.childNodes.length) wrap.parentNode.removeChild(wrap);
    }
    if (span.parentNode === editor) {
      var p = document.createElement('p');
      editor.insertBefore(p, span);
      p.appendChild(span);
    }
  }

  function ensureCaretHome(gap) {
    wrapGapInParagraph(gap);
    var p = paragraphOf(gap) || gap.parentNode;
    var next = gap.nextSibling;
    if (next && next.nodeType === 3 && !next.textContent) {
      p.removeChild(next);
      next = gap.nextSibling;
    }
    var home;
    if (next && next.nodeType === 3) {
      home = next;
      if (!home.textContent || home.textContent === '\\u200B') {
        home.textContent = '\\u00A0';
      }
    } else {
      home = document.createTextNode('\\u00A0');
      p.insertBefore(home, gap.nextSibling);
    }
    var hasBr = false;
    for (var n = p.firstChild; n; n = n.nextSibling) {
      if (n.nodeName === 'BR') {
        hasBr = true;
        break;
      }
    }
    if (!hasBr) {
      p.appendChild(document.createElement('br'));
    }
    return home;
  }

  var placingCaret = false;
  function placeCaretAfter(node) {
    if (placingCaret || !node || !node.parentNode) return;
    placingCaret = true;
    try {
      var target = node;
      if (node.classList && node.classList.contains('gap')) {
        target = ensureCaretHome(node);
      }
      var r = document.createRange();
      if (target.nodeType === 3) {
        r.setStart(target, target.textContent.length);
      } else {
        r.setStartAfter(target);
      }
      r.collapse(true);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      editor.focus();
    } catch (err) {
      try { editor.focus(); } catch (e2) {}
    }
    placingCaret = false;
  }

  function isCaretHolderText(text) {
    return !String(text || '').replace(/[\\u00A0\\u200B ]/g, '');
  }

  function gapBeforeCaret() {
    var trapped = selectionGap();
    if (trapped) return trapped;
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
    var r = sel.getRangeAt(0);
    var node = r.startContainer;
    var offset = r.startOffset;
    if (node.nodeType === 3) {
      var prev = node.previousSibling;
      if (prev && prev.classList && prev.classList.contains('gap')) {
        var before = (node.textContent || '').slice(0, offset);
        if (isCaretHolderText(before)) return prev;
      }
      if (offset === 0) {
        var p = node.previousSibling;
        while (p && p.nodeType === 3 && isCaretHolderText(p.textContent)) {
          p = p.previousSibling;
        }
        if (p && p.classList && p.classList.contains('gap')) return p;
      }
    }
    if (node.nodeType === 1 && offset > 0) {
      var child = node.childNodes[offset - 1];
      if (child && child.nodeName === 'BR') child = child.previousSibling;
      while (child && child.nodeType === 3 && isCaretHolderText(child.textContent)) {
        child = child.previousSibling;
      }
      if (child && child.classList && child.classList.contains('gap')) return child;
    }
    return null;
  }

  function gapAfterCaret() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
    var r = sel.getRangeAt(0);
    var node = r.startContainer;
    var offset = r.startOffset;
    if (node.nodeType === 3) {
      var text = node.textContent || '';
      if (offset >= text.length || isCaretHolderText(text.slice(offset))) {
        var n = node.nextSibling;
        while (n && ((n.nodeType === 3 && isCaretHolderText(n.textContent)) || n.nodeName === 'BR')) {
          n = n.nextSibling;
        }
        if (n && n.classList && n.classList.contains('gap')) return n;
      }
    }
    if (node.nodeType === 1) {
      var child = node.childNodes[offset];
      while (child && ((child.nodeType === 3 && isCaretHolderText(child.textContent)) || child.nodeName === 'BR')) {
        child = child.nextSibling;
      }
      if (child && child.classList && child.classList.contains('gap')) return child;
    }
    return null;
  }

  function restoreGapEl(el) {
    if (!el || !el.parentNode) return;
    var label = el.getAttribute('data-label') || '';
    var id = el.getAttribute('data-gap-id');
    var textNode = document.createTextNode(label);
    el.parentNode.replaceChild(textNode, el);
    var next = textNode.nextSibling;
    if (next && next.nodeType === 3 && isCaretHolderText(next.textContent)) {
      next.parentNode.removeChild(next);
    }
    try {
      var r = document.createRange();
      r.setStart(textNode, textNode.textContent.length);
      r.collapse(true);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      editor.focus();
    } catch (err) {}
    post('gapRemoved', { gapId: id });
    emitChange();
  }

  function hideFloat() {
    if (floatTimer) {
      clearTimeout(floatTimer);
      floatTimer = null;
    }
    gapFloat.classList.remove('show');
  }

  function placeFloat() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount || !sel.toString().trim() || selectionHasGap()) {
      hideFloat();
      return;
    }
    if (!editor.contains(sel.anchorNode)) {
      hideFloat();
      return;
    }
    var rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width < 1 && rect.height < 1) {
      hideFloat();
      return;
    }
    var btnW = 180;
    var btnH = 48;
    var margin = 12;
    var top = rect.bottom + margin;
    var vvTop = (window.visualViewport && window.visualViewport.offsetTop) || 0;
    var vvH = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    var vvBottom = vvTop + vvH;
    if (top + btnH > vvBottom - 8) {
      top = Math.max(vvTop + 8, rect.top - btnH - margin);
    }
    var left = rect.left + rect.width / 2;
    left = Math.max(btnW / 2 + 8, Math.min(left, window.innerWidth - btnW / 2 - 8));
    gapFloat.style.top = Math.round(top) + 'px';
    gapFloat.style.left = Math.round(left) + 'px';
    gapFloat.classList.add('show');
  }

  function scheduleFloat(immediate) {
    if (floatTimer) {
      clearTimeout(floatTimer);
      floatTimer = null;
    }
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      hideFloat();
      return;
    }
    if (selecting && !immediate) {
      return;
    }
    var run = function() {
      floatTimer = null;
      requestAnimationFrame(function() {
        requestAnimationFrame(placeFloat);
      });
    };
    if (immediate) {
      run();
    } else {
      floatTimer = setTimeout(run, SHOW_DELAY_MS);
    }
  }

  function doMakeGap() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim() || selectionHasGap()) return;
    var text = sel.toString().trim();
    var gapId = uuid();
    var span = makeGapEl(gapId, text);
    var range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(span);
    wrapGapInParagraph(span);
    var home = ensureCaretHome(span);
    hideFloat();
    sel.removeAllRanges();
    var after = document.createRange();
    after.setStart(home, home.textContent.length);
    after.collapse(true);
    sel.addRange(after);
    editor.focus();
    post('gapCreated', { gapId: gapId, text: text });
    emitChange();
  }

  function onMakeGapPointer(e) {
    e.preventDefault();
    e.stopPropagation();
    doMakeGap();
  }
  makeBtn.addEventListener('pointerdown', onMakeGapPointer);
  makeBtn.addEventListener('mousedown', onMakeGapPointer);
  makeBtn.addEventListener('touchstart', onMakeGapPointer, { passive: false });

  editor.addEventListener('selectstart', function(e) {
    if (closestGap(e.target)) {
      e.preventDefault();
    }
  }, true);
  editor.addEventListener('mousedown', function(e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('gap')) {
      e.preventDefault();
    }
  }, true);
  editor.addEventListener('touchstart', function(e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('gap')) {
      e.preventDefault();
    }
  }, { capture: true, passive: false });
  editor.addEventListener('click', function(e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('gap')) {
      e.preventDefault();
      e.stopPropagation();
      hideFloat();
      placeCaretAfter(t);
      post('gapTap', { gapId: t.getAttribute('data-gap-id') });
      return;
    }
    var sel = window.getSelection();
    if (
      (t === editor || (t && (t.nodeName === 'P' || t.nodeName === 'BR'))) &&
      (!sel.rangeCount || selectionGap())
    ) {
      var gaps = editor.querySelectorAll('.gap');
      if (gaps.length) placeCaretAfter(gaps[gaps.length - 1]);
    }
  });
  editor.addEventListener('beforeinput', function(e) {
    var type = e.inputType || '';
    if (type === 'deleteContentBackward' || type === 'deleteByCut') {
      var back = gapBeforeCaret();
      if (back) {
        e.preventDefault();
        restoreGapEl(back);
        return;
      }
    }
    if (type === 'deleteContentForward') {
      var fwd = gapAfterCaret();
      if (fwd) {
        e.preventDefault();
        restoreGapEl(fwd);
        return;
      }
    }
    if (selectionGap()) {
      e.preventDefault();
      var g = selectionGap();
      if (g) placeCaretAfter(g);
    }
  });
  editor.addEventListener('keydown', function(e) {
    if (e.key === 'Backspace') {
      var back = gapBeforeCaret();
      if (back) {
        e.preventDefault();
        restoreGapEl(back);
      }
    } else if (e.key === 'Delete') {
      var fwd = gapAfterCaret();
      if (fwd) {
        e.preventDefault();
        restoreGapEl(fwd);
      }
    }
  });

  editor.addEventListener('input', scheduleEmit);

  function onSelectStart() {
    selecting = true;
    hideFloat();
  }
  function onSelectEnd() {
    selecting = false;
    scheduleFloat(false);
  }
  var kickAt = 0;
  document.addEventListener('selectionchange', function() {
    if (selecting || placingCaret) return;
    var trapped = selectionGap();
    if (trapped) {
      var now = Date.now();
      if (now - kickAt < 40) return;
      kickAt = now;
      placeCaretAfter(trapped);
      return;
    }
    scheduleFloat(false);
  });
  editor.addEventListener('touchstart', onSelectStart, { passive: true });
  editor.addEventListener('touchend', onSelectEnd);
  editor.addEventListener('mouseup', onSelectEnd);
  window.addEventListener('scroll', function() {
    if (gapFloat.classList.contains('show')) placeFloat();
  }, true);

  document.addEventListener('message', handleNative);
  window.addEventListener('message', handleNative);

  function handleNative(event) {
    var raw = event.data;
    try {
      var msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!msg || !msg.type) return;
      if (msg.type === 'setHtml') {
        editor.innerHTML = msg.payload || '<p><br></p>';
        Array.from(editor.querySelectorAll('.gap')).forEach(ensureCaretHome);
        hideFloat();
      } else if (msg.type === 'updateGapLabel') {
        var id = msg.payload && msg.payload.gapId;
        var label = (msg.payload && msg.payload.label) || '…';
        var el = editor.querySelector('[data-gap-id=\"' + id + '\"]');
        if (el) {
          el.setAttribute('data-label', label);
          el.textContent = '';
        }
      } else if (msg.type === 'removeGap') {
        var rid = msg.payload && msg.payload.gapId;
        var gel = editor.querySelector('[data-gap-id=\"' + rid + '\"]');
        if (gel) {
          var textNode = document.createTextNode(gel.getAttribute('data-label') || '');
          gel.parentNode.replaceChild(textNode, gel);
          placeCaretAfter(textNode);
          emitChange();
        }
      } else if (msg.type === 'focusAfterGap') {
        var fid = msg.payload && msg.payload.gapId;
        editor.focus();
        var fel = fid ? editor.querySelector('[data-gap-id=\"' + fid + '\"]') : null;
        if (fel) {
          placeCaretAfter(fel);
        } else {
          var last = editor.querySelector('.gap:last-of-type') || editor.querySelector('p');
          if (last) placeCaretAfter(last);
        }
      } else if (msg.type === 'makeGap') {
        doMakeGap();
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
    (payload: {
      content: SlateParagraph[];
      gapIds: string[];
      clones?: Array<{fromId: string; gapId: string}>;
    }) => {
      const nextContent =
        payload.content?.length > 0 ? payload.content : defaultContent();
      const cloneFrom = new Map(
        (payload.clones || []).map(c => [String(c.gapId), String(c.fromId)]),
      );
      const seen = new Set<string>();
      const nextGaps: FillGapsGap[] = [];
      (payload.gapIds || []).forEach(rawId => {
        const id = String(rawId);
        if (seen.has(id)) {
          return;
        }
        seen.add(id);
        const existing = gapsRef.current.find(g => g.id === id);
        if (existing) {
          nextGaps.push({
            ...existing,
            options: (existing.options || []).map(o => ({...o})),
          });
          return;
        }
        const fromId = cloneFrom.get(id);
        const source = fromId
          ? gapsRef.current.find(g => g.id === fromId) ||
            nextGaps.find(g => g.id === fromId)
          : undefined;
        nextGaps.push({
          id,
          originalText: source?.originalText || '',
          options: (source?.options || []).map(o => ({
            ...o,
            id: newId(),
          })),
        });
      });
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
          return;
        }
        if (msg.type === 'gapRemoved') {
          const gapId = String(msg.payload?.gapId || '');
          const nextGaps = gapsRef.current.filter(g => g.id !== gapId);
          gapsRef.current = nextGaps;
          onChange({content: contentRef.current, gaps: nextGaps});
          setActiveGapId(current => (current === gapId ? null : current));
        }
      } catch {
        // ignore
      }
    },
    [applyChangeFromWeb, onChange, openGapModal],
  );

  const closeGapModal = (focusGapId: string | null) => {
    setActiveGapId(null);
    setTimeout(() => {
      postToWeb(webRef, {
        type: 'focusAfterGap',
        payload: {gapId: focusGapId || ''},
      });
    }, 350);
  };

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
    closeGapModal(activeGapId);
  };

  const deleteActiveGap = () => {
    if (!activeGapId) {
      return;
    }
    postToWeb(webRef, {type: 'removeGap', payload: {gapId: activeGapId}});
    const nextGaps = gapsRef.current.filter(g => g.id !== activeGapId);
    gapsRef.current = nextGaps;
    onChange({content: contentRef.current, gaps: nextGaps});
    closeGapModal(null);
  };

  return (
    <View style={styles.wrap}>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <EditorWebView
        ref={webRef}
        originWhitelist={['*']}
        source={source}
        onMessage={onMessage}
        style={[styles.web, {minHeight}]}
        scrollEnabled
        javaScriptEnabled
        domStorageEnabled
        keyboardDisplayRequiresUserAction={false}
      />
      <Text style={styles.gapCount}>
        {t('editor.gaps')}: {gaps.length}
      </Text>

      <Modal
        visible={!!activeGapId}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => closeGapModal(activeGapId)}>
        <View style={[styles.modalRoot, {paddingTop: insets.top + 8}]}>
          <Text style={styles.modalTitle}>{t('editor.gapOptions')}</Text>
          <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 40}}>
            {draftOptions.map((opt, index) => (
              <View key={opt.id} style={editorStyles.itemCard}>
                <TextField
                  label={t('editor.optionN').replace(
                    '{{n}}',
                    String(index + 1),
                  )}
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
              onPress={() => closeGapModal(activeGapId)}>
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
    paddingBottom: 4,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
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
