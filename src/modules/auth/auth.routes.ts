import { Router } from 'express';
import { z } from 'zod';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';

const router = Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

const signupSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    signupKey: z.string().optional(),
  }),
});

const forgotSchema = z.object({
  body: z.object({ email: z.string().email() }),
});

const resetSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    newPassword: z.string().min(6),
  }),
});

router.post('/login', validate(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post('/signup', validate(signupSchema), (req, res, next) => authController.signup(req, res, next));
router.post('/forgot-password', validate(forgotSchema), (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', validate(resetSchema), (req, res, next) => authController.resetPassword(req, res, next));

export default router;
