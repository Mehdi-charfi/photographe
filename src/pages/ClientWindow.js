import React, { useState, useEffect } from 'react';

function ClientWindow() {
  const [photos, setPhotos] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    setIsLoading(true);
    try {
      const loadedPhotos = await window.electron.invoke('get-photos');
      setPhotos(loadedPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
    setIsLoading(false);
  };

  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos((prevSelected) =>
      prevSelected.includes(photoId)
        ? prevSelected.filter((id) => id !== photoId)
        : [...prevSelected, photoId]
    );
  };

  const handlePurchase = async () => {
    try {
      await window.electron.invoke('create-purchase', selectedPhotos);
      alert(`Thank you for your purchase! You bought ${selectedPhotos.length} photos.`);
      setSelectedPhotos([]);
    } catch (error) {
      console.error('Error creating purchase:', error);
      alert('There was an error processing your purchase. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl font-bold">Loading photos...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Photo Selection</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className={`relative cursor-pointer rounded-lg overflow-hidden shadow-md transition-all duration-300 ${
              selectedPhotos.includes(photo.id)
                ? 'ring-4 ring-blue-500 transform scale-105'
                : 'hover:shadow-lg'
            }`}
            onClick={() => togglePhotoSelection(photo.id)}
          >
            <img
              src={`data:image/jpeg;base64,${photo.data}`}
              alt={photo.name}
              className="w-full h-48 object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
              {photo.name}
            </div>
            {selectedPhotos.includes(photo.id) && (
              <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-lg font-semibold">
            Selected: {selectedPhotos.length} photo(s)
          </div>
          <button
            onClick={handlePurchase}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={selectedPhotos.length === 0}
          >
            Purchase Selected Photos
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClientWindow;