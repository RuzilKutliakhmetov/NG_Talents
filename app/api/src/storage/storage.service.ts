import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_PORT } from './storage.tokens.js';
import type { StorageObjectBody, StoragePort } from './storage.interface.js';

@Injectable()
export class StorageService implements StoragePort {
  constructor(@Inject(STORAGE_PORT) private readonly storage: StoragePort) {}

  putObject(
    key: string,
    body: StorageObjectBody,
    contentType: string,
    contentLength?: number,
  ) {
    return this.storage.putObject(key, body, contentType, contentLength);
  }

  getObject(key: string) {
    return this.storage.getObject(key);
  }

  deleteObject(key: string) {
    return this.storage.deleteObject(key);
  }

  exists(key: string) {
    return this.storage.exists(key);
  }

  createDownloadUrl(key: string, expiresIn?: number) {
    return this.storage.createDownloadUrl(key, expiresIn);
  }

  checkHealth() {
    return this.storage.checkHealth();
  }
}
