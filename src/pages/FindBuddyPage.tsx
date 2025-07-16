import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  getDocs,
  where,
  limit,
  GeoPoint,
  getDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { NearbyUser } from '../types/index';

const FindBuddyPage: React.FC = () => {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const { currentUser, updateUserLocation } = useAuth();

  useEffect(() => {
    // Get user's current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation(new GeoPoint(position.coords.latitude, position.coords.longitude));
      },
      (error) => {
        console.error('Error getting location:', error);
        setLoading(false);
      }
    );
  }, []);

  const loadNearbyUsers = async () => {
    if (!currentUser || !userLocation) return;

    try {
      // Update current user's location
      await updateCurrentUserLocation();

      // Find nearby users
      const usersQuery = query(
        collection(db, 'userLocations'),
        where('userId', '!=', currentUser.uid),
        // We would add geohashing or GeoFireX here in a real implementation
        // For this demo, we'll just fetch all and filter client-side
        limit(100)
      );

      const usersSnapshot = await getDocs(usersQuery);
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const nearbyUsersData: NearbyUser[] = [];

      for (const userLocationDoc of usersSnapshot.docs) {
        const locationData = userLocationDoc.data();
        const lastActive = locationData.lastUpdated?.toDate() || new Date(0);

        // Only include users who were active in the last hour
        if (lastActive >= oneHourAgo) {
          const userId = locationData.userId;
          const userDocRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Calculate distance (simplified for demo)
            const geoPoint = locationData.position as GeoPoint;
            const userPos: [number, number] = [geoPoint.latitude, geoPoint.longitude]; // Convert GeoPoint to array for distance calculation
            const distance = calculateDistance(userLocation, userPos);

            // Fetch user's dogs
            const dogsQuery = query(
              collection(db, 'dogs'),
              where('ownerId', '==', userId),
              limit(3)
            );
            const dogsSnapshot = await getDocs(dogsQuery);
            const dogs = dogsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            nearbyUsersData.push({
              uid: userId,
              displayName: userData.displayName || 'Dog Owner',
              photoURL: userData.photoURL,
              distance,
              lastActive,
              accountType: userData.accountType,
              dogs: dogs as any[],
            });
          }
        }
      }

      // Sort by distance
      nearbyUsersData.sort((a, b) => a.distance - b.distance);

      setNearbyUsers(nearbyUsersData);
    } catch (error) {
      console.error('Error finding nearby users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && userLocation) {
      loadNearbyUsers();
    }
  }, [currentUser, userLocation]);

  // Helper function to use the shared updateUserLocation method
  const updateCurrentUserLocation = async () => {
    if (!currentUser || !userLocation) return;
    try {
      await updateUserLocation(userLocation);
    } catch (error) {
      console.error('Error updating user location:', error);
    }
  };

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (pos1: GeoPoint | [number, number], pos2: GeoPoint | [number, number]): number => {
    // Convert GeoPoint to [latitude, longitude] array if needed
    const lat1 = pos1 instanceof GeoPoint ? pos1.latitude : pos1[0];
    const lng1 = pos1 instanceof GeoPoint ? pos1.longitude : pos1[1];
    const lat2 = pos2 instanceof GeoPoint ? pos2.latitude : pos2[0];
    const lng2 = pos2 instanceof GeoPoint ? pos2.longitude : pos2[1];

    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Format distance for display
  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    } else {
      return `${distance.toFixed(1)} km`;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Finding dog owners near you...</p>
        </div>
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div className="container mx-auto p-4 text-center mt-12">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="material-icons text-yellow-400">warning</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                We need your location to find nearby dog owners. Please enable location access in
                your browser.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Find Walk Buddies Near You</h1>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="material-icons text-blue-400">info</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Showing dog owners who are currently online or were active in the last hour. For
              privacy, exact locations are not shown until you become friends.
            </p>
          </div>
        </div>
      </div>

      {nearbyUsers.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-icons text-gray-400 text-5xl mb-4">search</span>
          <h3 className="text-xl font-medium text-gray-700 mb-2">No dog owners found nearby</h3>
          <p className="text-gray-500">
            Try again later or adjust your settings to expand your search area.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nearbyUsers.map((user) => (
            <div
              key={user.uid}
              className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-200 mr-3">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-blue-100 text-blue-500">
                          <span className="material-icons">person</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{user.displayName}</h3>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="material-icons text-xs mr-1">place</span>
                        {formatDistance(user.distance)} away
                      </div>
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {user.accountType === 'business' ? 'Business' : 'Personal'}
                  </div>
                </div>

                {user.dogs.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-600 mb-2">Dogs:</h4>
                    <div className="flex flex-wrap gap-2">
                      {user.dogs.map((dog) => (
                        <div
                          key={dog.id}
                          className="flex items-center bg-gray-100 rounded px-2 py-1"
                        >
                          {dog.photoURL && (
                            <div className="h-6 w-6 rounded-full overflow-hidden mr-1">
                              <img
                                src={dog.photoURL}
                                alt={dog.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <span className="text-sm">
                            {dog.name} ({dog.breed})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium">
                    <span className="material-icons text-sm mr-1">person_add</span>
                    Send Friend Request
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FindBuddyPage;
