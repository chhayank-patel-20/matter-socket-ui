import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WebSocketProvider } from './context/WebSocketContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Commission } from './pages/Commission';
import { Devices } from './pages/Devices';
import { Commands } from './pages/Commands';
import { Notifications } from './pages/Notifications';
import { Console } from './pages/Console';
import { MatterInfo } from './pages/MatterInfo';

function App() {
  return (
    <WebSocketProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/commission" element={<Commission />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/commands" element={<Commands />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/console" element={<Console />} />
            <Route path="/info" element={<MatterInfo />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </WebSocketProvider>
  );
}

export default App;
