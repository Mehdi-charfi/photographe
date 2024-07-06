import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import PurchaseManager from "./PurchaseManager";

function AdminDashboard() {
  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [currentAlbum, setCurrentAlbum] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [showPurchaseManager, setShowPurchaseManager] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    loadPhotos();
    loadAlbums();
    loadEvents();
  }, []);

  const selectFolder = async () => {
    const folder = await window.electron.invoke("select-folder");
    if (folder) {
      const files = await window.electron.invoke("read-directory", folder);
      for (const file of files) {
        const filePath = `${folder}/${file}`;
        await window.electron.invoke("add-photo", file, filePath);
      }
      loadPhotos();
    }
  };

  const loadPhotos = async () => {
    const loadedPhotos = await window.electron.invoke("get-photos");
    setPhotos(loadedPhotos);
  };

  const loadAlbums = async () => {
    const loadedAlbums = await window.electron.invoke("get-albums");
    setAlbums(loadedAlbums);
  };

  const loadEvents = async () => {
    const loadedEvents = await window.electron.invoke("get-events");
    setEvents(loadedEvents);
  };

  const createAlbum = async (name) => {
    await window.electron.invoke("create-album", name);
    loadAlbums();
  };

  const deleteAlbum = async (albumId) => {
    await window.electron.invoke("delete-album", albumId);
    loadAlbums();
    if (currentAlbum?.id === albumId) {
      setCurrentAlbum(null);
    }
  };

  const renameAlbum = async (albumId, newName) => {
    await window.electron.invoke("rename-album", albumId, newName);
    loadAlbums();
    if (currentAlbum?.id === albumId) {
      setCurrentAlbum({ ...currentAlbum, name: newName });
    }
  };

  const addPhotoToAlbum = async (albumId, photoId) => {
    const albumPhotos = await window.electron.invoke("get-album-photos", albumId);
    const orderIndex = albumPhotos.length;
    await window.electron.invoke("add-photo-to-album", albumId, photoId, orderIndex);
    if (currentAlbum?.id === albumId) {
      loadCurrentAlbum(albumId);
    }
  };

  const removePhotoFromAlbum = async (albumId, photoId) => {
    await window.electron.invoke("remove-photo-from-album", albumId, photoId);
    if (currentAlbum?.id === albumId) {
      loadCurrentAlbum(albumId);
    }
  };

  const deletePhoto = async (photoId, filePath) => {
    await window.electron.invoke("delete-photo", photoId, filePath);
    loadPhotos();
    if (currentAlbum) {
      loadCurrentAlbum(currentAlbum.id);
    }
  };

  const createEvent = async (name) => {
    await window.electron.invoke("create-event", name);
    loadEvents();
  };

  const deleteEvent = async (eventId) => {
    await window.electron.invoke("delete-event", eventId);
    loadEvents();
    if (currentEvent?.id === eventId) {
      setCurrentEvent(null);
    }
  };

  const renameEvent = async (eventId, newName) => {
    await window.electron.invoke("rename-event", eventId, newName);
    loadEvents();
    if (currentEvent?.id === eventId) {
      setCurrentEvent({ ...currentEvent, name: newName });
    }
  };

  const addAlbumToEvent = async (eventId, albumId) => {
    const eventAlbums = await window.electron.invoke("get-event-albums", eventId);
    const orderIndex = eventAlbums.length;
    await window.electron.invoke("add-album-to-event", eventId, albumId, orderIndex);
    if (currentEvent?.id === eventId) {
      loadCurrentEvent(eventId);
    }
  };

  const removeAlbumFromEvent = async (eventId, albumId) => {
    await window.electron.invoke("remove-album-from-event", eventId, albumId);
    if (currentEvent?.id === eventId) {
      loadCurrentEvent(eventId);
    }
  };

  const loadCurrentAlbum = async (albumId) => {
    const albumPhotos = await window.electron.invoke("get-album-photos", albumId);
    const album = albums.find((a) => a.id === albumId);
    setCurrentAlbum({ ...album, photos: albumPhotos });
  };

  const loadCurrentEvent = async (eventId) => {
    const eventAlbums = await window.electron.invoke("get-event-albums", eventId);
    const event = events.find((e) => e.id === eventId);
    setCurrentEvent({ ...event, albums: eventAlbums });
  };

  const onDragEnd = async (result) => {
    if (!result.destination) {
      return;
    }

    if (result.type === "PHOTO" && currentAlbum) {
      const newPhotos = Array.from(currentAlbum.photos);
      const [reorderedItem] = newPhotos.splice(result.source.index, 1);
      newPhotos.splice(result.destination.index, 0, reorderedItem);

      for (let i = 0; i < newPhotos.length; i++) {
        await window.electron.invoke("add-photo-to-album", currentAlbum.id, newPhotos[i].id, i);
      }

      loadCurrentAlbum(currentAlbum.id);
    } else if (result.type === "ALBUM" && currentEvent) {
      const newAlbums = Array.from(currentEvent.albums);
      const [reorderedItem] = newAlbums.splice(result.source.index, 1);
      newAlbums.splice(result.destination.index, 0, reorderedItem);

      for (let i = 0; i < newAlbums.length; i++) {
        await window.electron.invoke("add-album-to-event", currentEvent.id, newAlbums[i].id, i);
      }

      loadCurrentEvent(currentEvent.id);
    }
  };

  const openClientWindow = () => {
    window.electron.send('open-client-window');
  };

  const renderGridView = () => (
    <div className="grid grid-cols-4 gap-4 mb-8">
      {photos.map((photo) => (
        <div key={photo.id} className="relative">
          <img
            src={`data:image/jpeg;base64,${photo.data}`}
            alt={photo.name}
            className="w-full h-48 object-cover"
          />
          <button
            onClick={() => currentAlbum && addPhotoToAlbum(currentAlbum.id, photo.id)}
            className="absolute bottom-2 right-2 bg-blue-500 text-white px-2 py-1 rounded"
            disabled={!currentAlbum}
          >
            Add to Album
          </button>
          <button
            onClick={() => deletePhoto(photo.id, photo.path)}
            className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );

  const renderTableView = () => (
    <table className="table-auto w-full mb-8">
      <thead>
        <tr>
          <th className="px-4 py-2">Name</th>
          <th className="px-4 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {photos.map((photo) => (
          <tr key={photo.id}>
            <td className="border px-4 py-2">{photo.name}</td>
            <td className="border px-4 py-2">
              <button
                onClick={() => currentAlbum && addPhotoToAlbum(currentAlbum.id, photo.id)}
                className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                disabled={!currentAlbum}
              >
                Add to Album
              </button>
              <button
                onClick={() => deletePhoto(photo.id, photo.path)}
                className="bg-red-500 text-white px-2 py-1 rounded"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderListView = () => (
    <div className="mb-8">
      {photos.map((photo) => (
        <div key={photo.id} className="flex items-center mb-4">
          <img
            src={`data:image/jpeg;base64,${photo.data}`}
            alt={photo.name}
            className="w-16 h-16 object-cover mr-4"
          />
          <span className="flex-1">{photo.name}</span>
          <button
            onClick={() => currentAlbum && addPhotoToAlbum(currentAlbum.id, photo.id)}
            className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
            disabled={!currentAlbum}
          >
            Add to Album
          </button>
          <button
            onClick={() => deletePhoto(photo.id, photo.path)}
            className="bg-red-500 text-white px-2 py-1 rounded"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <div className="flex justify-between items-center mb-4">
          <button onClick={selectFolder} className="bg-blue-500 text-white px-4 py-2 rounded">
            Select Folder
          </button>
          <button onClick={openClientWindow} className="bg-green-500 text-white px-4 py-2 rounded">
            Open Client Window
          </button>
          <button onClick={() => setShowPurchaseManager(!showPurchaseManager)} className="bg-purple-500 text-white px-4 py-2 rounded">
            {showPurchaseManager ? "Hide Purchase Manager" : "Show Purchase Manager"}
          </button>
        </div>

        {showPurchaseManager && <PurchaseManager />}

        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setViewMode("grid")} className="bg-gray-300 text-black px-4 py-2 rounded mr-2">
            Grid View
          </button>
          <button onClick={() => setViewMode("table")} className="bg-gray-300 text-black px-4 py-2 rounded mr-2">
            Table View
          </button>
          <button onClick={() => setViewMode("list")} className="bg-gray-300 text-black px-4 py-2 rounded">
            List View
          </button>
        </div>

        {viewMode === "grid" && renderGridView()}
        {viewMode === "table" && renderTableView()}
        {viewMode === "list" && renderListView()}

        {/* Albums section */}
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Albums</h2>
          <input
            type="text"
            placeholder="New album name"
            className="border p-2 mr-2"
            onKeyPress={(e) => e.key === "Enter" && createAlbum(e.target.value)}
          />
          {albums.map((album) => (
            <div key={album.id} className="inline-block mr-2 mb-2">
              <button
                onClick={() => loadCurrentAlbum(album.id)}
                className={`px-2 py-1 rounded ${
                  currentAlbum?.id === album.id ? "bg-blue-500 text-white" : "bg-gray-200"
                }`}
              >
                {album.name} ({album.photo_count})
              </button>
              <button onClick={() => deleteAlbum(album.id)} className="ml-1 text-red-500">
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Events section */}
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Events</h2>
          <input
            type="text"
            placeholder="New event name"
            className="border p-2 mr-2"
            onKeyPress={(e) => e.key === "Enter" && createEvent(e.target.value)}
          />
          {events.map((event) => (
            <div key={event.id} className="inline-block mr-2 mb-2">
              <button
                onClick={() => loadCurrentEvent(event.id)}
                className={`px-2 py-1 rounded ${
                  currentEvent?.id === event.id ? "bg-green-500 text-white" : "bg-gray-200"
                }`}
              >
                {event.name} ({event.album_count})
              </button>
              <button onClick={() => deleteEvent(event.id)} className="ml-1 text-red-500">
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Current Album section */}
        {currentAlbum && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-2">Current Album: {currentAlbum.name}</h2>
            <button
              onClick={() => currentEvent && addAlbumToEvent(currentEvent.id, currentAlbum.id)}
              className="bg-green-500 text-white px-2 py-1 rounded mr-2"
              disabled={!currentEvent}
            >
              Add to Event
            </button>
            <input
              type="text"
              placeholder="New album name"
              className="border p-2 mr-2"
              onKeyPress={(e) => e.key === "Enter" && renameAlbum(currentAlbum.id, e.target.value)}
            />
            <Droppable droppableId="albumPhotos" type="PHOTO">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-4 gap-4">
                  {currentAlbum.photos.map((photo, index) => (
                    <Draggable key={photo.id} draggableId={`photo-${photo.id}`} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="relative">
                          <img src={`data:image/jpeg;base64,${photo.data}`} alt={photo.name} className="w-full h-48 object-cover" />
                          <button
                            onClick={() => removePhotoFromAlbum(currentAlbum.id, photo.id)}
                            className="absolute bottom-2 right-2 bg-red-500 text-white px-2 py-1 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        )}

        {/* Current Event section */}
        {currentEvent && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-2">Current Event: {currentEvent.name}</h2>
            <input
              type="text"
              placeholder="New event name"
              className="border p-2 mr-2"
              onKeyPress={(e) => e.key === "Enter" && renameEvent(currentEvent.id, e.target.value)}
            />
            <Droppable droppableId="eventAlbums" type="ALBUM">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Albums in this event:</h3>
                  {currentEvent.albums.map((album, index) => (
                    <Draggable key={album.id} draggableId={`album-${album.id}`} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="inline-block mr-2 mb-2">
                          <span className="px-2 py-1 bg-gray-200 rounded">{album.name}</span>
                          <button onClick={() => removeAlbumFromEvent(currentEvent.id, album.id)} className="ml-1 text-red-500">
                            ×
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}

export default AdminDashboard;
