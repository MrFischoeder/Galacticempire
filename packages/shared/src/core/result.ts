/** Outcome of validating or applying a command. Messages are English (shown in the UI). */
export interface CommandError {
  readonly code: string;
  readonly message: string;
}

export type Result = { readonly ok: true } | { readonly ok: false; readonly error: CommandError };

export const OK: Result = { ok: true };

export function fail(code: string, message: string): Result {
  return { ok: false, error: { code, message } };
}
