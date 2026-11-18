/** Shared shape returned by admin Server Actions. */
export interface ActionState {
  error?: string;
  success?: string;
  redirectTo?: string;
  fieldErrors?: Record<string, string>;
}
