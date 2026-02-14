import GeminiLiveService from '../services/geminiLiveService.js';

const rooms = new Map(); // roomId -> Set(socketId)
const userBySocketId = new Map(); // socketId -> { name }
const geminiSessions = new Map(); // socketId -> GeminiLiveService instance

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    // Join room event - this is what the client sends
    socket.on('join-room', (roomId) => {
      if (!roomId) return;
      console.log(`User ${socket.id} joining room ${roomId}`);

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());

      // Add user to room
      rooms.get(roomId).add(socket.id);
      socket.join(roomId);

      // Get all other users in the room
      const otherUsers = Array.from(rooms.get(roomId)).filter(id => id !== socket.id);

      // Notify existing members that a new user joined
      if (otherUsers.length > 0) {
        socket.to(roomId).emit('user-joined', socket.id);
        console.log(`Notified ${otherUsers.length} users in room ${roomId} that ${socket.id} joined`);
      }

      // Notify the joining user about existing users
      otherUsers.forEach(userId => {
        socket.emit('user-joined', userId);
        console.log(`Notified ${socket.id} about existing user ${userId}`);
      });
    });

    socket.on('join', ({ roomId, user }) => {
      if (!roomId) return;
      if (!rooms.has(roomId)) rooms.set(roomId, new Set());

      // Attach user metadata
      if (user && typeof user === 'object') {
        userBySocketId.set(socket.id, { name: user.name || 'Guest' });
      } else {
        userBySocketId.set(socket.id, { name: 'Guest' });
      }

      // Notify the joining client about current room members (with metadata) before adding them
      const existing = Array.from(rooms.get(roomId)).map((sid) => ({ socketId: sid, user: userBySocketId.get(sid) }));
      if (existing.length > 0) {
        socket.emit('existing-peers', { peers: existing });
      }

      rooms.get(roomId).add(socket.id);
      socket.join(roomId);

      // Notify others about the new joiner
      socket.to(roomId).emit('user-joined', { socketId: socket.id, user: userBySocketId.get(socket.id) });
    });

    // WebRTC signaling events expected by current clients
    socket.on('offer', ({ offer, to }) => {
      if (!to || !offer) return;
      io.to(to).emit('offer', { offer, from: socket.id });
    });

    socket.on('answer', ({ answer, to }) => {
      if (!to || !answer) return;
      io.to(to).emit('answer', { answer, from: socket.id });
    });

    socket.on('ice-candidate', ({ candidate, to }) => {
      if (!to || !candidate) return;
      io.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });

    socket.on('signal', ({ roomId, to, data }) => {
      if (!roomId || !to) return;
      io.to(to).emit('signal', { from: socket.id, data });
    });

    socket.on('leave', ({ roomId }) => {
      if (!roomId) return;
      socket.leave(roomId);
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(socket.id);
        // Notify in both formats for compatibility
        socket.to(roomId).emit('user-left', { socketId: socket.id });
        socket.to(roomId).emit('user-left', socket.id);
      }
      userBySocketId.delete(socket.id);

      // Cleanup Gemini session
      if (geminiSessions.has(socket.id)) {
        geminiSessions.get(socket.id).disconnect();
        geminiSessions.delete(socket.id);
      }
    });

    socket.on('disconnect', () => {
      for (const [roomId, members] of rooms.entries()) {
        if (members.has(socket.id)) {
          console.log(`User ${socket.id} disconnected from room ${roomId}`);
          members.delete(socket.id);
          // Notify in both formats for compatibility
          socket.to(roomId).emit('user-left', { socketId: socket.id });
          socket.to(roomId).emit('user-left', socket.id);
          console.log(`Notified room ${roomId} that ${socket.id} left`);
        }
        if (members.size === 0) rooms.delete(roomId);
      }
      userBySocketId.delete(socket.id);

      // Cleanup Gemini session
      if (geminiSessions.has(socket.id)) {
        geminiSessions.get(socket.id).disconnect();
        geminiSessions.delete(socket.id);
      }
    });

    socket.on('media-state', ({ roomId, micOn, camOn }) => {
      if (!roomId) return;
      socket.to(roomId).emit('media-state', { socketId: socket.id, micOn, camOn });
    });

    // Chat message handling
    socket.on('chat-message', ({ roomId, message, sender }) => {
      if (!roomId || !message) return;
      // Broadcast chat message to all other users in the room
      socket.to(roomId).emit('chat-message', { message, sender });
      console.log(`Broadcasting chat message: "${message}" from ${sender} in room ${roomId}`);
    });

    // Speech translation handling
    socket.on('speech-translation', (data) => {
      console.log(`🔊 Received speech translation from ${socket.id}:`, data);

      // Find which room this socket is in
      let targetRoom = null;
      for (const [roomId, members] of rooms.entries()) {
        if (members.has(socket.id)) {
          targetRoom = roomId;
          break;
        }
      }

      if (targetRoom) {
        // Broadcast to ALL users in the room (including sender for debugging)
        // The client will filter out messages from itself
        io.to(targetRoom).emit('speech-translation', data);
        console.log(`🔊 Broadcasting speech translation to room ${targetRoom} (${rooms.get(targetRoom)?.size || 0} users):`, data.text);

        // Log all users in the room for debugging
        const roomMembers = Array.from(rooms.get(targetRoom) || []);
        console.log(`🔊 Room ${targetRoom} members:`, roomMembers);
      } else {
        console.log(`❌ Socket ${socket.id} not found in any room`);
      }
    });

    // Sign language animation broadcasting events - OPTIMIZED FOR ZERO DELAY
    socket.on('broadcast-sign-language', ({ roomId, text, sender, timestamp }) => {
      if (!roomId || !text) return;
      // Immediate broadcast with timestamp for perfect sync
      // Use io.to() to send to ALL clients including sender, client logic handles self-exclusion if needed
      io.to(roomId).emit('broadcast-sign-language', { text, sender, timestamp, senderSocketId: socket.id });
      // Minimal logging to avoid delays
      console.log(`🚀 ZERO-DELAY: "${text}" from ${sender} in ${roomId}`);
    });

    socket.on('broadcast-animation-complete', ({ roomId, timestamp }) => {
      if (!roomId) return;
      // Immediate broadcast completion
      socket.to(roomId).emit('broadcast-animation-complete', { timestamp });
      console.log(`✅ Animation complete in ${roomId}`);
    });

    socket.on('broadcast-tts', ({ roomId, text, senderId }) => {
      if (!roomId || !text) return;
      socket.to(roomId).emit('broadcast-tts', { text, senderId });
      console.log(`🔊 TTS: "${text}" from ${senderId} in ${roomId}`);
    });

    // Handle shared transcription state toggle
    socket.on('toggle-transcription', ({ roomId, enabled }) => {
      if (roomId === undefined || enabled === undefined) return;
      console.log(`🎤 Transcription toggled to ${enabled} in room ${roomId} by ${socket.id}`);
      // Broadcast to ALL users in the room (including sender) to sync state
      io.to(roomId).emit('transcription-state', { enabled });
    });

    // --- GEMINI LIVE STREAM HANDLERS ---
    // --- Gemini Batch Recording Mode ---
    socket.on('analyze-sign-sequence', async (data) => {
      // data: { frames: string[] }
      if (!data?.frames || data.frames.length === 0) return;

      try {
        console.log(`📥 Received ${data.frames.length} frames from ${socket.id} for analysis`);

        // Dynamic import to avoid circular dependency issues if any
        const { default: geminiBatchService } = await import('../services/geminiBatchService.js');

        const text = await geminiBatchService.analyzeSequence(data.frames);

        if (text) {
          socket.emit('gemini-response', { text: text.trim() });
        }
      } catch (error) {
        console.error('Batch Analysis Failed:', error.message);
        if (error.message === 'QUOTA_EXCEEDED') {
          socket.emit('gemini-error', {
            type: 'QUOTA_EXCEEDED',
            message: 'Daily AI limit reached. Please wait or try again later.'
          });
        } else {
          socket.emit('gemini-error', { message: 'Failed to analyze signs.' });
        }
      }
    });

    // --- GEMINI LIVE STREAM HANDLERS (Real-Time Paid Tier) ---
    socket.on('start-gemini-stream', ({ roomId }) => {
      if (geminiSessions.has(socket.id)) return; // Already connected
      console.log(`🚀 Client ${socket.id} starting Gemini Live Stream (Real-Time) in Room: ${roomId}`);
      const service = new GeminiLiveService(socket, roomId);
      service.connect();
      geminiSessions.set(socket.id, service);
    });

    socket.on('gemini-stream-data', (data) => {
      // Chunk format: { mimeType, data }
      const service = geminiSessions.get(socket.id);
      if (service) {
        console.log('.'); // Debug pulse
        service.send(data);
      } else {
        // console.warn('⚠️ Received frame but no Gemini service active for:', socket.id);
      }
    });

    socket.on('stop-gemini-stream', () => {
      if (geminiSessions.has(socket.id)) {
        console.log(`🛑 Client ${socket.id} stopping Gemini Live Stream`);
        geminiSessions.get(socket.id).disconnect();
        geminiSessions.delete(socket.id);
      }
    });
  });
}
