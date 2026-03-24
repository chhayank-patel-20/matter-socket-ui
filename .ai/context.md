# Matter Server UI Context

## Project Overview
A React-based web interface for the Python Matter Server, communicating via WebSockets. It allows users to commission devices, manage nodes, control attributes, and monitor live events.

## Tech Stack
- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS (v4)
- **Icons:** Lucide React
- **Communication:** WebSocket (custom hook/context)

## Architecture
- `WebSocketContext.tsx`: Manages the global connection state, logs, and command dispatching.
- `useWebSocket.ts`: Core logic for message ID tracking, request-response mapping, and event handling.
- `Devices.tsx`: Central hub for node-specific management (Attributes, Bindings, ACLs, OTA).
- `Groups.tsx`: Dedicated management for multicast groups.
