import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { UserSettings } from '../types';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    locationVisibility: 'friends',
    profileVisibility: 'everyone',
    defaultTab: 'findBuddy',
    notificationsEnabled: true,
    emailNotifications: true,
    showOnlineStatus: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      loadUserSettings();
    }
  }, [currentUser]);

  const loadUserSettings = async () => {
    if (!currentUser?.uid) return;

    try {
      const userSettingsDoc = await getDoc(doc(db, 'userSettings', currentUser.uid));

      if (userSettingsDoc.exists()) {
        setSettings(userSettingsDoc.data() as UserSettings);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      setMessage({
        text: 'Failed to load settings. Please try again.',
        type: 'error',
      });
    }
  };

  const saveSettings = async () => {
    if (!currentUser?.uid) return;

    setIsSaving(true);
    setMessage({ text: '', type: '' });

    try {
      // Convert settings to a plain object that Firestore can accept
      const settingsData = {
        locationVisibility: settings.locationVisibility,
        profileVisibility: settings.profileVisibility,
        defaultTab: settings.defaultTab,
        notificationsEnabled: settings.notificationsEnabled,
        emailNotifications: settings.emailNotifications,
        showOnlineStatus: settings.showOnlineStatus,
      };

      await updateDoc(doc(db, 'userSettings', currentUser.uid), settingsData);
      setMessage({
        text: 'Settings saved successfully!',
        type: 'success',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({
        text: 'Failed to save settings. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);

      // Clear success message after 3 seconds
      if (message.type === 'success') {
        setTimeout(() => {
          setMessage({ text: '', type: '' });
        }, 3000);
      }
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h2 className="text-2xl font-bold mb-6">App Settings</h2>

      {message.text && (
        <div
          className={`p-3 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Privacy Settings</h3>

        <div className="mb-4">
          <label className="block mb-2">Location Visibility</label>
          <select
            value={settings.locationVisibility}
            onChange={(e) =>
              setSettings({
                ...settings,
                locationVisibility: e.target.value as 'everyone' | 'friends' | 'none',
              })
            }
            className="w-full p-2 border rounded"
          >
            <option value="everyone">Everyone</option>
            <option value="friends">Friends Only</option>
            <option value="none">Hidden</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">Who can see your location on the map</p>
        </div>

        <div className="mb-4">
          <label className="block mb-2">Profile Visibility</label>
          <select
            value={settings.profileVisibility}
            onChange={(e) =>
              setSettings({
                ...settings,
                profileVisibility: e.target.value as 'everyone' | 'friends',
              })
            }
            className="w-full p-2 border rounded"
          >
            <option value="everyone">Everyone</option>
            <option value="friends">Friends Only</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">Who can view your profile details</p>
        </div>

        <h3 className="text-xl font-semibold mb-4 mt-6">App Preferences</h3>

        <div className="mb-4">
          <label className="block mb-2">Default Tab After Login</label>
          <select
            value={settings.defaultTab}
            onChange={(e) =>
              setSettings({
                ...settings,
                defaultTab: e.target.value as 'map' | 'findBuddy' | 'profile',
              })
            }
            className="w-full p-2 border rounded"
          >
            <option value="map">Map</option>
            <option value="findBuddy">Find Walk Buddy</option>
            <option value="profile">Profile</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
              className="mr-2"
            />
            Enable Push Notifications
          </label>
        </div>

        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
              className="mr-2"
            />
            Enable Email Notifications
          </label>
        </div>

        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.showOnlineStatus}
              onChange={(e) => setSettings({ ...settings, showOnlineStatus: e.target.checked })}
              className="mr-2"
            />
            Show Online Status to Others
          </label>
        </div>

        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 transition"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
