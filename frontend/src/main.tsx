import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#0B0C10',
            color: '#fff',
            border: '1px solid #E50914',
            boxShadow: '0 0 10px rgba(229, 9, 20, 0.5)',
          },
        }}
      />
      <App />
    </AuthProvider>
  </React.StrictMode>
);
