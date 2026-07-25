/**
 * Platform Super Admin identity & safeguards.
 * Access is email-allowlist based (PLATFORM_ADMIN_EMAILS + defaults).
 * The default Super Admin must never be deleted or deactivated by accident.
 */

export const DEFAULT_SUPER_ADMIN_EMAIL = 'jagdish.parmar@coldverse.in';

/** Emails that cannot be deleted / deactivated via platform tooling. */
export const PROTECTED_SUPER_ADMIN_EMAILS = [
  DEFAULT_SUPER_ADMIN_EMAIL,
] as const;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isProtectedSuperAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return PROTECTED_SUPER_ADMIN_EMAILS.some((e) => e === normalized);
}

/**
 * Merge env allowlist with the baked-in default Super Admin.
 * Env can add more platform admins; it cannot remove the default.
 */
export function resolvePlatformAdminEmails(envList: readonly string[]) {
  const set = new Set(envList.map(normalizeEmail).filter(Boolean));
  set.add(DEFAULT_SUPER_ADMIN_EMAIL);
  return [...set];
}

export function assertNotProtectedSuperAdmin(
  email: string,
  action = 'modify',
): void {
  if (isProtectedSuperAdminEmail(email)) {
    throw new Error(
      `Cannot ${action} the default Super Admin account (${DEFAULT_SUPER_ADMIN_EMAIL}).`,
    );
  }
}
