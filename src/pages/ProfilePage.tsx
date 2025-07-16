import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import DogProfileManager from '../components/DogProfileManager';

const ProfilePage: React.FC = () => {
  const { currentUser, userData, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    displayName: '',
    bio: '',
    age: 0,
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (userData) {
      setProfile({
        displayName: userData.displayName || '',
        bio: userData.bio || '',
        age: userData.age || NaN,
      });
    }
  }, [userData]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsLoading(true);
    setMessage({ text: '', type: '' });

    try {
      let photoURL = userData?.photoURL || '';

      if (profilePicture) {
        const storageRef = ref(storage, `users/${currentUser.uid}/profile`);
        await uploadBytes(storageRef, profilePicture);
        photoURL = await getDownloadURL(storageRef);
      }

      await updateUserProfile({
        ...profile,
        photoURL,
      });

      setIsEditing(false);
      setMessage({
        text: 'Profile updated successfully!',
        type: 'success',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({
        text: 'Failed to update profile. Please try again.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Clear success message after 3 seconds
  useEffect(() => {
    if (message.type === 'success') {
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 mb-2">
              {userData?.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt={userData.displayName || 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500">
                  <span className="material-icons text-5xl">person</span>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="mt-2 w-full">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files && setProfilePicture(e.target.files[0])}
                  className="w-full text-sm"
                />
              </div>
            )}

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition w-full"
              >
                Edit Profile
              </button>
            )}
          </div>

          <div className="flex-1">
            {message.text && (
              <div
                className={`p-3 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {message.text}
              </div>
            )}

            {isEditing ? (
              <form onSubmit={handleProfileUpdate}>
                <div className="mb-4">
                  <label className="block mb-1">Name</label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    className="w-full p-2 border rounded"
                    placeholder="Your name"
                  />
                </div>

                <div className="mb-4">
                  <label className="block mb-1">Age</label>
                  <input
                    type="number"
                    value={profile.age}
                    onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
                    className="w-full p-2 border rounded"
                    placeholder="Your age"
                  />
                </div>

                <div className="mb-4">
                  <label className="block mb-1">Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="w-full p-2 border rounded"
                    rows={3}
                    placeholder="Tell other dog owners about yourself..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 transition"
                  >
                    {isLoading ? 'Saving...' : 'Save Profile'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <h2 className="text-2xl font-bold mb-2">{userData?.displayName || 'Dog Owner'}</h2>
                <p className="text-gray-600 mb-1">
                  {userData?.accountType === 'business' ? 'Business Account' : 'Personal Account'}
                </p>

                {userData?.age && (
                  <p className="text-gray-600 mb-1">
                    <span className=" align-text-bottom mr-1 text-sm">Age: </span>
                    {userData.age}
                  </p>
                )}

                {userData?.email && (
                  <p className="text-gray-600 mb-3">
                    <span className="material-icons align-text-bottom mr-1 text-sm">email</span>
                    {userData.email}
                  </p>
                )}

                {userData?.bio ? (
                  <p className="mt-2">
                    <span className="font-bold">Bio: </span>
                    {userData.bio}
                  </p>
                ) : (
                  <p className="text-gray-500 italic mt-2">
                    No bio provided. Click 'Edit Profile' to add one.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dog Profile Manager */}
      <DogProfileManager />
    </div>
  );
};

export default ProfilePage;
