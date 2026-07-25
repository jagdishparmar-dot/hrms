import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import {
  Account,
  Client,
  Databases,
  ID,
  Permission,
  Query,
  Role,
} from 'react-native-appwrite';

import { AppwriteConfig } from '@/src/config/appwrite';

const client = new Client()
  .setEndpoint(AppwriteConfig.endpoint)
  .setProject(AppwriteConfig.projectId)
  .setPlatform(AppwriteConfig.platform);

export const appwriteClient = client;
export const account = new Account(client);
export const databases = new Databases(client);

export { AppwriteConfig, ID, Permission, Query, Role };
