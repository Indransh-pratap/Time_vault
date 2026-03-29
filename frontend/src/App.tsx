import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import { SocketProvider } from './context/SocketContext';

import ContactView from './pages/ContactView';

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
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
