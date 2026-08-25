/** AI features are available to all authenticated teachers (subscription still required). */
export function canUseAi(_profile?: {
  id?: number | string | null;
  user_id?: number | string | null;
} | null): boolean {
  return true;
}
