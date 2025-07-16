import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
const Authentication: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, loginWithGoogle } = useAuth();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await register(email, password, accountType);
      } else {
        await login(email, password);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during authentication');
      console.error('Authentication error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);

    try {
      await loginWithGoogle();
    } catch (error: any) {
      setError(error.message || 'An error occurred during Google authentication');
      console.error('Google auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">{isRegistering ? 'Create Account' : 'Login'}</h2>

      {error && <div className="w-full p-3 mb-4 bg-red-100 text-red-700 rounded">{error}</div>}

      <form onSubmit={handleEmailAuth} className="w-full">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />

        {isRegistering && (
          <div className="mb-4">
            <p className="mb-2">Account Type:</p>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="accountType"
                  value="personal"
                  checked={accountType === 'personal'}
                  onChange={() => setAccountType('personal')}
                  className="mr-2"
                />
                Personal Account
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="accountType"
                  value="business"
                  checked={accountType === 'business'}
                  onChange={() => setAccountType('business')}
                  className="mr-2"
                />
                Business Account
              </label>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Processing...' : isRegistering ? 'Register' : 'Login'}
        </button>
      </form>

      <div className="my-4 w-full text-center">
        <span className="text-gray-500">or</span>
      </div>

      <button
        onClick={handleGoogleAuth}
        disabled={loading}
        className="w-full p-2 border border-gray-300 rounded flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50"
      >
        <span className="material-icons">login</span>
        Sign in with Google
      </button>

      <p className="mt-4">
        {isRegistering ? 'Already have an account?' : "Don't have an account?"}
        <button
          className="ml-2 text-blue-600"
          onClick={() => setIsRegistering(!isRegistering)}
          disabled={loading}
        >
          {isRegistering ? 'Login' : 'Register'}
        </button>
      </p>
    </div>
  );
};

export default Authentication;
