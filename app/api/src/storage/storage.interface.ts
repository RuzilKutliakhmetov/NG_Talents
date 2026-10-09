import { Readable } from 'node:stream';

export type StorageObjectBody = Uint8Array | Readable;

export interface StoragePort {
  putObject(
    key: string,
    body: StorageObjectBody,
    contentType: string,
    contentLength?: number,
  ): Promise<void>;
  getObject(key: string): Promise<Uint8Array>;
  deleteObject(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  createDownloadUrl(key: string, expiresIn?: number): Promise<string>;
  checkHealth(): Promise<void>;
}
