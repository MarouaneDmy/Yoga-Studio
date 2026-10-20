import { expect, vi, type Mock } from "vitest";
import { AppError } from "../utils/AppError";

// Vérifie le type de l'erreur, son status HTTP et son message
export const expectAppError = async (
  promise: Promise<unknown>,
  statusCode: number,
  message: string,
) => {
  await expect(promise).rejects.toBeInstanceOf(AppError);
  await expect(promise).rejects.toMatchObject({ statusCode, message });
};

// Fausse réponse Express : status() est chaînable avec json()
export const makeRes = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

type Handler = (req: any, res: any, next: any) => void;

/**
 * Exécute un handler enveloppé par catchAsync (qui ne retourne pas de promesse)
 * puis laisse la chaîne de promesses se terminer avant de rendre la main.
 */
export async function runHandler(
  handler: Handler,
  req: Record<string, unknown> = {},
) {
  const res = makeRes();
  const next = vi.fn();

  handler({ params: {}, body: {}, ...req }, res, next);
  await new Promise((resolve) => setImmediate(resolve));

  return { res, next };
}

// Vérifie que le controller a transmis une AppError à next()
export function expectNextAppError(
  next: Mock,
  statusCode: number,
  message: string,
) {
  expect(next).toHaveBeenCalledTimes(1);
  const error = next.mock.calls[0][0];
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ statusCode, message });
}
