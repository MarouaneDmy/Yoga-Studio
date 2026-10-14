import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json({ status: "error", message: err.message });
  }

  if (err.code === "P2025") {
    return res
      .status(404)
      .json({ status: "error", message: "Ressource non trouvée." });
  }

  console.error("ERROR :", err);
  return res
    .status(500)
    .json({ status: "error", message: "Une erreur interne est survenue." });
};
