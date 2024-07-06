const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const isDev = require('electron-is-dev');
const Database = require('better-sqlite3');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

function createClientWindow() {
  let clientWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  const clientUrl = isDev
    ? 'http://localhost:3000/#/client'
    : `file://${path.join(__dirname, '../build/index.html')}#/client`;

  clientWindow.loadURL(clientUrl);

  if (isDev) {
    clientWindow.webContents.openDevTools();
  }

  clientWindow.on('closed', () => {
    clientWindow = null;
  });
}


app.whenReady().then(() => {
  createWindow();
  initDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Add a new IPC handler for opening the client window
ipcMain.on('open-client-window', () => {
  createClientWindow();
});

function initDatabase() {
  console.log("Initializing DB: ", app.getPath('userData'));
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'photomanager.sqlite');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS album_photos (
      album_id INTEGER,
      photo_id INTEGER,
      order_index INTEGER,
      FOREIGN KEY (album_id) REFERENCES albums (id) ON DELETE CASCADE,
      FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE,
      PRIMARY KEY (album_id, photo_id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS event_albums (
      event_id INTEGER,
      album_id INTEGER,
      order_index INTEGER,
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
      FOREIGN KEY (album_id) REFERENCES albums (id) ON DELETE CASCADE,
      PRIMARY KEY (event_id, album_id)
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_ids TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// IPC handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('read-directory', async (event, folderPath) => {
  const files = await fs.readdir(folderPath);
  return files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
  });
});

ipcMain.handle('read-file', async (event, filePath) => {
  const data = await fs.readFile(filePath);
  return data.toString('base64');
});

ipcMain.handle('add-photo', async (event, name, sourcePath) => {
  const userDataPath = app.getPath('userData');
  const photosDir = path.join(userDataPath, 'photos');
  
  // Create the photos directory if it doesn't exist
  await fs.mkdir(photosDir, { recursive: true });

  const destPath = path.join(photosDir, name);
  
  // Copy the file to the app's data directory
  await fs.copyFile(sourcePath, destPath);

  const stmt = db.prepare('INSERT OR IGNORE INTO photos (name, path) VALUES (?, ?)');
  const result = stmt.run(name, destPath);
  return result.lastInsertRowid;
});

ipcMain.handle('get-photos', async () => {
  const stmt = db.prepare('SELECT * FROM photos ORDER BY created_at DESC');
  const photos = stmt.all();

  // Read the file data for each photo
  const photosWithData = await Promise.all(photos.map(async (photo) => {
    const data = await fs.readFile(photo.path);
    return { ...photo, data: data.toString('base64') };
  }));

  return photosWithData;
});

ipcMain.handle('delete-photo', async (event, photoId, filePath) => {
  const stmt = db.prepare('DELETE FROM photos WHERE id = ?');
  stmt.run(photoId);
  
  // Delete the file from the app's data directory
  await fs.unlink(filePath).catch(console.error);
  return true;
});

ipcMain.handle('create-album', (event, name) => {
  const stmt = db.prepare('INSERT INTO albums (name) VALUES (?)');
  const result = stmt.run(name);
  return result.lastInsertRowid;
});

ipcMain.handle('get-albums', () => {
  const stmt = db.prepare(`
    SELECT albums.*, COUNT(album_photos.photo_id) as photo_count
    FROM albums
    LEFT JOIN album_photos ON albums.id = album_photos.album_id
    GROUP BY albums.id
    ORDER BY albums.created_at DESC
  `);
  return stmt.all();
});

ipcMain.handle('get-album-photos', async (event, albumId) => {
  const stmt = db.prepare(`
    SELECT photos.*, album_photos.order_index
    FROM photos
    JOIN album_photos ON photos.id = album_photos.photo_id
    WHERE album_photos.album_id = ?
    ORDER BY album_photos.order_index
  `);
  const photos = stmt.all(albumId);

  // Read the file data for each photo
  const photosWithData = await Promise.all(photos.map(async (photo) => {
    const data = await fs.readFile(photo.path);
    return { ...photo, data: data.toString('base64') };
  }));

  return photosWithData;
});


ipcMain.handle('add-photo-to-album', (event, albumId, photoId, orderIndex) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO album_photos (album_id, photo_id, order_index) VALUES (?, ?, ?)');
  stmt.run(albumId, photoId, orderIndex);
  return true;
});

ipcMain.handle('remove-photo-from-album', (event, albumId, photoId) => {
  const stmt = db.prepare('DELETE FROM album_photos WHERE album_id = ? AND photo_id = ?');
  stmt.run(albumId, photoId);
  return true;
});

ipcMain.handle('delete-album', (event, albumId) => {
  const stmt = db.prepare('DELETE FROM albums WHERE id = ?');
  stmt.run(albumId);
  return true;
});

ipcMain.handle('rename-album', (event, albumId, newName) => {
  const stmt = db.prepare('UPDATE albums SET name = ? WHERE id = ?');
  stmt.run(newName, albumId);
  return true;
});

ipcMain.handle('create-event', (event, name) => {
  const stmt = db.prepare('INSERT INTO events (name) VALUES (?)');
  const result = stmt.run(name);
  return result.lastInsertRowid;
});

ipcMain.handle('get-events', () => {
  const stmt = db.prepare(`
    SELECT events.*, COUNT(event_albums.album_id) as album_count
    FROM events
    LEFT JOIN event_albums ON events.id = event_albums.event_id
    GROUP BY events.id
    ORDER BY events.created_at DESC
  `);
  return stmt.all();
});

ipcMain.handle('get-event-albums', async (event, eventId) => {
  const stmt = db.prepare(`
    SELECT albums.*, event_albums.order_index
    FROM albums
    JOIN event_albums ON albums.id = event_albums.album_id
    WHERE event_albums.event_id = ?
    ORDER BY event_albums.order_index
  `);
  const albums = stmt.all(eventId);

  // Get the first photo for each album as a cover
  const albumsWithCover = await Promise.all(albums.map(async (album) => {
    const coverPhotoStmt = db.prepare(`
      SELECT photos.*
      FROM photos
      JOIN album_photos ON photos.id = album_photos.photo_id
      WHERE album_photos.album_id = ?
      ORDER BY album_photos.order_index
      LIMIT 1
    `);
    const coverPhoto = coverPhotoStmt.get(album.id);

    if (coverPhoto) {
      const data = await fs.readFile(coverPhoto.path);
      return { ...album, coverPhoto: { ...coverPhoto, data: data.toString('base64') } };
    }
    return album;
  }));

  return albumsWithCover;
});

ipcMain.handle('add-album-to-event', (event, eventId, albumId, orderIndex) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO event_albums (event_id, album_id, order_index) VALUES (?, ?, ?)');
  stmt.run(eventId, albumId, orderIndex);
  return true;
});

ipcMain.handle('remove-album-from-event', (event, eventId, albumId) => {
  const stmt = db.prepare('DELETE FROM event_albums WHERE event_id = ? AND album_id = ?');
  stmt.run(eventId, albumId);
  return true;
});

ipcMain.handle('delete-event', (event, eventId) => {
  const stmt = db.prepare('DELETE FROM events WHERE id = ?');
  stmt.run(eventId);
  return true;
});

ipcMain.handle('rename-event', (event, eventId, newName) => {
  const stmt = db.prepare('UPDATE events SET name = ? WHERE id = ?');
  stmt.run(newName, eventId);
  return true;
});

ipcMain.handle('create-purchase', (event, photoIds) => {
  const stmt = db.prepare('INSERT INTO purchases (photo_ids, status) VALUES (?, ?)');
  const result = stmt.run(JSON.stringify(photoIds), 'pending');
  return result.lastInsertRowid;
});

// Add a new IPC handler for updating purchase status
ipcMain.handle('update-purchase-status', (event, purchaseId, newStatus) => {
  const stmt = db.prepare('UPDATE purchases SET status = ? WHERE id = ?');
  const result = stmt.run(newStatus, purchaseId);
  return result.changes > 0;
});

// Update the get-purchases handler to include status
ipcMain.handle('get-purchases', () => {
  const stmt = db.prepare('SELECT * FROM purchases ORDER BY created_at DESC');
  return stmt.all();
});

ipcMain.handle('get-purchase-photos', async (event, purchaseId) => {
  const stmt = db.prepare('SELECT photo_ids FROM purchases WHERE id = ?');
  const purchase = stmt.get(purchaseId);
  const photoIds = JSON.parse(purchase.photo_ids);
  
  const photoStmt = db.prepare('SELECT * FROM photos WHERE id IN (' + photoIds.map(() => '?').join(',') + ')');
  const photos = photoStmt.all(...photoIds);

  // Read the file data for each photo
  const photosWithData = await Promise.all(photos.map(async (photo) => {
    const data = await fs.readFile(photo.path);
    return { ...photo, data: data.toString('base64') };
  }));

  return photosWithData;
});
