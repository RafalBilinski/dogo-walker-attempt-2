import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import { db } from '../firebase/config';
import { collection, addDoc, GeoPoint, DocumentData } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Location } from '../types';
import 'leaflet/dist/leaflet.css';
import { GeoService } from '../services/GeoService';

// Fix for default marker icons in react-leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useCallback } from 'react';

// Define marker icons
const defaultIcon = new Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Will be implemented with custom icons for different location types
const getMarkerIcon = (type: string) => {
  return defaultIcon;
};

// Custom component to handle map click events
interface MapEventsProps {
  onMapClick: (e: any) => void;
}

const MapEvents: React.FC<MapEventsProps> = ({ onMapClick }) => {
  useMapEvents({
    click: onMapClick,
  });
  return null;
};

// Component to recenter map when user location changes and track map bounds
interface LocationMarkerProps {
  position: GeoPoint | [number, number];
  onBoundsChange: (bounds: LatLngBounds) => void;
}

const LocationMarker: React.FC<LocationMarkerProps> = ({ position, onBoundsChange }) => {
  const map = useMap();

  useEffect(() => {
    // Convert GeoPoint to [lat, lng] array if needed for the map
    const mapPosition =
      position instanceof GeoPoint
        ? ([position.latitude, position.longitude] as [number, number])
        : position;

    map.flyTo(mapPosition, 14);
  }, [map, position]);

  // Listen for map move events to update bounds
  useEffect(() => {
    const handleMoveEnd = () => {
      onBoundsChange(map.getBounds());
    };
    
    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);
    
    // Trigger once on initial render
    handleMoveEnd();
    
    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map, onBoundsChange]);

  return null;
};

const MapComponent: React.FC = () => {
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [filters, setFilters] = useState({
    walkingSpots: true,
    services: true,
    friends: true,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState<Partial<Location>>({
    name: '',
    description: '',
    businessType: undefined,
  });
  const [selectedPosition, setSelectedPosition] = useState<GeoPoint | null>(null);
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { currentUser, userData, updateUserLocation } = useAuth();
  const isBusinessAccount = userData?.accountType === 'business';

  useEffect(() => {
    // Get user's current location
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = new GeoPoint(position.coords.latitude, position.coords.longitude);
        setUserLocation(location);

        // Update user location in Firestore if user is logged in
        if (currentUser) {
          await updateUserLocation(location);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        const defaultLocation = new GeoPoint(52.237049, 21.017532); // Default location if geolocation fails (e.g., Warsaw, Poland)
        setUserLocation(defaultLocation);
      }
    );

    // Load map data
    if (currentUser) {
      loadMapData();
    }
  }, [currentUser, updateUserLocation]);

  // Handle map bounds changes to load relevant data
  const handleBoundsChange = useCallback((bounds: LatLngBounds) => {
    setMapBounds(bounds);
    if (currentUser && userLocation) {
      loadMapData();
    }
  }, [currentUser, userLocation]);

  const loadMapData = useCallback(async () => {
    if (!currentUser || !mapBounds || !userLocation) return;

    try {
      setIsLoading(true);
      const locationsArray: Location[] = [];
      
      // Get bounds center and radius to cover the visible map area plus a buffer
      // Use user's current location as the query center
      const centerLat = userLocation.latitude;
      const centerLng = userLocation.longitude;
      
      // Calculate distance from center to each corner and take the maximum, plus 1 km buffer
      const corners = [
        mapBounds.getNorthEast(),
        mapBounds.getNorthWest(),
        mapBounds.getSouthEast(),
        mapBounds.getSouthWest(),
      ];
      let maxDistance = 0;
      corners.forEach(corner => {
        const d = GeoService.calculateDistance(centerLat, centerLng, corner.lat, corner.lng);
        if (d > maxDistance) maxDistance = d;
      });
      const radiusInKm = maxDistance + 1; // add 1 km safety buffer

      // Load walking spots using geohash
      if (filters.walkingSpots || (!filters.walkingSpots && !filters.services && !filters.friends)) {
        try{
          const walkingSpotResults = await GeoService.getNearbyLocations(
            'locations',
            centerLat,
            centerLng,
            radiusInKm,
            100, // Limit to 100 locations
            [{ field: 'type', operator: '==', value: 'walkingSpot' },
             { field: 'approved', operator: '==', value: true }]
          );
          walkingSpotResults.data.forEach((data: DocumentData) => {
            locationsArray.push({
              id: data.id,
              type: 'walkingSpot',
              name: data.name,
              position: data.position as GeoPoint,
              description: data.description,
            });
          });
        } catch (err) {
          console.error(err);
          throw err;
        }      
        
        
      }

      // Load services using geohash
      if (filters.services || !(filters.walkingSpots && !filters.services && !filters.friends)) {
        try {
          const serviceResults = await GeoService.getNearbyLocations(
            'locations',
            centerLat,
            centerLng,
            radiusInKm,
            100, // Limit to 100 locations
            [{ field: 'type', operator: '==', value: 'service' }]
          );
          serviceResults.data.forEach((data: DocumentData) => {
            locationsArray.push({
              id: data.id,
              type: 'service',
              name: data.name,
              position: data.position as GeoPoint,
              description: data.description,
              businessType: data.businessType as Location["businessType"],
            });
          });
        } catch (err) {
          console.error('Error fetching services:', err);
        }
      }

      // Load friends (users you've befriended) using geohash
      if ((filters.friends || (!filters.walkingSpots && !filters.services && !filters.friends)) && userData?.friendships) {
        const friendIds = userData.friendships
          .filter((f) => f.status === 'accepted')
          .map((f) => f.userId);

        if (friendIds.length > 0) {
          // Use geohash to find friends who are within the map bounds
          try {
            const friendResults = await GeoService.getNearbyLocations(
              'userLocations',
              centerLat,
              centerLng,
              radiusInKm,
              100 // Limit to 100 friends
            );
            
            // Filter by friendship and active within last hour
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            
            friendResults.data.forEach((friendData: DocumentData) => {
              // Only include users who are friends
              if (friendIds.includes(friendData.userId)) {
                const lastUpdated = friendData.lastUpdated?.toDate() || new Date(0);
                
                // Only show friends who have updated their location within the last hour
                if (lastUpdated > oneHourAgo) {
                  locationsArray.push({
                    id: friendData.userId,
                    type: 'friend',
                    name: friendData.displayName || 'Friend',
                    position: friendData.position as GeoPoint,
                    
                  });
                }
              }
            });
          } catch (err) {
            console.error('Error fetching friends:', err);
          }
        }
      }

      setLocations(locationsArray);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading map data:', error);
      setIsLoading(false);
    }
  }, [currentUser, userData, filters, mapBounds, userLocation]);

  const handleMapClick = (e: any) => {
    if (!currentUser) return;
    const position = new GeoPoint(e.latlng.lat, e.latlng.lng);
    setSelectedPosition(position);
    console.log('New position selected : ', position);
  };

  const addWalkingSpot = async () => {
    if (!currentUser || !selectedPosition) return;

    try {
      await addDoc(collection(db, 'locations'), {
        type: 'walkingSpot',
        name: newLocation.name,
        position: selectedPosition, // Already a GeoPoint
        geohash: GeoService.geoPointToHash(selectedPosition),
        description: newLocation.description,
        userId: currentUser.uid,
        approved: false,
        createdAt: new Date(),
      });

      alert('Walking spot submitted for approval!');
      resetForm();
    } catch (error) {
      console.error('Error adding walking spot:', error);
    }
  };

  const addBusinessLocation = async () => {
    if (!currentUser || !isBusinessAccount || !selectedPosition) return;

    try {
      await addDoc(collection(db, 'locations'), {
        type: 'service',
        name: newLocation.name,
        position: selectedPosition, // Already a GeoPoint
        geohash: GeoService.geoPointToHash(selectedPosition),
        businessType: newLocation.businessType,
        description: newLocation.description,
        userId: currentUser.uid,
        createdAt: new Date(),
      });

      alert('Business location added successfully!');
      resetForm();
      loadMapData();
    } catch (error) {
      console.error('Error adding business location:', error);
    }
  };

  const resetForm = () => {
    setIsModalOpen(false);
    setSelectedPosition(null);
    setNewLocation({
      name: '',
      description: '',
      businessType: undefined,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isBusinessAccount) {
      addBusinessLocation();
    } else {
      addWalkingSpot();
    }
  };

  if (!userLocation) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Loading map... Please allow location access.</p>
      </div>
    );
  }

  return (
    <div className=" h-96 relative ">
      <div className="absolute top-4 right-4 z-50 bg-white p-2 rounded shadow-md">
        <h3 className="font-semibold mb-2">Map Layers</h3>
        <div className="flex flex-col gap-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.walkingSpots}
              onChange={() => setFilters({ ...filters, walkingSpots: !filters.walkingSpots })}
              className="mr-2"
            />
            Walking Spots
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.services}
              onChange={() => setFilters({ ...filters, services: !filters.services })}
              className="mr-2"
            />
            Dog Services
          </label>
          {!isBusinessAccount && (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.friends}
                onChange={() => setFilters({ ...filters, friends: !filters.friends })}
                className="mr-2"
              />
              Friends
            </label>
          )}
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 w-full p-2 bg-blue-600 text-white rounded flex items-center justify-center hover:bg-blue-700 transition"
        >
          <span className="material-icons mr-1">add_location</span>
          {isBusinessAccount ? 'Add Business' : 'Add Walking Spot'}
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {isBusinessAccount ? 'Add Business Location' : 'Add Walking Spot'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="block mb-1">Name</label>
                <input
                  type="text"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              {isBusinessAccount && (
                <div className="mb-3">
                  <label className="block mb-1">Business Type</label>
                  <select
                    value={newLocation.businessType}
                    onChange={(e) =>
                      setNewLocation({
                        ...newLocation,
                        businessType: e.target.value as Location['businessType'],
                      })
                    }
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="veterinary">Veterinary Clinic</option>
                    <option value="grooming">Grooming Service</option>
                    <option value="petStore">Pet Store</option>
                    <option value="dogTraining">Dog Training</option>
                    <option value="dogWalking">Dog Walking Service</option>
                    <option value="petFriendlyCafe">Pet-Friendly Café</option>
                    <option value="petHotel">Pet Hotel</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              <div className="mb-4">
                <label className="block mb-1">Description</label>
                <textarea
                  value={newLocation.description}
                  onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows={3}
                  required
                ></textarea>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MapContainer
        center={[userLocation.latitude, userLocation.longitude]}
        zoom={14}
        style={{ height: '100%', width: '100%', zIndex: '10' }}
      >
        {/* Custom component to handle map events */}
        <MapEvents onMapClick={handleMapClick} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {selectedPosition ? (
          <Marker
            position={[selectedPosition.latitude, selectedPosition.longitude]}
            icon={defaultIcon}
          >
            {' '}
            {/* User selected location marker */}
            <Popup>You are here</Popup>
          </Marker>
        ) : (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={defaultIcon}>
            {' '}
            {/* User location marker */}
            <Popup>You are here</Popup>
          </Marker>
        )}

        {/* Dynamic location centering */}
        {userLocation && <LocationMarker position={userLocation} onBoundsChange={handleBoundsChange} />}
        {isLoading && (
          <div className="absolute top-2 right-2 bg-white p-2 rounded shadow z-[1000]">
            <span className="text-sm text-gray-700">Loading locations...</span>
          </div>
        )}

        {/* Display filtered locations */}
        {locations
          .filter((location) => {
            if (location.type === 'walkingSpot') return filters.walkingSpots;
            if (location.type === 'service') return filters.services;
            if (!isBusinessAccount && location.type === 'friend') return filters.friends;
            return false;
          })
          .map((location) => (
            <Marker
              key={location.id}
              position={[location.position.latitude, location.position.longitude]}
              icon={getMarkerIcon(location.type)}
            >
              <Popup>
                <div>
                  <h3 className="font-semibold">{location.name}</h3>
                  {location.type === 'service' && location.businessType && (
                    <p className="text-sm text-gray-600">{location.businessType}</p>
                  )}
                  {location.description && <p className="mt-1">{location.description}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
