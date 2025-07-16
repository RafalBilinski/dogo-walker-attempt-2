import React, { useState, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const { currentUser, userData, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = currentUser
    ? [
        { path: '/map', label: 'Map', icon: 'map' },
        { path: '/find-buddy', label: 'Find Buddies', icon: 'people' },
        { path: '/profile', label: 'Profile', icon: 'person' },
        { path: '/settings', label: 'Settings', icon: 'settings' },
      ]
    : [
        { path: '/', label: 'Home', icon: 'home' },
        { path: '/login', label: 'Login', icon: 'login' },
      ];

  console.log(currentUser);
  return (
    <nav className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="font-bold text-xl text-blue-600 flex items-center">
                <span className="material-icons mr-2">pets</span>
                DogoWalker
              </Link>
            </div>

            {/* Desktop menu */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full
                    ${
                      isActive(item.path)
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                >
                  <span className="material-icons text-sm mr-1">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User profile menu (desktop) */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {currentUser && (
              <div className="ml-3 relative flex items-center">
                <div className="flex items-center">
                  <div className="flex flex-col items-end mr-3">
                    <span className="text-sm font-medium text-gray-700">
                      {userData?.displayName || 'Dog Owner'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {userData?.accountType === 'business' ? 'Business' : 'Personal'}
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200">
                    {userData?.photoURL ? (
                      <img
                        src={userData.photoURL}
                        alt={userData.displayName || 'Profile'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-blue-100 text-blue-500">
                        <span className="material-icons text-sm">person</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-4 px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              <span className="material-icons">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="inline-flex items-center">
                  <span className="material-icons mr-2">{item.icon}</span>
                  {item.label}
                </span>
              </Link>
            ))}

            {currentUser !== null && (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <span className="inline-flex items-center">
                  <span className="material-icons mr-2">logout</span>
                  Logout
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default memo(Navigation);
