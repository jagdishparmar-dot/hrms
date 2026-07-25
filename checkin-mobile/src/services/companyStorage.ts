import * as SecureStore from 'expo-secure-store';

const COMPANY_ID_KEY = 'checkin_selected_company_id';

export async function getStoredCompanyId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(COMPANY_ID_KEY);
  } catch {
    return null;
  }
}

export async function setStoredCompanyId(companyId: string): Promise<void> {
  await SecureStore.setItemAsync(COMPANY_ID_KEY, companyId);
}

export async function clearStoredCompanyId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(COMPANY_ID_KEY);
  } catch {
    /* already cleared */
  }
}
