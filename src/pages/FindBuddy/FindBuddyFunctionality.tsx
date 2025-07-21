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
import { db } from '../../firebase/config';
import { NearbyUser } from '../../types/index';
import { GeoService } from '../../services/GeoService';


export declare interface LoadNearbyUsersParams {
  currentUser: { uid: string } | null;
  userLocation: GeoPoint | null;
  updateCurrentUserLocation: () => Promise<void>;
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  setLastDoc: (doc: QueryDocumentSnapshot<DocumentData> | null) => void;
  setHasMore: (hasMore: boolean) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setNearbyUsers: React.Dispatch<React.SetStateAction<NearbyUser[]>>;
  PAGE_SIZE: number;
}

export const loadNearbyUsers = async (
  params: LoadNearbyUsersParams,
  isLoadMore = false
) => {
  const {
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
  } = params;

  if (!currentUser || !userLocation) {
    console.log('[FindBuddyFunctionality] Missing currentUser or userLocation:', { 
      currentUser: !!currentUser, 
      userLocation: !!userLocation 
    });
    return;
  }

  try {
    console.log('[FindBuddyFunctionality] Starting loadNearbyUsers, isLoadMore:', isLoadMore);
    console.log('[FindBuddyFunctionality] User location:', userLocation.latitude, userLocation.longitude);
    
    if (!isLoadMore) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    // Update current user's location on initial load
    if (!isLoadMore) {
      console.log('[FindBuddyFunctionality] Updating current user location');
      await updateCurrentUserLocation();
    }

    // Get current timestamp and one hour ago for activity filter
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    console.log('[FindBuddyFunctionality] Activity filter - looking for users active since:', oneHourAgo);

    // Use GeoService to find nearby users with geohashing
    const searchRadius = 20; // km - search for users within 20km
    console.log('[FindBuddyFunctionality] Searching for users within', searchRadius, 'km');
    
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
    
    console.log('[FindBuddyFunctionality] GeoService returned:', geoQueryResult.data.length, 'location records');
    
    // Save the last document for pagination
    setLastDoc(geoQueryResult.lastDoc);
    
    // If we got fewer results than the page size, there are no more to load
    if (geoQueryResult.data.length < PAGE_SIZE) {
      setHasMore(false);
    }

    const nearbyUsersData: NearbyUser[] = [];
    const userDetailsPromises = [];

    // Process location data and fetch additional user details
    console.log('[FindBuddyFunctionality] Processing', geoQueryResult.data.length, 'location records');
    
    for (const locationData of geoQueryResult.data) {
      const lastActive = locationData.lastUpdated?.toDate() || new Date(0);
      console.log('[FindBuddyFunctionality] User', locationData.userId, 'last active:', lastActive, 'vs cutoff:', oneHourAgo);

      // Only include users who were active in the last hour
      if (lastActive >= oneHourAgo) {
        const userId = locationData.userId;
        console.log('[FindBuddyFunctionality] Including user', userId, 'in results');
        
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
    console.log('[FindBuddyFunctionality] Fetching details for', userDetailsPromises.length, 'users');
    const userResults = await Promise.all(userDetailsPromises);
    
    // Filter out null results and add to the nearby users array
    const validResults = userResults.filter(result => result !== null) as NearbyUser[];
    console.log('[FindBuddyFunctionality] Got', validResults.length, 'valid user results after filtering');
    
    // Sort by distance
    validResults.sort((a, b) => a.distance - b.distance);

    if (isLoadMore) {
      // Append to existing users
      setNearbyUsers(prev => {
        const newTotal = [...prev, ...validResults];
        console.log('[FindBuddyFunctionality] Appended users, total now:', newTotal.length);
        return newTotal;
      });
    } else {
      // Replace existing users
      console.log('[FindBuddyFunctionality] Setting', validResults.length, 'nearby users');
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
