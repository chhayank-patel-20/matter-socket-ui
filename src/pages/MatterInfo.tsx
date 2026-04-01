import { useState } from 'react';
import { useWS } from '../context/WebSocketContext';
import { Server, Activity, Database, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

const CLUSTERS = [
  { id: '0x0006 (6)', name: 'OnOff', description: 'Switch devices on/off', ui: 'Toggle switch' },
  { id: '0x0008 (8)', name: 'LevelControl', description: 'Brightness / level control', ui: 'Slider' },
  { id: '0x001D (29)', name: 'Descriptor', description: 'Device capabilities and composition', ui: 'Read-only' },
  { id: '0x0028 (40)', name: 'BasicInformation', description: 'Device metadata (vendor, model, etc.)', ui: 'Read-only' },
  { id: '0x0030 (48)', name: 'GeneralCommissioning', description: 'Commissioning process management', ui: 'Internal' },
  { id: '0x0031 (49)', name: 'NetworkCommissioning', description: 'Network setup (Wi-Fi, Thread)', ui: 'Internal' },
  { id: '0x003E (62)', name: 'OperationalCredentials', description: 'Fabric and NOC management', ui: 'Internal' },
  { id: '0x0300 (768)', name: 'ColorControl', description: 'RGB / color temperature control', ui: 'Color picker' },
  { id: '0x0400 (1024)', name: 'IlluminanceMeasurement', description: 'Ambient light sensing', ui: 'Gauge' },
  { id: '0x0402 (1026)', name: 'TemperatureMeasurement', description: 'Temperature sensing', ui: 'Gauge' },
  { id: '0x0405 (1030)', name: 'RelativeHumidityMeasurement', description: 'Humidity sensing', ui: 'Gauge' },
  { id: '0x0406 (1280)', name: 'OccupancySensing', description: 'Presence / occupancy detection', ui: 'Indicator' },
];

const COMMANDS = [
  { cluster: 'OnOff (6)', command: 'On', description: 'Turn device ON' },
  { cluster: 'OnOff (6)', command: 'Off', description: 'Turn device OFF' },
  { cluster: 'OnOff (6)', command: 'Toggle', description: 'Toggle ON/OFF state' },
  { cluster: 'LevelControl (8)', command: 'MoveToLevel', description: 'Set brightness to a specific level (0–254)' },
  { cluster: 'LevelControl (8)', command: 'Move', description: 'Continuously change brightness up or down' },
  { cluster: 'LevelControl (8)', command: 'Step', description: 'Step brightness by a fixed amount' },
  { cluster: 'LevelControl (8)', command: 'Stop', description: 'Stop any ongoing level movement' },
  { cluster: 'ColorControl (768)', command: 'MoveToHue', description: 'Set hue value (0–254)' },
  { cluster: 'ColorControl (768)', command: 'MoveToSaturation', description: 'Set saturation value (0–254)' },
  { cluster: 'ColorControl (768)', command: 'MoveToColor', description: 'Set XY color coordinates' },
  { cluster: 'ColorControl (768)', command: 'MoveToColorTemperature', description: 'Set color temperature in mireds' },
];

const WS_COMMANDS = [
  {
    cmd: 'server_info',
    desc: 'Get server version and status. Pushed immediately on connect.',
    args: [],
    response: {
      fabric_id: 1,
      compressed_fabric_id: 3735928559,
      schema_version: 6,
      sdk_version: "1.0.0",
      wifi_credentials_set: true,
      bluetooth_enabled: true
    }
  },
  {
    cmd: 'diagnostics',
    desc: 'Full server dump for debugging (info, nodes, events).',
    args: [],
    response: { info: {}, nodes: [], events: [] }
  },
  {
    cmd: 'get_vendor_names',
    desc: 'Resolve vendor IDs to vendor names from CSA database.',
    args: [
      { name: 'filter_vendors', type: 'list[int]', req: false, def: '[]', desc: 'Limit lookup' }
    ],
    response: { "4937": "TP-Link" }
  },
  {
    cmd: 'scan_ble_devices',
    desc: 'Scan for nearby BLE devices (Matter and non-Matter).',
    args: [
      { name: 'mac_address', type: 'str', req: false, def: '', desc: 'Filter by MAC' },
      { name: 'timeout', type: 'float', req: false, def: '10.0', desc: 'Scan duration' }
    ],
    response: [
      {
        address: "50:3D:D1:C0:5B:AB",
        name: "Matter Device",
        rssi: -65,
        is_matter: true,
        matter_discriminator: 3840
      }
    ]
  },
  {
    cmd: 'set_wifi_credentials',
    desc: 'Set WiFi credentials used for upcoming commissioning.',
    args: [
      { name: 'ssid', type: 'str', req: true, def: '', desc: 'Network SSID' },
      { name: 'credentials', type: 'str', req: true, def: '', desc: 'Password' }
    ],
    response: null
  },
  {
    cmd: 'set_thread_dataset',
    desc: 'Set Thread operational dataset for commissioning.',
    args: [
      { name: 'dataset', type: 'str', req: true, def: '', desc: 'Hex dataset string' }
    ],
    response: null
  },
  {
    cmd: 'commission_with_code',
    desc: 'Commission a device using a QR or manual pairing code.',
    args: [
      { name: 'code', type: 'str', req: true, def: '', desc: 'QR (MT:...) or 11-digit code' },
      { name: 'fabric_label', type: 'str', req: false, def: '', desc: 'Optional label for the fabric' }
    ],
    response: { node_id: 5, available: true, attributes: { "...": "..." } }
  },
  {
    cmd: 'commission_with_mac',
    desc: 'Commission a device by BLE MAC address and PIN code.',
    args: [
      { name: 'mac_address', type: 'str', req: true, def: '', desc: 'BLE MAC address' },
      { name: 'setup_pin_code', type: 'int', req: true, def: '', desc: '8-digit PIN' },
      { name: 'scan_timeout', type: 'float', req: false, def: '10.0', desc: 'BLE scan duration' }
    ],
    response: { node_id: 6, available: true, attributes: { "...": "..." } }
  },
  {
    cmd: 'commission_on_network',
    desc: 'Commission a device already present on the network.',
    args: [
      { name: 'setup_pin_code', type: 'int', req: true, def: '', desc: '8-digit PIN' },
      { name: 'filter_type', type: 'int', req: false, def: '0', desc: '0=None, 2=Long Discriminator' },
      { name: 'filter', type: 'any', req: false, def: '', desc: 'Filter value matching type' }
    ],
    response: { node_id: 7, available: true }
  },
  {
    cmd: 'discover_commissionable_nodes',
    desc: 'List currently discovered nodes waiting for commissioning.',
    args: [],
    response: [{ instance_name: "...", addresses: ["192.168.1.42"] }]
  },
  {
    cmd: 'open_commissioning_window',
    desc: 'Open window for multi-fabric commissioning.',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' },
      { name: 'timeout', type: 'int', req: false, def: '300', desc: 'Seconds to stay open' },
      { name: 'iteration', type: 'int', req: false, def: '1000', desc: 'PBKDF2 iteration count' }
    ],
    response: { setup_pin_code: 12345678, setup_qr_code: "MT:...", discriminator: 3840 }
  },
  {
    cmd: 'get_nodes',
    desc: 'Get all commissioned nodes currently in the fabric.',
    args: [],
    response: [{ node_id: 1, available: true }]
  },
  {
    cmd: 'get_node',
    desc: 'Get full data for a single commissioned node.',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' }
    ],
    response: { node_id: 1, available: true, attributes: {} }
  },
  {
    cmd: 'remove_node',
    desc: 'Permanently remove a node from the fabric.',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' }
    ],
    response: null
  },
  {
    cmd: 'device_command',
    desc: 'Send a cluster command to a node endpoint.',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' },
      { name: 'endpoint_id', type: 'int', req: true, def: '', desc: 'Endpoint' },
      { name: 'cluster_id', type: 'int', req: true, def: '', desc: 'Cluster (e.g. 6)' },
      { name: 'command_name', type: 'str', req: true, def: '', desc: 'Name (e.g. "On")' },
      { name: 'payload', type: 'obj', req: true, def: '', desc: 'Arguments (use {} for none)' }
    ],
    response: null
  },
  {
    cmd: 'read_attribute',
    desc: 'Read an attribute value (Endpoint/Cluster/Attr).',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' },
      { name: 'attribute_path', type: 'str', req: true, def: '', desc: 'Format: "1/6/0"' }
    ],
    response: true
  },
  {
    cmd: 'write_attribute',
    desc: 'Write a value to a node attribute.',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' },
      { name: 'attribute_path', type: 'str', req: true, def: '', desc: 'Format: "1/6/16385"' },
      { name: 'value', type: 'any', req: true, def: '', desc: 'New value' }
    ],
    response: null
  },
  {
    cmd: 'group_send_command',
    desc: 'Send multicast command to a group ID (fire-and-forget).',
    args: [
      { name: 'group_id', type: 'int', req: true, def: '', desc: 'Target group (1-65527)' },
      { name: 'cluster_id', type: 'int', req: true, def: '', desc: 'Cluster' },
      { name: 'command_name', type: 'str', req: true, def: '', desc: 'Name' },
      { name: 'payload', type: 'obj', req: true, def: '', desc: 'Arguments' }
    ],
    response: null
  },
  {
    cmd: 'group_add',
    desc: 'Add node to group. Uses smart provisioning: automatically manages keysets and reuses slots. If device table is full, automatically removes oldest group (FIFO).',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' },
      { name: 'endpoint', type: 'int', req: true, def: '', desc: 'Endpoint' },
      { name: 'group_id', type: 'int', req: true, def: '', desc: 'Group ID' },
      { name: 'group_name', type: 'str', req: true, def: '', desc: 'Name (max 16 chars)' }
    ],
    response: null
  },
  {
    cmd: 'group_remove',
    desc: 'Remove a node endpoint from a group. Triggers keyset cleanup.',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' },
      { name: 'endpoint', type: 'int', req: true, def: '', desc: 'Endpoint' },
      { name: 'group_id', type: 'int', req: true, def: '', desc: 'Group ID' }
    ],
    response: null
  },
  {
    cmd: 'group_list',
    desc: 'List all groups on an endpoint with names and remaining capacity (fetched from device).',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' },
      { name: 'endpoint', type: 'int', req: true, def: '', desc: 'Endpoint' }
    ],
    response: { node_id: 1, endpoint: 1, remaining_capacity: 2, groups: [{ group_id: 100, group_name: "Test" }] }
  },
  {
    cmd: 'group_remove_all',
    desc: 'NUCLEAR OPTION: Remove all groups and reclaim all keyset slots (3-tier cleanup).',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' },
      { name: 'endpoint', type: 'int', req: true, def: '', desc: 'Endpoint' }
    ],
    response: null
  },
  {
    cmd: 'group_key_set_remove',
    desc: 'Advanced: Remove a specific keyset from a node by ID.',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' },
      { name: 'keyset_id', type: 'int', req: true, def: '', desc: 'Keyset ID to remove' }
    ],
    response: null
  },
  {
    cmd: 'group_reset_node',
    desc: 'Nuclear: Full group state reset on a node without removing the fabric.',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' }
    ],
    response: null
  },
  {
    cmd: 'group_get_membership',
    desc: 'Query which groups an endpoint belongs to (live data).',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' },
      { name: 'endpoint', type: 'int', req: true, def: '', desc: 'Endpoint' }
    ],
    response: [100, 200]
  },
  {
    cmd: 'group_debug_info',
    desc: 'Raw group key state dump for a node. Useful for diagnosing groupcast failures.',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' }
    ],
    response: { group_key_map: [], controller_tracked_keysets: [] }
  },
  {
    cmd: 'group_add_key_set',
    desc: 'ADVANCED: Manually install a group key set. (group_add handles this automatically).',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' },
      { name: 'keyset_id', type: 'int', req: true, def: '', desc: 'Keyset ID' },
      { name: 'key_hex', type: 'str', req: false, def: '0102...0f10', desc: '16-byte hex key' }
    ],
    response: null
  },
  {
    cmd: 'group_bind_key_set',
    desc: 'ADVANCED: Manually bind group to keyset. (group_add handles this automatically).',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' },
      { name: 'group_id', type: 'int', req: true, def: '', desc: 'Group ID' },
      { name: 'keyset_id', type: 'int', req: true, def: '', desc: 'Keyset ID' }
    ],
    response: null
  },
  {
    cmd: 'check_node_update',
    desc: 'Check if a firmware update is available for a node.',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' }
    ],
    response: { software_version: 2, software_version_string: "2.0.0" }
  },
  {
    cmd: 'update_node',
    desc: 'Start an OTA firmware update on a node.',
    args: [
      { name: 'node_id', type: 'int', req: true, def: '', desc: 'Target node' },
      { name: 'software_version', type: 'int', req: true, def: '', desc: 'Target version' }
    ],
    response: null
  }
];

export function MatterInfo() {
  const { status, sendCommand } = useWS();
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<unknown | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleServerCommand = async (command: string) => {
    setLoading(command);
    setResult(null);
    setShowResult(true);
    try {
      const resp = await sendCommand(command);
      const r = resp as { result?: unknown; error_code?: string; details?: string };
      if (r.error_code) {
        setResult({ error: r.details || r.error_code });
      } else {
        setResult(r.result);
      }
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <h1 className="text-2xl font-bold text-gray-900">Matter Reference</h1>

      {/* Server Operations */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">Server Operations</h2>
        </div>
        <p className="text-sm text-gray-600">
          Interact with the Matter Server instance itself. These commands provide global information and diagnostics.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleServerCommand('server_info')}
            disabled={status !== 'connected' || !!loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
          >
            <Database className="w-4 h-4" /> Get Server Info
          </button>
          <button
            onClick={() => handleServerCommand('diagnostics')}
            disabled={status !== 'connected' || !!loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
          >
            <Activity className="w-4 h-4" /> Run Diagnostics
          </button>
          <button
            onClick={() => handleServerCommand('get_vendor_names')}
            disabled={status !== 'connected' || !!loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Get Vendor Names
          </button>
        </div>

        {showResult && (
          <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 cursor-pointer"
              onClick={() => setShowResult(!showResult)}
            >
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Command Result</span>
              {showResult ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
            {showResult && (
              <div className="p-4 bg-gray-900 overflow-x-auto min-h-[100px]">
                {loading ? (
                  <p className="text-xs text-blue-400 animate-pulse">Running {loading}...</p>
                ) : result ? (
                  <pre className="text-xs font-mono text-gray-300">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                ) : (
                  <p className="text-xs text-gray-500 italic">No data yet. Click a button above.</p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Data Model */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Matter Data Model</h2>
        <p className="text-sm text-gray-600">
          Matter devices are organised in a strict hierarchy. The UI communicates only with the controller
          — never directly with devices.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-700 leading-6">
          <div>Node (physical device)</div>
          <div className="ml-4">└ Endpoint (logical function)</div>
          <div className="ml-8">└ Cluster (feature group)</div>
          <div className="ml-12">├ Attribute (state / data)</div>
          <div className="ml-12">├ Command (action)</div>
          <div className="ml-12">└ Event (notification)</div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {[
            { term: 'Node', def: 'A physical Matter device on the fabric. Has a unique Node ID assigned at commissioning.' },
            { term: 'Endpoint', def: 'A logical unit inside a node. Endpoint 0 is always the Root Node. A multi-socket plug has one endpoint per socket.' },
            { term: 'Cluster', def: 'A group of related attributes, commands, and events (e.g. OnOff, LevelControl). Identified by a 16-bit Cluster ID.' },
            { term: 'Attribute', def: 'A state variable inside a cluster. E.g. OnOff cluster, attribute 0 = current on/off state.' },
            { term: 'Command', def: 'An action that can be sent to a cluster. E.g. sending "On" to the OnOff cluster.' },
            { term: 'Event', def: 'A timestamped notification pushed by the device when something happens.' },
          ].map(({ term, def }) => (
            <div key={term} className="border border-gray-100 rounded-lg p-3">
              <p className="font-semibold text-gray-800">{term}</p>
              <p className="text-gray-500 text-xs mt-1">{def}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Attribute Key Format */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Attribute Key Format</h2>
        <p className="text-sm text-gray-600">
          Attributes returned by <code className="bg-gray-100 px-1 rounded">get_node</code> follow the pattern:
        </p>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-700">
          <p><span className="text-blue-600">endpoint</span> / <span className="text-green-600">cluster</span> / <span className="text-purple-600">attribute</span></p>
          <p className="mt-2 text-gray-500">Example:</p>
          <p>"<span className="text-blue-600">1</span>/<span className="text-green-600">6</span>/<span className="text-purple-600">0</span>": true</p>
          <p className="text-gray-500 text-xs mt-1">→ Endpoint 1, Cluster OnOff (6), Attribute OnOff (0) = true (device is ON)</p>
        </div>
      </section>

      {/* Cluster Reference */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Important Clusters</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="pb-2 pr-4 font-medium">Cluster ID</th>
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Description</th>
                <th className="pb-2 font-medium">UI Control</th>
              </tr>
            </thead>
            <tbody>
              {CLUSTERS.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-mono text-xs text-blue-600">{c.id}</td>
                  <td className="py-2 pr-4 font-medium text-gray-800">{c.name}</td>
                  <td className="py-2 pr-4 text-gray-500 text-xs">{c.description}</td>
                  <td className="py-2 text-xs text-gray-500">{c.ui}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Commands Reference */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Common Commands</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="pb-2 pr-4 font-medium">Cluster</th>
                <th className="pb-2 pr-4 font-medium">Command</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {COMMANDS.map((c, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4 text-gray-700">{c.cluster}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-green-700">{c.command}</td>
                  <td className="py-2 text-gray-500 text-xs">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* WebSocket API */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-800">WebSocket API Reference</h2>
          <p className="text-xs text-gray-500 mt-1">Full specification for python-matter-server communication</p>
        </div>

        <div className="divide-y divide-gray-100">
          {WS_COMMANDS.map(c => (
            <div key={c.cmd} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <code className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded text-sm">
                  {c.cmd}
                </code>
                <span className="text-xs text-gray-400 italic">{c.desc}</span>
              </div>

              {c.args.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Arguments</p>
                  <div className="overflow-x-auto border border-gray-100 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Name</th>
                          <th className="px-3 py-2 font-semibold">Type</th>
                          <th className="px-3 py-2 font-semibold">Req.</th>
                          <th className="px-3 py-2 font-semibold">Default</th>
                          <th className="px-3 py-2 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {c.args.map(arg => (
                          <tr key={arg.name}>
                            <td className="px-3 py-2 font-mono font-bold text-gray-700">{arg.name}</td>
                            <td className="px-3 py-2 text-gray-500">{arg.type}</td>
                            <td className="px-3 py-2">
                              {arg.req ? (
                                <span className="text-red-500 font-bold">Yes</span>
                              ) : (
                                <span className="text-gray-400">No</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-400 font-mono">{arg.def || '—'}</td>
                            <td className="px-3 py-2 text-gray-600">{arg.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Request Shape</p>
                  <pre className="bg-gray-900 text-gray-300 p-3 rounded-lg text-[10px] font-mono leading-relaxed">
                    {JSON.stringify({
                      message_id: "123",
                      command: c.cmd,
                      args: c.args.reduce((acc, a) => ({ ...acc, [a.name]: a.type }), {})
                    }, null, 2)}
                  </pre>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Example Response</p>
                  <pre className="bg-gray-800 text-green-400 p-3 rounded-lg text-[10px] font-mono leading-relaxed border border-gray-700">
                    {JSON.stringify({
                      message_id: "123",
                      result: c.response
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Common Paths Reference */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Common Attribute Paths</h2>
        <p className="text-sm text-gray-600">Use these with <code className="bg-gray-100 px-1 rounded">read_attribute</code> or <code className="bg-gray-100 px-1 rounded">write_attribute</code>.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { path: '1/6/0', label: 'OnOff State', desc: 'Boolean: true = On, false = Off' },
            { path: '1/8/0', label: 'Current Level', desc: '0-254 brightness level' },
            { path: '1/768/7', label: 'Color Temp', desc: 'Mireds: 153 (6500K) to 500 (2000K)' },
            { path: '0/40/3', label: 'Vendor Name', desc: 'Basic device information' },
            { path: '0/40/4', label: 'Product ID', desc: 'Basic device information' },
            { path: '0/40/5', label: 'Node Label', desc: 'Human-readable name stored on node' },
          ].map(p => (
            <div key={p.path} className="p-3 border border-gray-100 rounded-lg bg-gray-50/30">
              <code className="text-xs font-bold text-blue-700 block mb-1">{p.path}</code>
              <p className="text-xs font-semibold text-gray-800">{p.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
