import React from 'react';
import { Navigate } from 'react-router-dom';
import Authentication from '../components/Authentication';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const { currentUser, userData } = useAuth();

  // If already logged in, redirect to the appropriate page based on user settings or defaults
  if (currentUser && userData) {
    const defaultDestination = userData.accountType === 'business' ? '/profile' : '/map';
    return <Navigate to={defaultDestination} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-700 flex items-center justify-center">
            <span className="material-icons mr-2">pets</span>
            DogoWalker
          </h1>
          <h2 className="mt-2 text-center text-xl font-medium text-gray-700">
            Join our dog-loving community
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <Authentication />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
