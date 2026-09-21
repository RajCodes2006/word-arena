import { Router } from 'express';
import { createRoom, createPlayerId, getRoom } from '../controllers/roomController.js';

const router = Router();

router.post('/', createRoom);
router.post('/player-id', createPlayerId);
router.get('/:roomId', getRoom);

export default router;
