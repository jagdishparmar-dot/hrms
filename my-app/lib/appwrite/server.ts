import { Client, Account, Databases, Teams, Users } from 'node-appwrite';

import { appwriteConfig } from '@/lib/appwrite/config';

export function createAdminClient() {
  if (!appwriteConfig.apiKey) {
    throw new Error('APPWRITE_API_KEY is missing in .env.local');
  }

  const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId)
    .setKey(appwriteConfig.apiKey);

  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    teams: new Teams(client),
    users: new Users(client),
  };
}

export function createSessionClient(sessionSecret: string) {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId)
    .setSession(sessionSecret);

  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    teams: new Teams(client),
  };
}
