import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
        ? authHeader.substring('Bearer '.length)
        : req.cookies?.token;

    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
        // Fix: Use _id to match Mongoose document structure, also keep id for compatibility if needed
        req.user = { _id: payload.id, id: payload.id, email: payload.email, name: payload.name, username: payload.name };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

export function issueJwt(user) {
    const payload = { id: user._id, email: user.email, name: user.name };
    return jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
}
