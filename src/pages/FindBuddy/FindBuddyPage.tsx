import React, { useState, useEffect } from 'react';
import {
  QueryDocumentSnapshot,
  DocumentData,
  GeoPoint
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { NearbyUser } from '../../types/index';
import { loadNearbyUsers } from './FindBuddyFunctionality';

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


  const handleLoadNearbyUsers = async (isLoadMore = false) => {
    await loadNearbyUsers({
      currentUser,
      userLocation,
      updateCurrentUserLocation,
      lastDoc,
      setLastDoc,
      setHasMore,
      setLoading,
      setLoadingMore,
      setNearbyUsers,
      PAGE_SIZE
    }, isLoadMore);
  };

  useEffect(() => {
    if (currentUser && userLocation) {
      // Reset pagination when location changes
      setLastDoc(null);
      setHasMore(true);
      handleLoadNearbyUsers();
    }
  }, [currentUser, userLocation]);
  
  // Load more users when user clicks the button
  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      handleLoadNearbyUsers(true);
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

      {/* Debug Information 
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
      </div>*/}
    
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
