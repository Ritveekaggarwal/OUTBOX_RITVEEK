import { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma, Logger } from '@reachinbox/shared';
import { AppError } from '../utils/app-error';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.path} not found`));
};

export const createErrorHandler =
  (logger: Logger): ErrorRequestHandler =>
  (error, _req, res, _next) => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message, details: error.details } });
      return;
    }

    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues[0]?.message ?? 'Invalid request',
          details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
        },
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Resource already exists' } });
      return;
    }

    if (error?.type === 'entity.too.large') {
      res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
      return;
    }

    logger.error({ err: error }, 'Unhandled error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  };
