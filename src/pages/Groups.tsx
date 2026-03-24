import { useState, useEffect } from 'react';
import { useWS } from '../context/WebSocketContext';
import { Users, Plus, Trash2, Send, Database, CheckCircle, AlertCircle, List, ShieldCheck, X } from 'lucide-react';
import type { Group } from '../types/matter';

export function Groups() {
  const { status, sendCommand, nodes } = useWS();
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Registry Management State
  const [registeredGroups, setRegisteredGroups] = useState<Group[]>([]);
  const [regGroupId, setRegGroupId] = useState('');
  const [regGroupName, setRegGroupName] = useState('');

  // Node Membership State
  const [nodeId, setNodeId] = useState('');
  const [endpointId, setEndpointId] = useState('1');
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [memberships, setMemberships] = useState<number[]>([]);

  // Group Command State
  const [cmdGroupId, setCmdGroupId] = useState('');
  const [clusterId, setClusterId] = useState('6');
  const [commandName, setCommandName] = useState('On');
  const [payload, setPayload] = useState('{}');

  // Advanced Key Management State
  const [keysetId, setKeysetId] = useState('1');
  const [keyHex, setKeyHex] = useState('0102030405060708090a0b0c0d0e0f10');
  const [bindGroupId, setBindGroupId] = useState('');
  const [bindKeysetId, setBindKeysetId] = useState('1');

  useEffect(() => {
    if (status === 'connected') {
      fetchGroups();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchGroups = async () => {
    try {
      const resp = await sendCommand('get_groups');
      const r = resp as { result?: Group[] };
      if (Array.isArray(r.result)) setRegisteredGroups(r.result);
    } catch (e) {
      console.error('Failed to fetch groups:', e);
    }
  };

  const handleAction = async (command: string, args: Record<string, unknown>) => {
    setLoading(command);
    setResult(null);
    try {
      const resp = await sendCommand(command, args);
      const r = resp as { result?: unknown; error_code?: string; details?: string };
      if (r.error_code) {
        setResult({ success: false, message: r.details || r.error_code });
      } else {
        setResult({ success: true, message: `Success: ${JSON.stringify(r.result)}` });
        if (command === 'group_get_membership') setMemberships(r.result as number[]);
        
        // Refresh registry if modified
        if (['add_group', 'remove_group', 'group_add'].includes(command)) {
          fetchGroups();
        }
      }
    } catch (e) {
      setResult({ success: false, message: String(e) });
    } finally {
      setLoading(null);
    }
  };

  const sendGroupCmd = async () => {
    setLoading('group_send_command');
    setResult(null);
    try {
      let p = {};
      try { p = JSON.parse(payload); } catch { /* use empty */ }
      const resp = await sendCommand('group_send_command', {
        group_id: parseInt(cmdGroupId),
        cluster_id: parseInt(clusterId),
        command_name: commandName,
        payload: p,
      });
      const r = resp as { result?: unknown; error_code?: string; details?: string };
      if (r.error_code) {
        setResult({ success: false, message: r.details || r.error_code });
      } else {
        setResult({ success: true, message: 'Group command sent!' });
      }
    } catch (e) {
      setResult({ success: false, message: String(e) });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Groups Management</h1>
        <div className="flex items-center gap-2">
           <StatusIndicator status={status} />
        </div>
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-12 gap-6 pb-6">
        {/* Left Column: Group Registry & Multicast Commands (Main Actions) */}
        <div className="lg:col-span-7 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          {/* Group Registry Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <List className="w-5 h-5 text-purple-600" />
                <h2 className="font-semibold text-gray-800">Global Group Registry</h2>
              </div>
              <span className="text-xs text-gray-400 font-medium">{registeredGroups.length} groups</span>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-3">
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">ID</label>
                  <input
                    type="number"
                    value={regGroupId}
                    onChange={e => setRegGroupId(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                <div className="col-span-6">
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Name</label>
                  <input
                    type="text"
                    value={regGroupName}
                    onChange={e => setRegGroupName(e.target.value)}
                    placeholder="e.g. Living Room"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                <div className="col-span-3">
                  <button
                    onClick={() => handleAction('add_group', { group_id: parseInt(regGroupId), group_name: regGroupName })}
                    disabled={status !== 'connected' || !!loading || !regGroupId || !regGroupName}
                    className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

              {registeredGroups.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                  {registeredGroups.map(g => (
                    <div key={g.group_id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-700 font-bold text-xs">
                          {g.group_id}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{g.group_name}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setRegGroupId(String(g.group_id)); setRegGroupName(g.group_name); }}
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                          title="Edit"
                        >
                          <Plus className="w-4 h-4 rotate-45" />
                        </button>
                        <button
                          onClick={() => handleAction('remove_group', { group_id: g.group_id })}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Multicast Commands Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-green-600" />
                <h2 className="font-semibold text-gray-800">Send Multicast Command</h2>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Target Group</label>
                <div className="flex gap-2">
                  <select
                    value={cmdGroupId}
                    onChange={e => setCmdGroupId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  >
                    <option value="">Select a group to target...</option>
                    {registeredGroups.map(g => (
                      <option key={g.group_id} value={g.group_id}>{g.group_name} (ID {g.group_id})</option>
                    ))}
                    <option value="custom">Manual ID...</option>
                  </select>
                  {cmdGroupId === 'custom' && (
                    <input
                      type="number"
                      onChange={e => setCmdGroupId(e.target.value)}
                      placeholder="Group ID"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Cluster ID</label>
                  <input
                    type="number"
                    value={clusterId}
                    onChange={e => setClusterId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Command Name</label>
                  <input
                    type="text"
                    value={commandName}
                    onChange={e => setCommandName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Payload (JSON)</label>
                <textarea
                  value={payload}
                  onChange={e => setPayload(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none"
                />
              </div>

              <button
                onClick={sendGroupCmd}
                disabled={status !== 'connected' || !!loading || !cmdGroupId || cmdGroupId === 'custom'}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" /> 
                {loading === 'group_send_command' ? 'Sending...' : 'Send Multicast Command'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Membership & Advanced Config */}
        <div className="lg:col-span-5 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          {/* Node Membership Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-800">Node Membership</h2>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Target Node</label>
                  <select
                    value={nodeId}
                    onChange={e => setNodeId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Select a node...</option>
                    {nodes.map(n => (
                      <option key={n.node_id} value={n.node_id}>Node {n.node_id} {n.available ? '' : '(Offline)'}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Endpoint</label>
                    <input
                      type="number"
                      value={endpointId}
                      onChange={e => setEndpointId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Group ID</label>
                    <input
                      type="number"
                      value={groupId}
                      onChange={e => {
                        setGroupId(e.target.value);
                        const rg = registeredGroups.find(g => g.group_id === parseInt(e.target.value));
                        if (rg) setGroupName(rg.group_name);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    placeholder="Auto-registers if new"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('group_add', { node_id: parseInt(nodeId), endpoint: parseInt(endpointId), group_id: parseInt(groupId), group_name: groupName })}
                  disabled={status !== 'connected' || !!loading || !nodeId || !groupId}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  Join Group
                </button>
                <button
                  onClick={() => handleAction('group_remove', { node_id: parseInt(nodeId), endpoint: parseInt(endpointId), group_id: parseInt(groupId) })}
                  disabled={status !== 'connected' || !!loading || !nodeId || !groupId}
                  className="px-4 py-2 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-semibold hover:bg-red-100"
                >
                  Leave
                </button>
              </div>

              <button
                onClick={() => handleAction('group_get_membership', { node_id: parseInt(nodeId), endpoint: parseInt(endpointId) })}
                disabled={status !== 'connected' || !!loading || !nodeId}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200"
              >
                Refresh Memberships
              </button>

              {memberships.length > 0 && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                  <p className="text-[10px] font-bold text-blue-800 uppercase mb-2">Node {nodeId} Active Groups</p>
                  <div className="flex flex-wrap gap-1.5">
                    {memberships.map(m => (
                      <span key={m} className="px-2 py-1 bg-white border border-blue-200 rounded text-[10px] font-mono font-bold text-blue-700">
                        {m} ({registeredGroups.find(g => g.group_id === m)?.group_name || '??'})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Group Keys Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h2 className="font-semibold text-gray-800 text-sm">Real Device Config</h2>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-[10px] text-gray-500 leading-relaxed italic">
                Required for real devices (e.g. TP-Link) to secure group communication.
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Keyset</label>
                    <input
                      type="number"
                      value={keysetId}
                      onChange={e => setKeysetId(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Key (HEX)</label>
                    <input
                      type="text"
                      value={keyHex}
                      onChange={e => setKeyHex(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleAction('group_add_key_set', { node_id: parseInt(nodeId), keyset_id: parseInt(keysetId), key_hex: keyHex })}
                  disabled={status !== 'connected' || !!loading || !nodeId}
                  className="w-full py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700"
                >
                  Add Key Set
                </button>
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Bind Group</label>
                    <input
                      type="number"
                      value={bindGroupId}
                      onChange={e => setBindGroupId(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Keyset ID</label>
                    <input
                      type="number"
                      value={bindKeysetId}
                      onChange={e => setBindKeysetId(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleAction('group_bind_key_set', { node_id: parseInt(nodeId), group_id: parseInt(bindGroupId), keyset_id: parseInt(bindKeysetId) })}
                  disabled={status !== 'connected' || !!loading || !nodeId || !bindGroupId}
                  className="w-full py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-xs font-medium hover:bg-indigo-100"
                >
                  Bind Key Set
                </button>
              </div>
            </div>
          </div>

          {/* Test Data Initialization */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h2 className="text-xs font-bold text-orange-600 uppercase tracking-wider">Maintenance</h2>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Force re-initialize test group keys. Use if multicast fails consistently.
            </p>
            <button
              onClick={() => handleAction('init_group_testing_data', {})}
              disabled={status !== 'connected' || !!loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded text-[10px] font-bold hover:bg-orange-100 disabled:opacity-50"
            >
              <Database className="w-3 h-3" /> Re-init Test Data
            </button>
          </div>
        </div>
      </div>

      {/* Persistent Sticky Result Banner */}
      {result && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border ${result.success ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
            {result.success ? <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
            <div className="flex-1">
              <p className="font-bold text-sm">{result.success ? 'Success' : 'Error'}</p>
              <p className="mt-0.5 text-xs opacity-90 line-clamp-2">{result.message}</p>
            </div>
            <button 
              onClick={() => setResult(null)}
              className="p-1 hover:bg-black/5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const colors = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    disconnected: 'bg-red-500',
    reconnecting: 'bg-orange-500',
  };
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full shadow-sm">
      <div className={`w-2 h-2 rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-400'} animate-pulse`} />
      <span className="text-[10px] font-bold text-gray-600 uppercase">{status}</span>
    </div>
  );
}

