import { useWS } from '../context/WebSocketContext';
import { useState } from 'react';
import { Zap, CheckCircle, AlertCircle } from 'lucide-react';

const COMMON_CLUSTERS = [
  { id: 6, name: 'OnOff', commands: ['On', 'Off', 'Toggle'] },
  { id: 8, name: 'LevelControl', commands: ['MoveToLevel', 'Move', 'Step', 'Stop'] },
  { id: 768, name: 'ColorControl', commands: ['MoveToHue', 'MoveToSaturation', 'MoveToColor', 'MoveToColorTemperature'] },
];

export function Commands() {
  const { status, sendCommand, nodes, commandsState, setCommandsState } = useWS();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const { nodeId, endpointId, clusterId, commandName, payload } = commandsState;

  const update = (patch: Partial<typeof commandsState>) =>
    setCommandsState({ ...commandsState, ...patch });

  const selectedCluster = COMMON_CLUSTERS.find(c => c.id === parseInt(clusterId));

  const sendCmd = async (overrideCommand?: string, overrideClusterId?: number) => {
    setLoading(true);
    setResult(null);
    try {
      let parsedPayload: Record<string, unknown> = {};
      if (payload.trim() !== '{}') {
        parsedPayload = JSON.parse(payload);
      }
      const args: Record<string, unknown> = {
        node_id: parseInt(nodeId),
        endpoint_id: parseInt(endpointId),
        cluster_id: overrideClusterId ?? parseInt(clusterId),
        command_name: overrideCommand ?? commandName,
        payload: parsedPayload,
      };
      const resp = await sendCommand('device_command', args);
      const r = resp as { result?: unknown; error_code?: string; details?: string };
      if (r.error_code) {
        setResult({ success: false, message: r.details || r.error_code });
      } else {
        setResult({ success: true, message: `Command sent successfully. Result: ${JSON.stringify(r.result)}` });
      }
    } catch (e) {
      setResult({ success: false, message: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Device Commands</h1>

      {/* Command Builder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Command Builder</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Node ID</label>
            <select
              value={nodeId}
              onChange={e => update({ nodeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select node...</option>
              {nodes.map(n => (
                <option key={n.node_id} value={n.node_id}>Node {n.node_id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Endpoint ID</label>
            <input
              type="number"
              value={endpointId}
              onChange={e => update({ endpointId: e.target.value })}
              min={0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cluster</label>
            <select
              value={clusterId}
              onChange={e => {
                const c = COMMON_CLUSTERS.find(x => x.id === parseInt(e.target.value));
                update({ clusterId: e.target.value, commandName: c ? c.commands[0] : commandName });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {COMMON_CLUSTERS.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
              ))}
              <option value="custom">Custom Cluster ID...</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Command</label>
            {selectedCluster ? (
              <select
                value={commandName}
                onChange={e => update({ commandName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {selectedCluster.commands.map(cmd => (
                  <option key={cmd} value={cmd}>{cmd}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={commandName}
                onChange={e => update({ commandName: e.target.value })}
                placeholder="CommandName"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Payload (JSON) — sent as <code className="bg-gray-100 px-1 rounded">payload</code> field
          </label>
          <textarea
            value={payload}
            onChange={e => update({ payload: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Preview of the full message that will be sent */}
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">Preview message</summary>
          <pre className="mt-2 bg-gray-50 rounded p-3 text-gray-700 overflow-x-auto">
{JSON.stringify({
  message_id: '<auto>',
  command: 'device_command',
  args: {
    node_id: nodeId ? parseInt(nodeId) : '<node_id>',
    endpoint_id: parseInt(endpointId) || '<endpoint_id>',
    cluster_id: parseInt(clusterId) || '<cluster_id>',
    command_name: commandName || '<command_name>',
    payload: (() => { try { return JSON.parse(payload); } catch { return payload; } })(),
  },
}, null, 2)}
          </pre>
        </details>

        <button
          onClick={() => sendCmd()}
          disabled={status !== 'connected' || loading || !nodeId}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          <Zap className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
          {loading ? 'Sending...' : 'Send Command'}
        </button>

        {result && (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.success
              ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            }
            {result.message}
          </div>
        )}
      </div>

      {/* Quick OnOff controls */}
      {nodeId && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">OnOff Quick Controls</h2>
            <p className="text-xs text-gray-500 mt-0.5">Node {nodeId} · Endpoint {endpointId} · Cluster 6 (OnOff)</p>
          </div>
          <div className="flex gap-3">
            {[
              { cmd: 'On', cls: 'bg-green-500 hover:bg-green-600 text-white' },
              { cmd: 'Off', cls: 'bg-red-500 hover:bg-red-600 text-white' },
              { cmd: 'Toggle', cls: 'bg-gray-200 hover:bg-gray-300 text-gray-800' },
            ].map(({ cmd, cls }) => (
              <button
                key={cmd}
                onClick={() => sendCmd(cmd, 6)}
                disabled={status !== 'connected' || loading}
                className={`px-8 py-3 rounded-lg font-semibold text-sm disabled:opacity-50 cursor-pointer transition-colors ${cls}`}
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
