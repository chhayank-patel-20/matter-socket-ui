import { useState, useEffect, useRef } from 'react';
import { useWS } from '../context/WebSocketContext';
import { Bell, BellOff, Trash2, ArrowDown } from 'lucide-react';

const MAX_EVENTS = 50;

interface LiveEvent {
  id: string;
  timestamp: string;
  raw: unknown;
}

export function Notifications() {
  const { status, sendCommand, onEvent } = useWS();
  const [listening, setListening] = useState(false);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for all server-pushed events
    const unsub = onEvent('*', (data) => {
      setEvents(prev => {
        const next = [...prev, {
          id: String(Date.now() + Math.random()),
          timestamp: new Date().toISOString(),
          raw: data,
        }];
        // Keep last 50 only
        return next.slice(-MAX_EVENTS);
      });
    });
    return unsub;
  }, [onEvent]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, autoScroll]);

  const startListening = async () => {
    setError('');
    try {
      await sendCommand('start_listening');
      setListening(true);
    } catch (e) {
      setError(String(e));
    }
  };

  const stopListening = () => {
    setListening(false);
  };

  // Determine event type colour
  const eventColor = (raw: unknown): string => {
    const r = raw as Record<string, unknown>;
    const event = r?.event as string | undefined;
    if (!event) return 'border-gray-700';
    if (event.includes('attribute')) return 'border-blue-500';
    if (event.includes('node')) return 'border-green-500';
    if (event.includes('error') || event.includes('fail')) return 'border-red-500';
    return 'border-purple-500';
  };

  const eventLabel = (raw: unknown): string => {
    const r = raw as Record<string, unknown>;
    return (r?.event as string) ?? 'event';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Live Events</h1>

      {/* Control card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Event Subscription</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Sends <code className="bg-gray-100 px-1 rounded font-mono">start_listening</code> to the server.
            The server will then push attribute updates and node events in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!listening ? (
            <button
              onClick={startListening}
              disabled={status !== 'connected'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              Start Listening
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 cursor-pointer"
            >
              <BellOff className="w-4 h-4" />
              Stop Listening
            </button>
          )}

          {listening && (
            <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Listening for events...
            </span>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-600">
          <p className="text-gray-400 mb-1">// Message sent to server:</p>
          <p>{'{'}</p>
          <p className="ml-4">"message_id": "&lt;auto&gt;",</p>
          <p className="ml-4">"command": "start_listening"</p>
          <p>{'}'}</p>
        </div>
      </div>

      {/* Events feed */}
      <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
          <span className="text-xs text-gray-400 font-mono">
            {events.length} / {MAX_EVENTS} events
            {events.length === MAX_EVENTS && <span className="ml-2 text-yellow-600">(oldest dropped)</span>}
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={e => setAutoScroll(e.target.checked)}
                className="w-3 h-3 accent-blue-500"
              />
              <ArrowDown className="w-3 h-3" />
              Auto-scroll
            </label>
            <button
              onClick={() => setEvents([])}
              className="text-gray-500 hover:text-gray-300 cursor-pointer"
              title="Clear events"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="h-[32rem] overflow-y-auto p-3 space-y-2 font-mono text-xs">
          {events.length === 0 ? (
            <div className="text-gray-600 py-4 text-center">
              <p>No events received yet.</p>
              <p className="mt-1 text-gray-700">Click <span className="text-blue-400">Start Listening</span> to subscribe.</p>
            </div>
          ) : (
            events.map(ev => (
              <div
                key={ev.id}
                className={`border-l-2 pl-3 py-1 ${eventColor(ev.raw)}`}
              >
                <div className="flex items-center gap-3 mb-0.5">
                  <span className="text-gray-500 tabular-nums">{ev.timestamp.slice(11, 23)}</span>
                  <span className="text-purple-400 font-semibold">{eventLabel(ev.raw)}</span>
                </div>
                <pre className="text-gray-300 whitespace-pre-wrap break-all">
                  {JSON.stringify(ev.raw, null, 2)}
                </pre>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
