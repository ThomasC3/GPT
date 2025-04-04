import express from 'express';

import {
  v1 as routerV1
} from '../routers/driver';


import { bodyParserJson, enableCORS, allowMethods } from '../middlewares';
import { expressLogger } from '../services/logging';

const router = express.Router();

// Config
router.use(bodyParserJson);
router.use(enableCORS);
router.use(allowMethods);

router.use(expressLogger);

// Routers
router.use('/v1', routerV1);

export default router;
