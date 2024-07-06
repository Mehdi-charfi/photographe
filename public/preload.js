const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    ipcRenderer.send(channel, data)
  },
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args))
  },
  invoke: (channel, data) => {
    return ipcRenderer.invoke(channel, data)
  },
  removeListener: (channel, func) => {
    ipcRenderer.removeListener(channel, func)
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})
