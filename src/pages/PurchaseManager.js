import React, { useState, useEffect } from 'react';

function PurchaseManager() {
  const [purchases, setPurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [purchasePhotos, setPurchasePhotos] = useState([]);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      const loadedPurchases = await window.electron.invoke('get-purchases');
      setPurchases(loadedPurchases);
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  };

  const loadPurchasePhotos = async (purchaseId) => {
    try {
      const photos = await window.electron.invoke('get-purchase-photos', purchaseId);
      setPurchasePhotos(photos);
    } catch (error) {
      console.error('Error loading purchase photos:', error);
    }
  };

  const handlePurchaseClick = (purchase) => {
    setSelectedPurchase(purchase);
    loadPurchasePhotos(purchase.id);
  };

  const handleStatusChange = async (purchaseId, newStatus) => {
    try {
      const success = await window.electron.invoke('update-purchase-status', purchaseId, newStatus);
      if (success) {
        loadPurchases();
        if (selectedPurchase && selectedPurchase.id === purchaseId) {
          setSelectedPurchase({ ...selectedPurchase, status: newStatus });
        }
      }
    } catch (error) {
      console.error('Error updating purchase status:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-200 text-yellow-800';
      case 'processing':
        return 'bg-blue-200 text-blue-800';
      case 'completed':
        return 'bg-green-200 text-green-800';
      case 'cancelled':
        return 'bg-red-200 text-red-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Purchase Manager</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-xl font-semibold mb-2">Purchase List</h3>
          {purchases.map((purchase) => (
            <div
              key={purchase.id}
              className={`cursor-pointer p-2 mb-2 rounded ${
                selectedPurchase?.id === purchase.id
                  ? 'bg-blue-100'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => handlePurchaseClick(purchase)}
            >
              <p>Purchase ID: {purchase.id}</p>
              <p>Date: {new Date(purchase.created_at).toLocaleString()}</p>
              <p className={`inline-block px-2 py-1 rounded ${getStatusColor(purchase.status)}`}>
                Status: {purchase.status}
              </p>
            </div>
          ))}
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">Purchase Details</h3>
          {selectedPurchase ? (
            <div>
              <p>Purchase ID: {selectedPurchase.id}</p>
              <p>Date: {new Date(selectedPurchase.created_at).toLocaleString()}</p>
              <p>Photos: {purchasePhotos.length}</p>
              <div className="mb-4">
                <label htmlFor="status" className="block mb-2">Status:</label>
                <select
                  id="status"
                  value={selectedPurchase.status}
                  onChange={(e) => handleStatusChange(selectedPurchase.id, e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                {purchasePhotos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <img
                      src={`data:image/jpeg;base64,${photo.data}`}
                      alt={photo.name}
                      className="w-full h-32 object-cover rounded"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 text-xs">
                      {photo.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>Select a purchase to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PurchaseManager;