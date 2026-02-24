import { io } from 'socket.io-client'

export const createForumSocket = (token) => {
  if (!token) return null

  return io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
    auth: { token },
    transports: ['websocket']
  })
}
