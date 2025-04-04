import express from 'express';

import {
  v1 as routerV1
} from '../routers/admin';

import {
  bodyParser, bodyParserJson, enableCORS, allowMethods, sessions
} from '../middlewares';
import { expressLogger } from '../services/logging';

const router = express.Router();

// Config
router.use(sessions);
router.use(bodyParserJson);
router.use(bodyParser);
router.use(enableCORS);
router.use(allowMethods);

router.use(expressLogger);

// Routers
router.use('/v1', routerV1);

export default router;
