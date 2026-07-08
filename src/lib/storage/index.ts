import { StorageProvider } from "./StorageProvider";
import { LocalProvider } from "./LocalProvider";

let storageProvider: StorageProvider;

const providerType = process.env.STORAGE_PROVIDER || "local";

switch (providerType.toLowerCase()) {
  case "local":
  default:
    storageProvider = new LocalProvider();
    break;
  // Cloudinary, Supabase, R2, MinIO can be added here as classes when configured.
}

export { storageProvider };
export type { StorageProvider };
export { LocalProvider };
