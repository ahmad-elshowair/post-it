import { Router } from 'express';
import authController from '../../controllers/auth.controller.js';
import authorizeUser from '../../middlewares/auth.js';
import { validationMiddleware } from '../../middlewares/validation.js';
import { loginValidation, registerValidation } from '../../middlewares/validations/userAuth.js';

const authRouter = Router();

authRouter.post('/register', registerValidation, validationMiddleware, authController.register);

authRouter.post('/login', loginValidation, validationMiddleware, authController.login);

authRouter.post('/refresh-token', authController.refreshToken);
authRouter.post('/logout', authorizeUser, authController.logout);
authRouter.get('/is-authenticated', authorizeUser, authController.checkAuthStatus);
export default authRouter;
