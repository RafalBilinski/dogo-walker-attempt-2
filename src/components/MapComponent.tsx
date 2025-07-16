import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import { db } from '../firebase/config';
import { collection, query, getDocs, where, addDoc, GeoPoint } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Location } from '../types';
import 'leaflet/dist/leaflet.css';

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

// Component to recenter map when user location changes
const LocationMarker: React.FC<{ position: GeoPoint | [number, number] }> = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    // Convert GeoPoint to [lat, lng] array if needed for the map
    const mapPosition =
      position instanceof GeoPoint
        ? ([position.latitude, position.longitude] as [number, number])
        : position;

    map.flyTo(mapPosition, 14);
  }, [map, position]);

  return null;
};

const MapComponent: React.FC = () => {
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [filters, setFilters] = useState({
    walkingSpots: false,
    services: false,
    friends: false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState<Partial<Location>>({
    name: '',
    description: '',
    businessType: undefined,
  });
  const [selectedPosition, setSelectedPosition] = useState<GeoPoint | null>(null);

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

  const loadMapData = useCallback(async () => {
    if (!currentUser) return;

    try {
      const locationsArray: Location[] = [];

      // Load walking spots
      const walkingSpotsQuery = query(
        collection(db, 'locations'),
        where('type', '==', 'walkingSpot'),
        where('approved', '==', true)
      );
      const walkingSpotsSnapshot = await getDocs(walkingSpotsQuery);
      walkingSpotsSnapshot.forEach((doc) => {
        const data = doc.data();
        locationsArray.push({
          id: doc.id,
          type: 'walkingSpot',
          name: data.name,
          position: data.position as GeoPoint,
          description: data.description,
        });
      });

      // Load services
      const servicesQuery = query(collection(db, 'locations'), where('type', '==', 'service'));
      const servicesSnapshot = await getDocs(servicesQuery);
      servicesSnapshot.forEach((doc) => {
        const data = doc.data();
        locationsArray.push({
          id: doc.id,
          type: 'service',
          name: data.name,
          position: data.position as GeoPoint,
          description: data.description,
          businessType: data.businessType,
        });
      });

      // Load friends (if personal account)
      if (!isBusinessAccount && userData) {
        // Get user's friends
        const friendsQuery = query(
          collection(db, 'friendships'),
          where('userId', '==', currentUser.uid),
          where('status', '==', 'accepted')
        );
        const friendsSnapshot = await getDocs(friendsQuery);

        // Get friend locations
        for (const friendDoc of friendsSnapshot.docs) {
          const friendId = friendDoc.data().friendId;
          const friendLocationQuery = query(
            collection(db, 'userLocations'),
            where('userId', '==', friendId)
          );
          const friendLocationSnapshot = await getDocs(friendLocationQuery);

          if (!friendLocationSnapshot.empty) {
            const locationData = friendLocationSnapshot.docs[0].data();
            const friendUserQuery = query(collection(db, 'users'), where('uid', '==', friendId));
            const friendUserSnapshot = await getDocs(friendUserQuery);
            const friendName = !friendUserSnapshot.empty
              ? friendUserSnapshot.docs[0].data().displayName
              : 'Unknown Friend';

            locationsArray.push({
              id: friendLocationSnapshot.docs[0].id,
              type: 'friend',
              name: friendName,
              position: locationData.position as GeoPoint,
              userId: friendId,
            });
          }
        }
      }

      setLocations(locationsArray);
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  }, [currentUser, isBusinessAccount, userData]);

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
        <LocationMarker position={userLocation} />

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
