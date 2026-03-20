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
  { cmd: 'get_nodes', desc: 'Get all commissioned nodes', args: '(none)' },
  { cmd: 'get_node', desc: 'Get a specific node by ID', args: '{ node_id: number }' },
  { cmd: 'discover', desc: 'Discover devices available for commissioning', args: '(none)' },
  { cmd: 'commission_with_code', desc: 'Commission using setup code/QR', args: '{ code: string }' },
  { cmd: 'commission_on_network', desc: 'Commission device already on network', args: '{ setup_pin_code: number, discriminator: number }' },
  { cmd: 'device_command', desc: 'Send a cluster command to a device', args: '{ node_id, endpoint_id, cluster_id, command_name }' },
  { cmd: 'read_attribute', desc: 'Read a specific attribute value', args: '{ node_id, endpoint, cluster, attribute }' },
  { cmd: 'subscribe_attribute', desc: 'Subscribe to live attribute updates', args: '{ node_id, endpoint_id, cluster_id, attribute_id }' },
];

export function MatterInfo() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Matter Reference</h1>

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
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">WebSocket API (python-matter-server)</h2>
        <p className="text-sm text-gray-600">Default endpoint: <code className="bg-gray-100 px-1 rounded font-mono">ws://localhost:5580/ws</code></p>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-gray-700 space-y-0.5">
          <p className="text-gray-400">// Request format</p>
          <p>{'{'}</p>
          <p className="ml-4">"message_id": "1",</p>
          <p className="ml-4">"command": "command_name",</p>
          <p className="ml-4">"args": {'{ ... }'}</p>
          <p>{'}'}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="pb-2 pr-4 font-medium">Command</th>
                <th className="pb-2 pr-4 font-medium">Description</th>
                <th className="pb-2 font-medium">Args</th>
              </tr>
            </thead>
            <tbody>
              {WS_COMMANDS.map(c => (
                <tr key={c.cmd} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-mono text-xs text-blue-600">{c.cmd}</td>
                  <td className="py-2 pr-4 text-gray-700 text-xs">{c.desc}</td>
                  <td className="py-2 font-mono text-xs text-gray-500">{c.args}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
