import type { Response } from "express";
import { z } from "zod";

/** Sends the API's standard error shape: { error: { code, message } }. */
export function sendError(res: Response, status: number, code: string, message: string) {
  res.status(status).json({ error: { code, message } });
}

/** 400 response listing the message for each invalid field. */
export function validationError(error: z.ZodError) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: "Please fix the highlighted fields.",
      fields: z.flattenError(error).fieldErrors,
    },
  };
}
