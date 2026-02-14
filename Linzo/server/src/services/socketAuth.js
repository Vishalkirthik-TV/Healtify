import jwt from 'jsonwebtoken';

export function requireSocketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token || null;
    if (!token) return next(); // allow anonymous for now, flip to error to force auth
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    socket.user = { id: payload.id, email: payload.email, name: payload.name };
    next();
  } catch (e) {
    // If you want to force auth: return next(new Error('Unauthorized'));
    next();
  }
}


