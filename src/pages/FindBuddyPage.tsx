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
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { NearbyUser } from '../types/index';
import { GeoService } from '../services/GeoService';

const FindBuddyPage: React.FC = () => {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const { currentUser, updateUserLocation } = useAuth();
  const PAGE_SIZE = 20; // Users per page

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

  const loadNearbyUsers = async (isLoadMore = false) => {
    if (!currentUser || !userLocation) {
      console.log('[FindBuddyPage] Missing currentUser or userLocation:', { currentUser: !!currentUser, userLocation: !!userLocation });
      return;
    }

    try {
      console.log('[FindBuddyPage] Starting loadNearbyUsers, isLoadMore:', isLoadMore);
      console.log('[FindBuddyPage] User location:', userLocation.latitude, userLocation.longitude);
      
      if (!isLoadMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // Update current user's location on initial load
      if (!isLoadMore) {
        console.log('[FindBuddyPage] Updating current user location');
        await updateCurrentUserLocation();
      }

      // Get current timestamp and one hour ago for activity filter
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      console.log('[FindBuddyPage] Activity filter - looking for users active since:', oneHourAgo);

      // Use GeoService to find nearby users with geohashing
      const searchRadius = 20; // km - search for users within 20km
      console.log('[FindBuddyPage] Searching for users within', searchRadius, 'km');
      
      const geoQueryResult = await GeoService.getNearbyLocations(
        'userLocations',
        userLocation.latitude,
        userLocation.longitude,
        searchRadius,
        PAGE_SIZE,
        [{ field: 'userId', operator: '!=', value: currentUser.uid }],
        isLoadMore && lastDoc ? lastDoc : undefined,
        true // Enable debug logging
      );
      
      console.log('[FindBuddyPage] GeoService returned:', geoQueryResult.data.length, 'location records');
      
      // Save the last document for pagination
      setLastDoc(geoQueryResult.lastDoc);
      
      // If we got fewer results than the page size, there are no more to load
      if (geoQueryResult.data.length < PAGE_SIZE) {
        setHasMore(false);
      }

      const nearbyUsersData: NearbyUser[] = [];
      const userDetailsPromises = [];

      // Process location data and fetch additional user details
      console.log('[FindBuddyPage] Processing', geoQueryResult.data.length, 'location records');
      
      for (const locationData of geoQueryResult.data) {
        const lastActive = locationData.lastUpdated?.toDate() || new Date(0);
        console.log('[FindBuddyPage] User', locationData.userId, 'last active:', lastActive, 'vs cutoff:', oneHourAgo);

        // Only include users who were active in the last hour
        if (lastActive >= oneHourAgo) {
          const userId = locationData.userId;
          console.log('[FindBuddyPage] Including user', userId, 'in results');
          
          // Create a promise to fetch user details and dogs
          userDetailsPromises.push(
            (async () => {
              const userDocRef = doc(db, 'users', userId);
              const userDoc = await getDoc(userDocRef);
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Calculate exact distance
                const geoPoint = locationData.position as GeoPoint;
                const distance = GeoService.calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  geoPoint.latitude,
                  geoPoint.longitude
                );
                
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
                
                return {
                  uid: userId,
                  displayName: userData.displayName || 'Dog Owner',
                  photoURL: userData.photoURL,
                  distance,
                  lastActive,
                  accountType: userData.accountType,
                  dogs: dogs as any[],
                };
              }
              return null;
            })()
          );
        }
      }
      
      // Wait for all user details to be fetched
      console.log('[FindBuddyPage] Fetching details for', userDetailsPromises.length, 'users');
      const userResults = await Promise.all(userDetailsPromises);
      
      // Filter out null results and add to the nearby users array
      const validResults = userResults.filter(result => result !== null) as NearbyUser[];
      console.log('[FindBuddyPage] Got', validResults.length, 'valid user results after filtering');
      
      // Sort by distance
      validResults.sort((a, b) => a.distance - b.distance);

      if (isLoadMore) {
        // Append to existing users
        setNearbyUsers(prev => {
          const newTotal = [...prev, ...validResults];
          console.log('[FindBuddyPage] Appended users, total now:', newTotal.length);
          return newTotal;
        });
      } else {
        // Replace existing users
        console.log('[FindBuddyPage] Setting', validResults.length, 'nearby users');
        setNearbyUsers(validResults);
      }
    } catch (error) {
      console.error('Error finding nearby users:', error);
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (currentUser && userLocation) {
      // Reset pagination when location changes
      setLastDoc(null);
      setHasMore(true);
      loadNearbyUsers();
    }
  }, [currentUser, userLocation]);
  
  // Load more users when user clicks the button
  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      loadNearbyUsers(true);
    }
  };

  // Helper function to use the shared updateUserLocation method
  const updateCurrentUserLocation = async () => {
    if (!currentUser || !userLocation) return;
    try {
      await updateUserLocation(userLocation);
    } catch (error) {
      console.error('Error updating user location:', error);
    }
  };

  // Reuse GeoService for distance calculations

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

      {/* Debug Information */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="material-icons text-yellow-400">bug_report</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Debug Info:</strong> User: {currentUser?.uid || 'None'} | 
              Location: {userLocation ? `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}` : 'None'} | 
              Found Users: {nearbyUsers.length} | 
              Loading: {loading ? 'Yes' : 'No'} | 
              LoadingMore: {loadingMore ? 'Yes' : 'No'}
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Check browser console for detailed logs. This debug panel will be removed in production.
            </p>
          </div>
        </div>
      </div>
    
      {nearbyUsers.length === 0 ? (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <p className="text-lg text-gray-600">No dog owners found nearby.</p>
        <p className="text-sm text-gray-500 mt-2">
          Try again later or expand your search radius.
        </p>
      </div>
    
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearbyUsers.map((user) => (
              <div key={user.uid} className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center mb-4">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-12 h-12 rounded-full mr-4 object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-300 mr-4 flex items-center justify-center">
                      <span className="material-icons text-white">person</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-lg font-bold">{user.displayName}</h4>
                    <p className="text-sm text-gray-600">{formatDistance(user.distance)}</p>
                  </div>
                </div>
                {user.dogs && user.dogs.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-2">Dogs:</h4>
                    <div className="flex flex-wrap gap-2">
                      {user.dogs.map((dog) => (
                        <div
                          key={dog.id}
                          className="bg-blue-50 px-2 py-1 rounded text-xs flex items-center"
                        >
                          <span className="material-icons text-blue-500 text-sm mr-1">pets</span>
                          {dog.name}
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
            ))}
          </div>
        </>
        )}
    
    </div>
  );
};

export default FindBuddyPage;
