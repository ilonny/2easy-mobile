import {API_BASE_URL} from '../../../shared/config';
import {readStorage} from '../../../shared/lib/storage';
import {STORAGE_KEYS} from '../../../shared/config';

export const CHAT_WS_PATH = '/api/chat/ws';
export const CHAT_REALTIME_PING_MS = 25000;
export const CHAT_RECONNECT_MS = 2000;

export type ChatReply = {
  id: number;
  message: string;
  sender: string;
};

export type ChatReaction = {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
};

export type ChatMessage = {
  id: number;
  message: string;
  sender: string;
  direction: 'incoming' | 'outgoing';
  is_mine?: boolean;
  created_at?: string | null;
  edited_at?: string | null;
  reply_to?: ChatReply | null;
  reactions?: ChatReaction[];
};

export type ChatRealtimeCallbacks = {
  onHistory?: (messages: ChatMessage[]) => void;
  onMessage?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onReaction?: (messageId: number, reactions: ChatReaction[]) => void;
  onError?: (message: string) => void;
  onConnectionChange?: (connected: boolean) => void;
};

async function getChatWsUrl(
  lessonId: number,
  studentId?: number,
  sessionId?: number,
) {
  const token = await readStorage(STORAGE_KEYS.token);
  const wsBase = API_BASE_URL.replace(/^http/i, 'ws');
  const params = new URLSearchParams({
    lesson_id: String(lessonId),
  });
  if (studentId) {
    params.set('student_id', String(studentId));
  }
  if (sessionId) {
    params.set('session_id', String(sessionId));
  }
  if (token) {
    params.set('token', token);
  }
  return `${wsBase}${CHAT_WS_PATH}?${params.toString()}`;
}

type PendingSend = {
  message: string;
  replyToId?: number | null;
};

type WsIncoming = {
  type: string;
  message?: ChatMessage | string;
  messages?: ChatMessage[];
  message_id?: number;
  reactions?: ChatReaction[];
};

export class ChatWsAdapter {
  private ws: WebSocket | null = null;
  private callbacks: ChatRealtimeCallbacks = {};
  private lessonId: number | null = null;
  private studentId: number | null = null;
  private sessionId: number | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private connectionGen = 0;
  private pendingSends: PendingSend[] = [];

  async connect(
    lessonId: number,
    studentId: number | undefined,
    sessionId: number | undefined,
    callbacks: ChatRealtimeCallbacks,
  ) {
    this.teardownSocket();
    this.lessonId = lessonId;
    this.studentId = studentId || null;
    this.sessionId = sessionId || null;
    this.callbacks = callbacks;
    this.shouldReconnect = true;
    this.connectionGen += 1;
    await this.openSocket(this.connectionGen);
  }

  private async openSocket(gen: number): Promise<void> {
    if (!this.lessonId) {
      throw new Error('lessonId is required');
    }
    if (gen !== this.connectionGen) {
      return;
    }

    const url = await getChatWsUrl(
      this.lessonId,
      this.studentId || undefined,
      this.sessionId || undefined,
    );
    if (gen !== this.connectionGen) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (gen !== this.connectionGen || !this.lessonId) {
        resolve();
        return;
      }

      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        if (gen !== this.connectionGen || this.ws !== ws) {
          ws.close();
          resolve();
          return;
        }
        this.callbacks.onConnectionChange?.(true);
        this.startPing();
        this.flushPendingSends();
        resolve();
      };

      ws.onmessage = event => {
        if (gen !== this.connectionGen || this.ws !== ws) {
          return;
        }
        this.handleMessage(String(event.data || ''));
      };

      ws.onerror = () => {
        if (gen !== this.connectionGen || this.ws !== ws) {
          return;
        }
        this.callbacks.onError?.('WebSocket error');
        reject(new Error('WebSocket error'));
      };

      ws.onclose = () => {
        if (this.ws === ws) {
          this.ws = null;
        }
        this.stopPing();
        if (gen !== this.connectionGen) {
          return;
        }
        this.callbacks.onConnectionChange?.(false);
        if (this.shouldReconnect && this.lessonId) {
          this.reconnectTimer = setTimeout(() => {
            if (!this.shouldReconnect || gen !== this.connectionGen) {
              return;
            }
            void this.openSocket(this.connectionGen);
          }, CHAT_RECONNECT_MS);
        }
      };
    });
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.sendRaw({type: 'ping'});
    }, CHAT_REALTIME_PING_MS);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private sendRaw(payload: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  private flushPendingSends() {
    if (!this.pendingSends.length) {
      return;
    }
    const queue = [...this.pendingSends];
    this.pendingSends = [];
    for (const item of queue) {
      const ok = this.sendRaw({
        type: 'send',
        message: item.message,
        ...(item.replyToId ? {reply_to_id: item.replyToId} : {}),
      });
      if (!ok) {
        this.pendingSends.push(item);
        break;
      }
    }
  }

  private handleMessage(raw: string) {
    let payload: WsIncoming;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    switch (payload.type) {
      case 'pong':
        return;
      case 'history':
        this.callbacks.onHistory?.(
          Array.isArray(payload.messages) ? payload.messages : [],
        );
        return;
      case 'message':
        if (payload.message && typeof payload.message === 'object') {
          this.callbacks.onMessage?.(payload.message);
        }
        return;
      case 'edit':
        if (payload.message && typeof payload.message === 'object') {
          this.callbacks.onEdit?.(payload.message);
        }
        return;
      case 'reaction':
        if (
          payload.message_id != null &&
          Number(payload.message_id) > 0 &&
          Array.isArray(payload.reactions)
        ) {
          this.callbacks.onReaction?.(
            Number(payload.message_id),
            payload.reactions,
          );
        }
        return;
      case 'error':
        this.callbacks.onError?.(
          typeof payload.message === 'string'
            ? payload.message
            : 'Unknown error',
        );
        return;
      default:
        return;
    }
  }

  sendMessage(message: string, replyToId?: number | null) {
    const payload = {
      type: 'send',
      message,
      ...(replyToId ? {reply_to_id: replyToId} : {}),
    };
    if (this.sendRaw(payload)) {
      return;
    }
    this.pendingSends.push({message, replyToId});
  }

  editMessage(id: number, message: string) {
    this.sendRaw({type: 'edit', id, message});
  }

  toggleReaction(messageId: number, emoji: string) {
    this.sendRaw({type: 'reaction', message_id: messageId, emoji});
  }

  private teardownSocket() {
    this.shouldReconnect = false;
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
  }

  disconnect() {
    this.connectionGen += 1;
    this.pendingSends = [];
    this.teardownSocket();
    this.lessonId = null;
    this.studentId = null;
    this.sessionId = null;
    this.callbacks = {};
  }
}
