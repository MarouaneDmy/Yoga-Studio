import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { catchAsync } from "../utils/catchAsync";

export class AuthController {
  login = catchAsync(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const response = await authService.login(email, password);
    res.status(200).json(response);
  });

  register = catchAsync(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName } = req.body;

    const response = await authService.register(
      email,
      password,
      firstName,
      lastName,
    );
    res.status(201).json(response);
  });
}

export const authController = new AuthController();
