import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-blue-800">
              DogoWalker
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8">
              Connect with other dog owners, find walking buddies, and discover dog-friendly places
            </p>
            
            {!currentUser ? (
              <Link 
                to="/login" 
                className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-md"
              >
                Get Started
              </Link>
            ) : (
              <Link 
                to="/map" 
                className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-md"
              >
                Open Map
              </Link>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="text-blue-600 mb-3">
                <span className="material-icons text-4xl">map</span>
              </div>
              <h2 className="text-xl font-bold mb-2">Find Walking Spots</h2>
              <p className="text-gray-600">
                Discover the best dog-friendly parks, trails, and walking areas near you, contributed by other dog owners.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="text-blue-600 mb-3">
                <span className="material-icons text-4xl">people</span>
              </div>
              <h2 className="text-xl font-bold mb-2">Meet Walking Buddies</h2>
              <p className="text-gray-600">
                Connect with other dog owners nearby and find walking companions for you and your furry friend.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="text-blue-600 mb-3">
                <span className="material-icons text-4xl">pets</span>
              </div>
              <h2 className="text-xl font-bold mb-2">Manage Dog Profiles</h2>
              <p className="text-gray-600">
                Create profiles for your dogs, showcase their personalities, and keep track of their information.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-center">How It Works</h2>
            
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="font-bold text-blue-600">1</span>
                </div>
                <h3 className="font-semibold mb-2">Create an Account</h3>
                <p className="text-gray-600 text-sm">
                  Sign up and create your profile as a dog owner or a business.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="font-bold text-blue-600">2</span>
                </div>
                <h3 className="font-semibold mb-2">Add Your Dogs</h3>
                <p className="text-gray-600 text-sm">
                  Create profiles for each of your dogs with photos and details.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="font-bold text-blue-600">3</span>
                </div>
                <h3 className="font-semibold mb-2">Explore the Map</h3>
                <p className="text-gray-600 text-sm">
                  Find walking spots, services, and potential walking buddies.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="font-bold text-blue-600">4</span>
                </div>
                <h3 className="font-semibold mb-2">Connect & Enjoy</h3>
                <p className="text-gray-600 text-sm">
                  Make friends with other dog owners and enjoy walks together.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-6">Ready to join our dog-loving community?</h2>
            
            {!currentUser ? (
              <Link 
                to="/login" 
                className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-md"
              >
                Sign Up Now
              </Link>
            ) : (
              <Link 
                to="/map" 
                className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-md"
              >
                Explore Map
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
