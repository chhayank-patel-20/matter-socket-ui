import { useState, useEffect, useRef, useCallback } from 'react';
import type { MatterMessage, ConnectionStatus, LogEntry } from '../types/matter';

let messageCounter = 1;

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Map<string, (result: unknown) => void>>(new Map());
  const eventHandlersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectUrlRef = useRef<string>('');
  const manualDisconnectRef = useRef(false);

  const addLog = useCallback((direction: LogEntry['direction'], data: unknown) => {
    setLogs(prev => [...prev.slice(-199), {
      id: String(Date.now() + Math.random()),
      timestamp: new Date().toISOString(),
      direction,
      data,
    }]);
  }, []);

  const connect = useCallback((wsUrl: string) => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    manualDisconnectRef.current = false;
    reconnectUrlRef.current = wsUrl;
    setStatus('connecting');
    addLog('info', `Connecting to ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      addLog('info', 'Connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        addLog('recv', msg);

        if (msg.message_id && pendingRef.current.has(msg.message_id)) {
          const resolve = pendingRef.current.get(msg.message_id)!;
          pendingRef.current.delete(msg.message_id);
          resolve(msg);
        }

        if (msg.event) {
          const handlers = eventHandlersRef.current.get(msg.event);
          if (handlers) handlers.forEach(handler => handler(msg.data));
          const wildcard = eventHandlersRef.current.get('*');
          if (wildcard) wildcard.forEach(handler => handler(msg));
        }
      } catch {
        addLog('error', `Parse error: ${event.data}`);
      }
    };

    ws.onerror = () => {
      addLog('error', 'WebSocket error');
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (manualDisconnectRef.current) return;
      setStatus('reconnecting');
      addLog('info', 'Disconnected — reconnecting in 3s...');
      reconnectTimerRef.current = setTimeout(() => {
        connect(reconnectUrlRef.current);
      }, 3000);
    };
  }, [addLog]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
    addLog('info', 'Disconnected');
  }, [addLog]);

  const sendCommand = useCallback((command: string, args?: Record<string, unknown>): Promise<MatterMessage> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }
      const message_id = String(messageCounter++);
      const msg: MatterMessage = { message_id, command, args };
      addLog('send', msg);
      pendingRef.current.set(message_id, resolve as (r: unknown) => void);
      wsRef.current.send(JSON.stringify(msg));

      setTimeout(() => {
        if (pendingRef.current.has(message_id)) {
          pendingRef.current.delete(message_id);
          reject(new Error('Request timed out after 30s'));
        }
      }, 30000);
    });
  }, [addLog]);

  const onEvent = useCallback((event: string, handler: (data: unknown) => void) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    const handlers = eventHandlersRef.current.get(event)!;
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        eventHandlersRef.current.delete(event);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      manualDisconnectRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  return { status, logs, connect, disconnect, sendCommand, onEvent };
}
