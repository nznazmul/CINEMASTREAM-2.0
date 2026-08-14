import { db } from '../models/db.js';
import { SecurityService } from '../services/security.service.js';

export class UserController {
  /**
   * Register new user account
   */
  static async register(req, res) {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const existing = db.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const passwordHash = await SecurityService.hashPassword(password);
      const user = db.createUser({ username, email, passwordHash });
      const token = SecurityService.generateAuthToken(user);

      res.status(201).json({
        success: true,
        token,
        user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * User login
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const user = db.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isMatch = await SecurityService.comparePassword(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = SecurityService.generateAuthToken(user);
      res.json({
        success: true,
        token,
        user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get Current User Profile
   */
  static async getMe(req, res) {
    try {
      const user = db.findUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get Watch History
   */
  static async getHistory(req, res) {
    try {
      const userId = req.user?.id || req.query.guestId || 'guest_default';
      const history = db.getHistory(userId);
      res.json({ success: true, results: history });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Save Video Playback Progress (Resume feature)
   */
  static async saveProgress(req, res) {
    try {
      const userId = req.user?.id || req.body.guestId || 'guest_default';
      const record = db.saveProgress(userId, req.body);
      res.json({ success: true, data: record });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get Saved Bookmarks / Watchlist
   */
  static async getBookmarks(req, res) {
    try {
      const userId = req.user?.id || req.query.guestId || 'guest_default';
      const bookmarks = db.getBookmarks(userId);
      res.json({ success: true, results: bookmarks });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Toggle Bookmark
   */
  static async toggleBookmark(req, res) {
    try {
      const userId = req.user?.id || req.body.guestId || 'guest_default';
      const result = db.toggleBookmark(userId, req.body);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}
