import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { initNotifications, setupOfflineStrategy } from './lib/mobile';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import { SocketProvider } from './context/SocketContext';

import ContactView from './pages/ContactView';

function App() {
  useEffect(() => {
    const initCapacitor = async () => {
      try {
        // Style status bar
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#050505' });
        
        // Hide splash screen
        await SplashScreen.hide();

        // Init mobile features
        await initNotifications();
        setupOfflineStrategy();
      } catch (err) {
        console.warn('Capacitor not available:', err);
      }
    };
    initCapacitor();
  }, []);

  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/daily" element={<Dashboard />} />
            <Route path="/contact" element={<ContactView />} />
          </Route>

          {/* Catch-all: show 404 for any unmatched route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;
