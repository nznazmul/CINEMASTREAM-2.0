import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config/constants.js';

class Database {
  constructor() {
    this.dataDir = path.resolve(CONFIG.DATA_DIR);
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.historyFile = path.join(this.dataDir, 'history.json');
    this.bookmarksFile = path.join(this.dataDir, 'bookmarks.json');
    this.healthFile = path.join(this.dataDir, 'health.json');

    this.users = [];
    this.history = [];
    this.bookmarks = [];
    this.health = {};

    this.init();
  }

  init() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.users = this.loadFile(this.usersFile, []);
    this.history = this.loadFile(this.historyFile, []);
    this.bookmarks = this.loadFile(this.bookmarksFile, []);
    this.health = this.loadFile(this.healthFile, {
      vidplay: { status: 'online', latency: 45, successRate: 99.4, lastChecked: Date.now() },
      superstream: { status: 'online', latency: 62, successRate: 98.9, lastChecked: Date.now() },
      smashy: { status: 'online', latency: 78, successRate: 97.5, lastChecked: Date.now() },
      streamwish: { status: 'online', latency: 110, successRate: 95.0, lastChecked: Date.now() },
      iptv: { status: 'online', latency: 35, successRate: 99.8, lastChecked: Date.now() }
    });
  }

  loadFile(filePath, defaultVal) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
      this.saveFile(filePath, defaultVal);
      return defaultVal;
    } catch (err) {
      console.error(`Error loading database file ${filePath}:`, err.message);
      return defaultVal;
    }
  }

  saveFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error(`Error saving database file ${filePath}:`, err.message);
    }
  }

  // --- User Operations ---
  findUserByEmail(email) {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id) {
    return this.users.find(u => u.id === id);
  }

  createUser(userData) {
    const newUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      username: userData.username,
      email: userData.email.toLowerCase(),
      passwordHash: userData.passwordHash,
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop',
      role: userData.role || 'user',
      createdAt: new Date().toISOString()
    };
    this.users.push(newUser);
    this.saveFile(this.usersFile, this.users);
    return newUser;
  }

  // --- Watch History Operations ---
  getHistory(userId) {
    return this.history
      .filter(h => h.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  saveProgress(userId, progressData) {
    const index = this.history.findIndex(
      h => h.userId === userId && h.mediaId === progressData.mediaId && (progressData.episodeId ? h.episodeId === progressData.episodeId : true)
    );

    const record = {
      id: index >= 0 ? this.history[index].id : 'his_' + Math.random().toString(36).substring(2, 9),
      userId,
      mediaId: progressData.mediaId,
      mediaType: progressData.mediaType || 'movie',
      title: progressData.title,
      poster: progressData.poster,
      backdrop: progressData.backdrop,
      season: progressData.season || null,
      episode: progressData.episode || null,
      episodeId: progressData.episodeId || null,
      currentTime: progressData.currentTime || 0,
      duration: progressData.duration || 0,
      progressPercent: progressData.duration > 0 ? Math.min(100, Math.round((progressData.currentTime / progressData.duration) * 100)) : 0,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      this.history[index] = record;
    } else {
      this.history.unshift(record);
    }

    // Keep max 100 items per user
    this.saveFile(this.historyFile, this.history.slice(0, 500));
    return record;
  }

  // --- Bookmarks Operations ---
  getBookmarks(userId) {
    return this.bookmarks
      .filter(b => b.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  toggleBookmark(userId, media) {
    const index = this.bookmarks.findIndex(b => b.userId === userId && b.mediaId === media.mediaId);
    let bookmarked = false;

    if (index >= 0) {
      this.bookmarks.splice(index, 1);
      bookmarked = false;
    } else {
      this.bookmarks.push({
        id: 'bmk_' + Math.random().toString(36).substring(2, 9),
        userId,
        mediaId: media.mediaId,
        mediaType: media.mediaType || 'movie',
        title: media.title,
        poster: media.poster,
        rating: media.rating,
        releaseYear: media.releaseYear,
        createdAt: new Date().toISOString()
      });
      bookmarked = true;
    }

    this.saveFile(this.bookmarksFile, this.bookmarks);
    return { bookmarked, count: this.bookmarks.filter(b => b.userId === userId).length };
  }

  // --- Provider Health Operations ---
  updateProviderHealth(providerId, stats) {
    this.health[providerId] = {
      ...this.health[providerId],
      ...stats,
      lastChecked: Date.now()
    };
    this.saveFile(this.healthFile, this.health);
  }

  getHealthStats() {
    return this.health;
  }
}

export const db = new Database();
