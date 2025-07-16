import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import FindBuddyPage from './pages/FindBuddyPage';
import SettingsPage from './components/SettingsPage';
import MapComponent from './components/MapComponent';

// Import Material Icons
import './styles/material-icons.css';

const App = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Test div to verify Tailwind is working */}
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main className="pb-12">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Protected routes */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/map"
                  element={
                    <ProtectedRoute>
                      <MapComponent />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/find-buddy"
                  element={
                    <ProtectedRoute>
                      <FindBuddyPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </AuthProvider>
      </Router>
    </div>
  );
};

export default App;
