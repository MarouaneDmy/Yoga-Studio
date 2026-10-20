import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { catchAsync } from "./catchAsync";

const makeArgs = () => ({
  req: {} as Request,
  res: {} as Response,
  next: vi.fn() as unknown as NextFunction,
});

describe("catchAsync", () => {
  it("appelle le handler avec req, res et next", async () => {
    const { req, res, next } = makeArgs();
    const handler = vi.fn().mockResolvedValue(undefined);

    catchAsync(handler)(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
  });

  it("n'appelle pas next quand le handler réussit", async () => {
    const { req, res, next } = makeArgs();
    const handler = vi.fn().mockResolvedValue("ok");

    catchAsync(handler)(req, res, next);
    await Promise.resolve();

    expect(next).not.toHaveBeenCalled();
  });

  it("transmet à next l'erreur d'un handler asynchrone qui échoue", async () => {
    const { req, res, next } = makeArgs();
    const error = new Error("async failure");
    const handler = vi.fn().mockRejectedValue(error);

    catchAsync(handler)(req, res, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(error));
  });

  // Documente une limite actuelle : une exception SYNCHRONE levée avant tout
  // await n'est pas captée (fn(...) est évalué avant Promise.resolve).
  // Sans impact avec des controllers async, mais bon à savoir.
  it("ne capte pas une exception synchrone du handler", () => {
    const { req, res, next } = makeArgs();
    const handler = () => {
      throw new Error("sync failure");
    };

    expect(() => catchAsync(handler)(req, res, next)).toThrow("sync failure");
    expect(next).not.toHaveBeenCalled();
  });
});
