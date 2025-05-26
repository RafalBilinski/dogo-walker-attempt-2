// User related types
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  accountType: 'personal' | 'business';
  bio?: string;
  age?: number;
  location?: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };
}

export interface UserSettings {
  locationVisibility: 'everyone' | 'friends' | 'none';
  profileVisibility: 'everyone' | 'friends';
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
  accountType: 'personal' | 'business';
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
  position: [number, number];
  description?: string;
  approved?: boolean;
  businessType?: string;
  userId?: string;
}

// Friendship related types
export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}
