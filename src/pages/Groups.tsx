import { useState, useEffect } from 'react';
import { useWS } from '../context/WebSocketContext';
import { Users, Plus, Trash2, Send, Database, CheckCircle, AlertCircle, List, ShieldCheck, X, Bug } from 'lucide-react';
import { InfoButton } from '../components/InfoButton';
import type { Group, NodeGroupMembership, GroupDebugInfo } from '../types/matter';

const LOCAL_STORAGE_KEY = 'matter_ui_group_registry';

export function Groups() {
  const { status, sendCommand, nodes } = useWS();
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Client-side Registry Management State (Replacing server-side registry)
  const [registeredGroups, setRegisteredGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load local group registry:', e);
        return [];
      }
    }
    return [];
  });
  const [regGroupId, setRegGroupId] = useState('');
  const [regGroupName, setRegGroupName] = useState('');

  // Node Membership State
  const [nodeId, setNodeId] = useState('');
  const [endpointId, setEndpointId] = useState('1');
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [memberships, setMemberships] = useState<number[]>([]);
  const [nodeGroupDetails, setNodeGroupDetails] = useState<{group_id: number, group_name: string | null}[]>([]);
  const [remainingCapacity, setRemainingCapacity] = useState<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<GroupDebugInfo | null>(null);

  // Group Command State
  const [isCustomGroup, setIsCustomGroup] = useState(false);
  const [cmdGroupId, setCmdGroupId] = useState('');
  const [clusterId, setClusterId] = useState('6');
  const [commandName, setCommandName] = useState('On');
  const [payload, setPayload] = useState('{}');

  // Advanced Key Management State
  const [keysetId, setKeysetId] = useState('1');
  const [keyHex, setKeyHex] = useState('0102030405060708090a0b0c0d0e0f10');
  const [bindGroupId, setBindGroupId] = useState('');
  const [bindKeysetId, setBindKeysetId] = useState('1');

  // Save groups to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(registeredGroups));
  }, [registeredGroups]);

  const addLocalGroup = () => {
    const gid = parseInt(regGroupId);
    if (isNaN(gid)) return;
    
    setRegisteredGroups(prev => {
      const filtered = prev.filter(g => g.group_id !== gid);
      return [...filtered, { group_id: gid, group_name: regGroupName }].sort((a, b) => a.group_id - b.group_id);
    });
    setRegGroupId('');
    setRegGroupName('');
  };

  const removeLocalGroup = (gid: number) => {
    setRegisteredGroups(prev => prev.filter(g => g.group_id !== gid));
  };

  const handleAction = async (command: string, args: Record<string, unknown>) => {
    setLoading(command);
    setResult(null);
    try {
      const resp = await sendCommand(command, args);
      const r = resp as { result?: any; error_code?: string; details?: string };
      if (r.error_code) {
        setResult({ success: false, message: r.details || r.error_code });
      } else {
        setResult({ success: true, message: `Success: ${JSON.stringify(r.result)}` });
        
        if (command === 'group_get_membership') {
          setMemberships(r.result as number[]);
        }
        
        if (command === 'group_list') {
          const res = r.result as NodeGroupMembership;
          setNodeGroupDetails(res.groups || []);
          setRemainingCapacity(res.remaining_capacity);
          setMemberships((res.groups || []).map(g => g.group_id));
        }

        if (command === 'group_remove_all') {
          setNodeGroupDetails([]);
          setRemainingCapacity(null);
          setMemberships([]);
        }

        if (command === 'group_debug_info') {
          setDebugInfo(r.result as GroupDebugInfo);
        }
        
        // If adding a group to a node, also ensure it's in our local registry if a name was provided
        if (command === 'group_add' && args.group_id && args.group_name) {
          const gid = args.group_id as number;
          const gname = args.group_name as string;
          setRegisteredGroups(prev => {
            if (prev.some(g => g.group_id === gid)) return prev;
            return [...prev, { group_id: gid, group_name: gname }].sort((a, b) => a.group_id - b.group_id);
          });
        }
      }
    } catch (e) {
      setResult({ success: false, message: String(e) });
    } finally {
      setLoading(null);
    }
  };

  const sendGroupCmd = async (retryCount = 0) => {
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
        // Handle CHIP Error 0xAC (Internal Error - Missing Keys)
        if (String(r.error_code).includes('0xAC') || String(r.details).includes('0xAC')) {
          if (retryCount === 0) {
            setResult({ success: false, message: 'Missing group keys. Attempting to re-initialize and retry...' });
            await sendCommand('init_group_testing_data');
            return sendGroupCmd(1);
          }
          setResult({ 
            success: false, 
            message: 'Error 0xAC: The controller lacks keys for this Group ID. Use 257 or 258 for standard test keys.' 
          });
        } 
        // Handle CHIP Error 0x32 (Timeout)
        else if (String(r.error_code).includes('0x32') || String(r.details).includes('0x32')) {
          setResult({ 
            success: false, 
            message: 'Error 0x32: Timeout. Operational discovery failed. Ensure nodes are powered on and reachable.' 
          });
        }
        else {
          setResult({ success: false, message: r.details || r.error_code });
        }
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
                <h2 className="font-semibold text-gray-800">Local Group Registry</h2>
              </div>
              <span className="text-xs text-gray-400 font-medium">{registeredGroups.length} groups</span>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-[11px] text-purple-800 leading-relaxed">
                <strong>Note:</strong> Matter manages groups on the <strong>devices</strong>. The server does not
                maintain a registry. This list is stored <strong>locally in your browser</strong> to help you
                remember your Group IDs and names.
              </div>

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
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Name (Max 16 chars)</label>
                  <input
                    type="text"
                    value={regGroupName}
                    maxLength={16}
                    onChange={e => setRegGroupName(e.target.value)}
                    placeholder="e.g. Living Room"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                <div className="col-span-3">
                  <button
                    onClick={addLocalGroup}
                    disabled={!regGroupId || !regGroupName}
                    className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                  >
                    Save
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
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded cursor-pointer"
                          title="Edit"
                        >
                          <Plus className="w-4 h-4 rotate-45" />
                        </button>
                        <button
                          onClick={() => removeLocalGroup(g.group_id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
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
              <InfoButton
                title="Matter Multicast"
                description="Groups let you control multiple devices with a single multicast frame. Sending a command to a group takes one call regardless of how many devices are in it. Setup is a one-time operation per device."
                code={`{
  "command": "group_send_command",
  "args": {
    "group_id": 100,
    "cluster_id": 6,
    "command_name": "Off",
    "payload": {}
  }
}`}
              />
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-[11px] text-amber-800">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3" />
                  Development Tip:
                </p>
                Standard test keys typically support Group IDs <strong>257</strong> (0x0101) and <strong>258</strong> (0x0102). 
                Using other IDs may cause 0xAC errors unless keys are manually configured below.
              </div>

              <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-[11px] text-green-800 leading-relaxed italic">
                Multicast is <strong>fire-and-forget</strong>. Devices do not send acknowledgments back to the controller.
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Target Group</label>
                <div className="flex gap-2">
                  <select
                    value={isCustomGroup ? 'custom' : cmdGroupId}
                    onChange={e => {
                      if (e.target.value === 'custom') {
                        setIsCustomGroup(true);
                        setCmdGroupId('');
                      } else {
                        setIsCustomGroup(false);
                        setCmdGroupId(e.target.value);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  >
                    <option value="">Select a group to target...</option>
                    {registeredGroups.map(g => (
                      <option key={g.group_id} value={g.group_id}>{g.group_name} (ID {g.group_id})</option>
                    ))}
                    <option value="custom">Manual ID...</option>
                  </select>
                  {isCustomGroup && (
                    <input
                      type="number"
                      value={cmdGroupId}
                      onChange={e => setCmdGroupId(e.target.value)}
                      placeholder="Group ID"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
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
                onClick={() => sendGroupCmd()}
                disabled={status !== 'connected' || !!loading || !cmdGroupId}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
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
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-800">Node Membership</h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAction('group_debug_info', { node_id: parseInt(nodeId) })}
                  disabled={!nodeId || !!loading}
                  title="Group Debug Info"
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer disabled:opacity-30"
                >
                  <Bug className="w-4 h-4" />
                </button>
                <InfoButton
                  title="Group Membership Flow"
                  description="Group membership is stored on each device endpoint. To join a group, you must: 1. Install keys on device, 2. Map group to keyset, 3. Add device to group, 4. Configure Group ACL."
                  code={`{
  "command": "group_add",
  "args": {
    "node_id": 1,
    "endpoint": 1,
    "group_id": 100,
    "group_name": "Living Room"
  }
}`}
                />
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Target Node</label>
                  <select
                    value={nodeId}
                    onChange={e => {
                      setNodeId(e.target.value);
                      setDebugInfo(null);
                    }}
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
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1 text-blue-600">Group Name (Required - Max 16 chars)</label>
                  <input
                    type="text"
                    value={groupName}
                    maxLength={16}
                    onChange={e => setGroupName(e.target.value)}
                    placeholder="Saved to device"
                    className="w-full px-3 py-2 border border-blue-200 bg-blue-50/20 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-[10px] text-blue-800 leading-relaxed italic">
                <strong>Smart Provisioning:</strong> <code>Join Group</code> automatically handles encryption keys and 
                group slots. If the device's group table is full, the **oldest group is automatically removed (FIFO)**
                to free a slot. Keyset reuse is handled transparently.
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('group_add', { node_id: parseInt(nodeId), endpoint: parseInt(endpointId), group_id: parseInt(groupId), group_name: groupName })}
                  disabled={status !== 'connected' || !!loading || !nodeId || !groupId || !groupName}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  Join Group
                </button>
                <button
                  onClick={() => handleAction('group_remove', { node_id: parseInt(nodeId), endpoint: parseInt(endpointId), group_id: parseInt(groupId) })}
                  disabled={status !== 'connected' || !!loading || !nodeId || !groupId}
                  className="px-4 py-2 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-semibold hover:bg-red-100 cursor-pointer"
                >
                  Leave
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAction('group_list', { node_id: parseInt(nodeId), endpoint: parseInt(endpointId) })}
                  disabled={status !== 'connected' || !!loading || !nodeId}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 cursor-pointer"
                >
                  Refresh Memberships
                </button>
                <button
                  onClick={() => {
                    if (confirm('Nuclear Option: Are you sure you want to remove ALL groups from this endpoint?')) {
                      handleAction('group_remove_all', { node_id: parseInt(nodeId), endpoint: parseInt(endpointId) });
                    }
                  }}
                  disabled={status !== 'connected' || !!loading || !nodeId}
                  className="px-4 py-2 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-semibold hover:bg-red-100 cursor-pointer"
                >
                  Remove All
                </button>
              </div>

              {remainingCapacity !== null && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Remaining Capacity</span>
                  <span className={`text-xs font-mono font-bold ${remainingCapacity === 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {remainingCapacity} slots
                  </span>
                </div>
              )}

              {(memberships.length > 0 || nodeGroupDetails.length > 0) && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                  <p className="text-[10px] font-bold text-blue-800 uppercase mb-2 flex justify-between items-center">
                    <span>Node {nodeId} Active Groups</span>
                    <span className="text-blue-400 font-normal">Stored on device</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {nodeGroupDetails.length > 0 ? (
                      nodeGroupDetails.map(g => (
                        <span key={g.group_id} className="px-2 py-1 bg-white border border-blue-200 rounded text-[10px] font-mono font-bold text-blue-700">
                          {g.group_id} ({g.group_name || registeredGroups.find(rg => rg.group_id === g.group_id)?.group_name || '??'})
                        </span>
                      ))
                    ) : (
                      memberships.map(m => (
                        <span key={m} className="px-2 py-1 bg-white border border-blue-200 rounded text-[10px] font-mono font-bold text-blue-700">
                          {m} ({registeredGroups.find(g => g.group_id === m)?.group_name || '??'})
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}

              {debugInfo && (
                <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-700 overflow-x-auto">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Group Debug Info (Node {debugInfo.node_id})</p>
                    <button onClick={() => setDebugInfo(null)} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
                  </div>
                  <pre className="text-[9px] font-mono text-gray-300 whitespace-pre-wrap leading-tight">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Advanced / Manual Key Management Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-orange-100">
            <div className="px-6 py-4 border-b border-orange-100 bg-orange-50/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
                <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-tight">Advanced / Manual Key Management</h2>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-[10px] text-orange-800 leading-relaxed">
                <strong>Warning:</strong> These tools are for advanced use only. 
                <code>Join Group</code> already handles these steps automatically for standard cases.
                Use these only if you need to manually override keys or bindings.
              </div>

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
                  className="flex-1 py-1.5 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700 cursor-pointer"
                >
                  Force Add Keyset
                </button>
                <button
                  onClick={() => handleAction('group_key_set_remove', { node_id: parseInt(nodeId), keyset_id: parseInt(keysetId) })}
                  disabled={status !== 'connected' || !!loading || !nodeId || keysetId === '0'}
                  className="flex-1 py-1.5 bg-red-50 text-red-700 border border-red-100 rounded text-xs font-medium hover:bg-red-100 cursor-pointer"
                >
                  Force Remove
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
                  className="w-full py-1.5 bg-orange-50 text-orange-700 border border-orange-100 rounded text-xs font-medium hover:bg-orange-100 cursor-pointer"
                >
                  Force Bind Key Set
                </button>
              </div>
            </div>
          </div>

          {/* Test Data Initialization */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 border-orange-100">
            <h2 className="text-xs font-bold text-orange-600 uppercase tracking-wider">Maintenance</h2>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Force operations to recover devices from inconsistent group states.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAction('init_group_testing_data', {})}
                disabled={status !== 'connected' || !!loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded text-[10px] font-bold hover:bg-orange-100 disabled:opacity-50 cursor-pointer border border-orange-100"
              >
                <Database className="w-3 h-3" /> Re-init Test Data
              </button>
              <button
                onClick={() => {
                  if (confirm('NUCLEAR OPTION: This will brute-force remove ALL keysets (1-63) and clear all group tracking for this node. Fabric remains intact. Continue?')) {
                    handleAction('group_reset_node', { node_id: parseInt(nodeId) });
                  }
                }}
                disabled={status !== 'connected' || !!loading || !nodeId}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded text-[10px] font-bold hover:bg-red-100 disabled:opacity-50 cursor-pointer border border-red-100"
              >
                <Trash2 className="w-3 h-3" /> Full Node Reset
              </button>
            </div>
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
              className="p-1 hover:bg-black/5 rounded transition-colors cursor-pointer"
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
