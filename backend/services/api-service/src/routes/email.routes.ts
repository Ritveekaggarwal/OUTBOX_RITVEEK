import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/async-handler';
import { idParamSchema, listEmailsQuerySchema, scheduleCampaignSchema, starSchema } from '../validators/schemas';

export function emailRoutes(controller: EmailController): Router {
  const router = Router();
  router.post('/schedule', validate({ body: scheduleCampaignSchema }), asyncHandler(controller.schedule));
  router.get('/', validate({ query: listEmailsQuerySchema }), asyncHandler(controller.list));
  router.get('/stats', asyncHandler(controller.stats));
  router.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.getById));
  router.patch('/:id/star', validate({ params: idParamSchema, body: starSchema }), asyncHandler(controller.setStarred));
  router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(controller.cancel));
  return router;
}
