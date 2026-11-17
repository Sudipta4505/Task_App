import { verifyFirebaseToken } from '../config/firebase.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing or invalid format. Please log in.'
      });
    }

    const token = authHeader.split('Bearer ')[1].trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'token is empty.'
      });
    }

    const user = await verifyFirebaseToken(token);

    if (!user || !user.uid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user session.'
      });
    }

    // Attach authenticated user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Error verifying token:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token.',
      error: error.message
    });
  }
};
