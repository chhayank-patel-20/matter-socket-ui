# Matter Controller WebSocket API

Reference for the WebSocket JSON-RPC API exposed by [python-matter-server](https://github.com/home-assistant-libs/python-matter-server).

---

## Connection

**Default endpoint:** `ws://localhost:5580/ws`

The UI connects using the native browser `WebSocket` API. All messages are JSON.

---

## Message Format

### Request (Client → Server)

```json
{
  "message_id": "1",
  "command": "command_name",
  "args": {}
}
```

| Field        | Type   | Description                                      |
|--------------|--------|--------------------------------------------------|
| `message_id` | string | Unique ID for matching responses to requests     |
| `command`    | string | The command name to execute                      |
| `args`       | object | Command-specific arguments (may be omitted)      |

### Response (Server → Client)

```json
{
  "message_id": "1",
  "result": <any>,
  "error_code": "optional_error",
  "details": "optional human-readable error detail"
}
```

### Server-pushed Events

The server pushes events without a request. These have no `message_id`.

```json
{
  "event": "event_name",
  "data": <any>
}
```

---

## Commands

### `start_listening`

Subscribe to server-pushed events. Must be called once after connecting to receive real-time updates (attribute changes, node state changes, etc.).

**Request:**
```json
{
  "message_id": "1",
  "command": "start_listening"
}
```

**Response:** Returns current server state snapshot.

---

### `get_nodes`

Get all commissioned nodes known to the controller.

**Request:**
```json
{
  "message_id": "2",
  "command": "get_nodes"
}
```

**Response `result`:** Array of `MatterNode` objects.

```json
[
  {
    "node_id": 16,
    "available": true,
    "date_commissioned": "2024-01-01T00:00:00Z",
    "last_interview": "2024-01-01T00:01:00Z",
    "interview_version": 1,
    "is_controllable": true,
    "attributes": {
      "0/40/1": "VendorName",
      "1/6/0": true
    }
  }
]
```

---

### `get_node`

Get a single commissioned node by its ID, including full attribute map.

**Request:**
```json
{
  "message_id": "3",
  "command": "get_node",
  "args": {
    "node_id": 16
  }
}
```

**Response `result`:** Single `MatterNode` object (see `get_nodes` shape).

---

### `discover`

Discover Matter devices that are available for commissioning (in commissioning mode).

**Request:**
```json
{
  "message_id": "4",
  "command": "discover"
}
```

**Response `result`:** Array of discovered device objects.

```json
[
  {
    "name": "Tapo Outlet",
    "vendor_id": 0x1234,
    "product_id": 0x5678,
    "discriminator": 1024,
    "addresses": ["192.168.1.148"],
    "commissioning_mode": 1
  }
]
```

---

### `commission_with_code`

Commission a device using a Matter setup code (numeric 11-digit code or QR code string starting with `MT:`).

**Request:**
```json
{
  "message_id": "5",
  "command": "commission_with_code",
  "args": {
    "code": "MT:XXXXXXXXXXXXXXX"
  }
}
```

**Response `result`:** Assigned `node_id` (integer).

---

### `commission_on_network`

Commission a device that is already on the same network using its PIN code and discriminator.

**Request:**
```json
{
  "message_id": "6",
  "command": "commission_on_network",
  "args": {
    "setup_pin_code": 12345678,
    "discriminator": 1024
  }
}
```

**Response `result`:** Assigned `node_id` (integer).

---

### `device_command`

Send a cluster command to a commissioned device.

**Request:**
```json
{
  "message_id": "7",
  "command": "device_command",
  "args": {
    "node_id": 16,
    "endpoint_id": 1,
    "cluster_id": 6,
    "command_name": "On",
    "payload": {}
  }
}
```

| Field          | Type    | Description                                      |
|----------------|---------|--------------------------------------------------|
| `node_id`      | integer | Target node ID                                   |
| `endpoint_id`  | integer | Target endpoint (usually `1` for main function)  |
| `cluster_id`   | integer | Cluster ID (e.g. `6` for OnOff)                  |
| `command_name` | string  | Command name (e.g. `"On"`, `"Off"`, `"Toggle"`)  |
| `payload`      | object  | Command payload arguments (use `{}` if none)     |

**Example — Turn off a device:**
```json
{
  "message_id": "8",
  "command": "device_command",
  "args": {
    "node_id": 16,
    "endpoint_id": 1,
    "cluster_id": 6,
    "command_name": "Off",
    "payload": {}
  }
}
```

**Example — Set brightness to 50%:**
```json
{
  "message_id": "9",
  "command": "device_command",
  "args": {
    "node_id": 16,
    "endpoint_id": 1,
    "cluster_id": 8,
    "command_name": "MoveToLevel",
    "payload": {
      "level": 127,
      "transition_time": 10
    }
  }
}
```

---

### `read_attribute`

Read the current value of a specific attribute from a device.

**Request:**
```json
{
  "message_id": "10",
  "command": "read_attribute",
  "args": {
    "node_id": 16,
    "endpoint": 1,
    "cluster": "OnOff",
    "attribute": "OnOff"
  }
}
```

**Response `result`:** The attribute value (boolean, integer, string, etc.).

---

### `subscribe_attribute`

Subscribe to live updates for a specific attribute. The server will push an event whenever the value changes.

**Request:**
```json
{
  "message_id": "11",
  "command": "subscribe_attribute",
  "args": {
    "node_id": 16,
    "endpoint_id": 1,
    "cluster_id": 6,
    "attribute_id": 0
  }
}
```

After subscribing, the server pushes events in the form:
```json
{
  "event": "attribute_updated",
  "data": {
    "node_id": 16,
    "endpoint_id": 1,
    "cluster_id": 6,
    "attribute_id": 0,
    "value": true
  }
}
```

---

## Attribute Key Format

Attributes returned by `get_node` use a slash-separated key format:

```
"<endpoint_id>/<cluster_id>/<attribute_id>": <value>
```

**Example:**
```json
{
  "1/6/0": true,
  "0/40/1": "ACME Corp",
  "0/40/4": "Smart Plug v1"
}
```

| Part          | Example | Meaning                         |
|---------------|---------|---------------------------------|
| `endpoint_id` | `1`     | Endpoint 1 (main device function) |
| `cluster_id`  | `6`     | OnOff cluster                   |
| `attribute_id`| `0`     | OnOff state attribute           |

---

## Common Cluster IDs

| Cluster ID | Name                    | Common Attributes / Commands            |
|------------|-------------------------|-----------------------------------------|
| `6`        | OnOff                   | Attr `0` = on/off state; Cmds: On, Off, Toggle |
| `8`        | LevelControl            | Attr `0` = current level; Cmds: MoveToLevel, Move, Step, Stop |
| `29`       | Descriptor              | Attr `0` = device type list (read-only) |
| `40`       | BasicInformation        | Vendor name, product name, firmware version |
| `48`       | GeneralCommissioning    | Commissioning state (internal)          |
| `49`       | NetworkCommissioning    | Wi-Fi / Thread network config           |
| `62`       | OperationalCredentials  | NOC, fabric management                  |
| `768`      | ColorControl            | Hue, saturation, color temperature      |
| `1024`     | IlluminanceMeasurement  | Attr `0` = measured illuminance         |
| `1026`     | TemperatureMeasurement  | Attr `0` = measured temperature (×100 °C) |
| `1030`     | RelativeHumidityMeasurement | Attr `0` = measured humidity (×100 %) |
| `1280`     | OccupancySensing        | Attr `0` = occupancy bitmap             |

---

## Server-pushed Events

Events are received after calling `start_listening`.

| Event name           | Description                                       |
|----------------------|---------------------------------------------------|
| `attribute_updated`  | An attribute value changed on a node              |
| `node_added`         | A new node was commissioned                       |
| `node_updated`       | A node's data was refreshed                       |
| `node_removed`       | A node was removed from the fabric                |
| `node_event`         | A cluster event was triggered on a node           |

---

## Error Handling

When a command fails the response contains `error_code` and optionally `details`:

```json
{
  "message_id": "5",
  "error_code": "NODE_NOT_FOUND",
  "details": "Node with ID 999 does not exist"
}
```

A successful response always has `result` and no `error_code`.

---

## UI Limits

| Component       | Limit                                              |
|-----------------|----------------------------------------------------|
| Debug Console   | Last **200** messages retained (oldest dropped)    |
| Live Events     | Last **50** events retained (oldest dropped)       |
