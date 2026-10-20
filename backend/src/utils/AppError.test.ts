import { describe, expect, it } from "vitest";
import { AppError } from "./AppError";

describe("AppError", () => {
  it("expose le message, le statusCode et isOperational", () => {
    const error = new AppError("Not found", 404);

    expect(error.message).toBe("Not found");
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(true);
  });

  it("est une instance d'Error et d'AppError", () => {
    const error = new AppError("Boom", 500);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it("possède une stack trace contenant le message", () => {
    const error = new AppError("Boom", 500);

    expect(error.stack).toContain("Boom");
  });
});
