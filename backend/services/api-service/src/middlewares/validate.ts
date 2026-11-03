import { RequestHandler } from 'express';
import { AnyZodObject, ZodTypeAny } from 'zod';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

/** Parses and replaces req.body / req.query / req.params with their validated, typed values. */
export const validate =
  (schemas: ValidationSchemas): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (error) {
      next(error);
    }
  };
