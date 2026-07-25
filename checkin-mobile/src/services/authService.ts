import type { Models } from 'react-native-appwrite';

import { account, ID } from '@/src/lib/appwrite';

export type AuthUser = Models.User<Models.Preferences>;

function toErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  try {
    await account.deleteSession('current');
  } catch {
    // No existing session.
  }

  await account.createEmailPasswordSession(email.trim(), password);
  return account.get();
}

export async function registerWithEmail(params: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthUser> {
  const email = params.email.trim();
  const name = params.name.trim();

  await account.create(ID.unique(), email, params.password, name);
  return loginWithEmail(email, params.password);
}

export async function logout(): Promise<void> {
  try {
    await account.deleteSession('current');
  } catch {
    // Already logged out.
  }
}

export { toErrorMessage };
