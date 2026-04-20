export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

export function logSupabaseError(context: string, error: unknown) {
  console.error(`[Supabase] ${context}`, error);
}

export function throwSupabaseError(
  context: string,
  error: unknown,
  fallback = "Supabase request failed.",
): never {
  logSupabaseError(context, error);
  throw new Error(getErrorMessage(error, fallback));
}
