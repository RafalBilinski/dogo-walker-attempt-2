import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { Dog } from '../types';

const DogProfileManager: React.FC = () => {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [isAddingDog, setIsAddingDog] = useState(false);
  const emptyDogData={
    name: '',
    breed: '',
    age: 0,
    gender: '',
    size: '',
    temperament: '',
    photoURL: '',
    notes: '',
    ownerId: ''
  }
  const [currentDog, setCurrentDog] = useState<Dog>( emptyDogData );
  const [photo, setPhoto] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      loadDogs();
    }
  }, [currentUser]);

  const loadDogs = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const dogsQuery = query(collection(db, 'dogs'), where('ownerId', '==', currentUser.uid));
      const querySnapshot = await getDocs(dogsQuery);
      
      const loadedDogs: Dog[] = [];
      querySnapshot.forEach((doc) => {
        loadedDogs.push({ id: doc.id, ...doc.data() } as Dog);
      });
      
      setDogs(loadedDogs);
    } catch (error) {
      console.error('Error loading dogs:', error);
    }
  };

  const handleAddDog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;
    
    setIsLoading(true);
    
    try {
      let photoURL = currentDog.photoURL || '';
      
      if (photo) {
        const storageRef = ref(storage, `dogs/${currentUser.uid}/${Date.now()}`);
        await uploadBytes(storageRef, photo);
        photoURL = await getDownloadURL(storageRef);
      }
      
      const dogData = {
        ...currentDog,
        photoURL,
        ownerId: currentUser.uid,
        createdAt: new Date()
      };
      
      if (currentDog.id) {
        // Update existing dog
        await updateDoc(doc(db, 'dogs', currentDog.id), dogData);
      } else {
        // Add new dog
        await addDoc(collection(db, 'dogs'), dogData);
      }
      
      setIsAddingDog(false);
      resetForm();
      loadDogs();
    } catch (error) {
      console.error('Error saving dog profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDog = async (dogId: string) => {
    if (!dogId) return;
    
    if (window.confirm('Are you sure you want to delete this dog profile?')) {
      setIsLoading(true);
      
      try {
        await deleteDoc(doc(db, 'dogs', dogId));
        loadDogs();
      } catch (error) {
        console.error('Error deleting dog profile:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const resetForm = () => {
    setCurrentDog( emptyDogData );
    setPhoto(null);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">My Dogs</h2>
      
      {!isAddingDog && (
        <button
          onClick={() => setIsAddingDog(true)}
          className="mb-6 px-4 py-2 bg-green-600 text-white rounded flex items-center hover:bg-green-700 transition"
        >
          <span className="material-icons mr-2">add</span>
          Add New Dog
        </button>
      )}
      
      {isAddingDog && (
        <form onSubmit={handleAddDog} className="mb-8 p-4 border rounded">
          <h3 className="text-xl font-semibold mb-4">
            {currentDog.id ? 'Edit Dog Profile' : 'Add New Dog'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Name</label>
              <input
                type="text"
                value={currentDog.name}
                onChange={(e) => setCurrentDog({...currentDog, name: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block mb-1">Breed</label>
              <input
                type="text"
                value={currentDog.breed}
                onChange={(e) => setCurrentDog({...currentDog, breed: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block mb-1">Age</label>
              <input
                type="number"
                value={currentDog.age}
                onChange={(e) => setCurrentDog({...currentDog, age: parseInt(e.target.value)})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block mb-1">Gender</label>
              <select
                value={currentDog.gender}
                onChange={(e) => setCurrentDog({...currentDog, gender: e.target.value})}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            
            <div>
              <label className="block mb-1">Size</label>
              <select
                value={currentDog.size}
                onChange={(e) => setCurrentDog({...currentDog, size: e.target.value})}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select Size</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="extraLarge">Extra Large</option>
              </select>
            </div>
            
            <div>
              <label className="block mb-1">Temperament</label>
              <select
                value={currentDog.temperament}
                onChange={(e) => setCurrentDog({...currentDog, temperament: e.target.value})}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select Temperament</option>
                <option value="friendly">Friendly</option>
                <option value="shy">Shy</option>
                <option value="energetic">Energetic</option>
                <option value="calm">Calm</option>
                <option value="protective">Protective</option>
              </select>
            </div>
            
            <div>
              <label className="block mb-1">Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && setPhoto(e.target.files[0])}
                className="w-full p-2"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block mb-1">Notes</label>
              <textarea
                value={currentDog.notes}
                onChange={(e) => setCurrentDog({...currentDog, notes: e.target.value})}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-blue-300"
            >
              {isLoading ? 'Processing...' : (currentDog.id ? 'Update Dog' : 'Add Dog')}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setIsAddingDog(false);
                resetForm();
              }}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition disabled:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      
      {/* Display existing dogs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dogs.length === 0 ? (
          <p className="text-gray-500 col-span-3 text-center py-8">
            You don't have any dogs added yet. Add your first dog to get started.
          </p>
        ) : (
          dogs.map(dog => (
            <div key={dog.id} className="border rounded p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-semibold">{dog.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCurrentDog(dog);
                      setIsAddingDog(true);
                    }}
                    className="p-1 text-blue-600 hover:text-blue-800 transition"
                    aria-label="Edit"
                  >
                    <span className="material-icons">edit</span>
                  </button>
                  <button
                    onClick={() => dog.id && handleDeleteDog(dog.id)}
                    className="p-1 text-red-600 hover:text-red-800 transition"
                    aria-label="Delete"
                  >
                    <span className="material-icons">delete</span>
                  </button>
                </div>
              </div>
              
              {dog.photoURL && (
                <img
                  src={dog.photoURL}
                  alt={dog.name}
                  className="w-full h-48 object-cover my-2 rounded"
                />
              )}
              
              <div className="mt-2">
                <p><strong>Breed:</strong> {dog.breed}</p>
                <p><strong>Age:</strong> {dog.age} {dog.age === 1 ? 'year' : 'years'}</p>
                <p><strong>Gender:</strong> {dog.gender && dog.gender.charAt(0).toUpperCase() + dog.gender.slice(1)}</p>
                <p><strong>Size:</strong> {dog.size && dog.size.charAt(0).toUpperCase() + dog.size.slice(1)}</p>
                <p><strong>Temperament:</strong> {dog.temperament && dog.temperament.charAt(0).toUpperCase() + dog.temperament.slice(1)}</p>
                {dog.notes && <p><strong>Notes:</strong> {dog.notes}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DogProfileManager;
