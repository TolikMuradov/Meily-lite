import { createStorage } from './StorageProvider';
import remoteProvider from './remoteProvider';
import localProvider from './localProvider';

const MODE = import.meta.env.VITE_STORAGE_MODE || 'remote';
const provider = MODE === 'local' ? localProvider : remoteProvider;

export const storageMode = MODE;
export const storage = createStorage(provider);
