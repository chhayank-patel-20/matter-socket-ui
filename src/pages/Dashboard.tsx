import { useState } from 'react';
import { useWS } from '../context/WebSocketContext';
import type { MatterNode } from '../types/matter';
import { Link } from 'react-router-dom';
import { Wifi, WifiOff, RefreshCw, Cpu } from 'lucide-react';

export function Dashboard() {
  const { status, wsUrl, setWsUrl, connect, disconnect, sendCommand, setNodes, nodes } = useWS();
  const [urlInput, setUrlInput] = useState(wsUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = () => {
    setWsUrl(urlInput);
    connect(urlInput);
  };

  const loadNodes = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await sendCommand('get_nodes');
      const result = (resp as { result?: MatterNode[] }).result;
      if (Array.isArray(result)) setNodes(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Connection Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Server Connection</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && status === 'disconnected' && handleConnect()}
            placeholder="ws://localhost:5580/ws"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {status === 'disconnected' ? (
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer"
            >
              <Wifi className="w-4 h-4" /> Connect
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 cursor-pointer"
            >
              <WifiOff className="w-4 h-4" /> Disconnect
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400">Default endpoint: ws://localhost:5580/ws</p>
      </div>

      {/* Nodes Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Commissioned Nodes ({nodes.length})</h2>
          <button
            onClick={loadNodes}
            disabled={status !== 'connected' || loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        {nodes.length === 0 ? (
          <p className="text-gray-500 text-sm">No nodes loaded. Connect to server and click Refresh.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nodes.map(node => (
              <Link
                key={node.node_id}
                to={`/devices?node=${node.node_id}`}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <Cpu className={`w-8 h-8 ${node.available ? 'text-green-500' : 'text-gray-400'}`} />
                <div>
                  <p className="font-medium text-gray-900">Node {node.node_id}</p>
                  <p className={`text-xs ${node.available ? 'text-green-600' : 'text-gray-500'}`}>
                    {node.available ? 'Online' : 'Offline'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
