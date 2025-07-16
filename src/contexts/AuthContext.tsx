import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthContextType['currentUser']>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      try {
        setCurrentUser(user);

        if (user) {
          // Fetch additional user data from Firestore
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (isMounted && userDoc.exists()) {
              setUserData(userDoc.data() as User);
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (
    email: string,
    password: string,
    accountType: 'personal' | 'business'
  ) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      accountType,
      createdAt: new Date(),
    });

    // Create default user settings
    await setDoc(doc(db, 'userSettings', user.uid), {
      locationVisibility: 'everyone',
      profileVisibility: 'everyone',
      defaultTab: 'map',
      notificationsEnabled: true,
      emailNotifications: true,
      showOnlineStatus: true,
    });
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if this is a new user
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // This is a new user, so create their profile
      // We'll need to ask for account type after Google login
      // For now, default to personal account
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        accountType: 'personal',
        createdAt: new Date(),
      });

      // Create default user settings
      await setDoc(doc(db, 'userSettings', user.uid), {
        locationVisibility: 'everyone',
        profileVisibility: 'everyone',
        defaultTab: 'map',
        notificationsEnabled: true,
        emailNotifications: true,
        showOnlineStatus: true,
      });
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, data, { merge: true });

    // Update local state
    if (userData) {
      setUserData({ ...userData, ...data });
    }
  };

  const updateUserLocation = async (userLocation: GeoPoint) => {
    if (!currentUser) return;

    try {
      const userLocationRef = doc(db, 'userLocations', currentUser.uid);
      const locationData = {
        userId: currentUser.uid,
        position: userLocation,
        lastUpdated: new Date(),
        // Add user metadata for easier querying
        displayName: userData?.displayName || 'Anonymous',
        accountType: userData?.accountType || 'personal',
        photoURL: userData?.photoURL || null,
        updatedAt: new Date(),
      };

      // Use setDoc with merge: true to create or update the document
      await setDoc(userLocationRef, locationData, { merge: true });

      // Also update the user's location in the users collection
      if (userData) {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          'location.position': userLocation,
          'location.lastUpdated': serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error updating user location:', error);
    }
  };

  const value = {
    currentUser,
    userData,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    updateUserProfile,
    updateUserLocation,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
