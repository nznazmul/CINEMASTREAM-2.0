import { Router } from 'express';
import { MediaController } from '../controllers/media.controller.js';
import { StreamController } from '../controllers/stream.controller.js';
import { UserController } from '../controllers/user.controller.js';
import { authenticateUser, optionalAuth, verifyStreamTokenMiddleware } from '../middleware/security.middleware.js';

const router = Router();

// Media & Discovery Routes
router.get('/hero', MediaController.getHero);
router.get('/trending', MediaController.getTrending);
router.get('/movies', MediaController.getMovies);
router.get('/tv', MediaController.getTVSeries);
router.get('/details/:id', MediaController.getDetails);
router.get('/tv/:id/season/:season', MediaController.getSeasonEpisodes);
router.get('/search', MediaController.search);
router.get('/genres', MediaController.getGenres);

// Streaming & Live TV Routes
router.get('/stream/resolve/:id', StreamController.resolve);
router.get('/stream/manifest', verifyStreamTokenMiddleware, StreamController.proxyManifest);
router.get('/stream/segment', verifyStreamTokenMiddleware, StreamController.proxySegment);
router.get('/livetv', StreamController.getLiveChannels);
router.get('/livetv/:id', StreamController.resolveLiveChannel);
router.get('/health', StreamController.getHealth);

// Auth & User State Routes
router.post('/auth/register', UserController.register);
router.post('/auth/login', UserController.login);
router.get('/auth/me', authenticateUser, UserController.getMe);
router.get('/user/history', optionalAuth, UserController.getHistory);
router.post('/user/progress', optionalAuth, UserController.saveProgress);
router.get('/user/bookmarks', optionalAuth, UserController.getBookmarks);
router.post('/user/bookmarks/toggle', optionalAuth, UserController.toggleBookmark);

export default router;
