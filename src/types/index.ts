import { GeoPoint } from '@firebase/firestore';
import { User as FirebaseUser } from '@firebase/auth';
type accountType = 'personal' | 'business';
type businessType =
  | 'veterinary'
  | 'grooming'
  | 'petStore'
  | 'dogTraining'
  | 'dogWalking'
  | 'petFriendlyCafe'
  | 'petHotel'
  | 'other';

  // Friendship related types
export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

// User related types
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  accountType: accountType;
  bio?: string;
  age?: number;
  location?: {
    position: GeoPoint & {};
    lastUpdated: Date;
  };
  friendships?:[Friendship];
}

export interface AuthContextType {
  currentUser: (FirebaseUser & {}) | null;
  userData: (User & {}) | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    accountType: 'personal' | 'business'
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  updateUserLocation: (userLocation: GeoPoint) => Promise<void>;
}

export interface UserSettings {
  locationVisibility: 'everyone' | 'friends' | 'none';
  profileVisibility: 'everyone' | 'friends' | 'none';
  defaultTab: 'map' | 'findBuddy' | 'profile';
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  showOnlineStatus: boolean;
}

export interface NearbyUser {
  uid: string;
  displayName: string;
  photoURL?: string;
  distance: number;
  lastActive: Date;
  accountType: accountType & {};
  dogs: {
    id: string;
    name: string;
    breed: string;
    photoURL?: string;
  }[];
}

// Dog related types
export interface Dog {
  id?: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  size: string;
  temperament: string;
  photoURL: string;
  notes: string;
  ownerId: string;
}

// Location related types
export interface Location {
  id: string;
  type: 'walkingSpot' | 'service' | 'friend';
  name: string;
  position: GeoPoint & {};
  geohash?: string; // Geohash of the position for efficient spatial queries
  description?: string;
  approved?: boolean;
  businessType?: businessType & {};
  userId?: string;
}
