import { useRef, useEffect, useState } from 'react';
import { useWS } from '../context/WebSocketContext';
import type { LogEntry } from '../types/matter';
import { Trash2, ArrowDown, FileJson } from 'lucide-react';

const directionStyles: Record<LogEntry['direction'], string> = {
  send: 'text-blue-400',
  recv: 'text-green-400',
  info: 'text-gray-500',
  error: 'text-red-400',
};

const directionLabels: Record<LogEntry['direction'], string> = {
  send: 'SEND →',
  recv: '← RECV',
  info: '  INFO',
  error: ' ERROR',
};

export function Console() {
  const { logs, sendCommand, status } = useWS();
  const [autoScroll, setAutoScroll] = useState(true);
  const [cleared, setCleared] = useState(0);
  const [rawCommand, setRawCommand] = useState('{\n  "command": "get_nodes",\n  "args": {}\n}');
  const [sendError, setSendError] = useState('');
  const [importDump, setImportDump] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const visibleLogs = logs.slice(cleared);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleLogs, autoScroll]);

  const sendRaw = async () => {
    setSendError('');
    try {
      const parsed = JSON.parse(rawCommand);
      if (!parsed.command) throw new Error('"command" field required');
      await sendCommand(parsed.command, parsed.args);
    } catch (e) {
      setSendError(String(e));
    }
  };

  const handleImport = async () => {
    setSendError('');
    try {
      await sendCommand('import_test_node', { dump: importDump });
      alert('Test node imported!');
      setImportDump('');
    } catch (e) {
      setSendError(String(e));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-12">
      <h1 className="text-2xl font-bold text-gray-900">Debug Console</h1>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Raw Send */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Send Raw Command</h2>
          <textarea
            value={rawCommand}
            onChange={e => setRawCommand(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {sendError && !importDump && <p className="text-xs text-red-600">{sendError}</p>}
          <button
            onClick={sendRaw}
            disabled={status !== 'connected'}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            Send
          </button>
        </div>

        {/* Import Test Node */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileJson className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-semibold text-gray-700">Import Test Node</h2>
          </div>
          <textarea
            value={importDump}
            onChange={e => setImportDump(e.target.value)}
            rows={5}
            placeholder="Paste diagnostics dump here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {sendError && importDump && <p className="text-xs text-red-600">{sendError}</p>}
          <button
            onClick={handleImport}
            disabled={status !== 'connected'}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
          >
            Import
          </button>
        </div>
      </div>

      {/* Log display */}
      <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
          <span className="text-xs text-gray-400 font-mono">
            {visibleLogs.length} / 200 messages
            {logs.length >= 200 && <span className="ml-2 text-yellow-600">(oldest dropped)</span>}
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
              onClick={() => setCleared(logs.length)}
              className="text-gray-500 hover:text-gray-300 cursor-pointer"
              title="Clear console"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="h-96 overflow-y-auto p-3 space-y-0.5 font-mono text-xs">
          {visibleLogs.length === 0 ? (
            <p className="text-gray-600 py-2">No messages yet...</p>
          ) : (
            visibleLogs.map(log => (
              <div key={log.id} className="flex gap-2 hover:bg-gray-900 px-1 py-0.5 rounded">
                <span className="text-gray-600 shrink-0 tabular-nums">{log.timestamp.slice(11, 23)}</span>
                <span className={`shrink-0 w-14 ${directionStyles[log.direction]}`}>
                  {directionLabels[log.direction]}
                </span>
                <span className="text-gray-300 break-all">
                  {typeof log.data === 'string' ? log.data : JSON.stringify(log.data)}
                </span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
