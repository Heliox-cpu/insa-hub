/**
 * Types pour le Coffre-Fort Chiffré Local (Web Crypto AES-GCM + IndexedDB)
 * Conforme au contrat PROJECT.md et aux exigences R2.
 */

export interface EncryptedPayload {
  saltHex: string; // Sel PBKDF2 (16 octets = 32 caractères hexadécimaux)
  ivHex: string; // Vecteur d'initialisation AES-GCM (12 octets = 24 caractères hexadécimaux)
  ciphertextHex: string; // Données chiffrées + tag d'authentification
  tagLength: number; // Taille du tag d'intégrité en bits (128)
  algorithm?: 'AES-GCM';
  iterations?: number; // Nombre d'itérations PBKDF2 (100 000)
  version?: number; // Version de schéma (ex: 1)
}

export interface VaultMetadata {
  lastUpdated: string;
  studentNumberHash: string;
  dataVersion: number;
}

export interface VaultDataContainer<T> {
  version: number;
  createdAt: string;
  data: T;
}

export interface VaultStorage {
  saveEncryptedRecord(record: EncryptedPayload): Promise<void>;
  loadEncryptedRecord(): Promise<EncryptedPayload | null>;
  clearVault(): Promise<void>;
  hasEncryptedRecord(): Promise<boolean>;
}
