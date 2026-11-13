import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import { StorageObjectBody, StoragePort } from './storage.interface.js';

export interface LocalStorageOptions {
  rootDir: string;
  publicBaseUrl: string;
  presignedUrlExpiresSeconds: number;
}

@Injectable()
export class LocalStorageAdapter implements StoragePort {
  constructor(private readonly options: LocalStorageOptions) {}

  async putObject(
    key: string,
    body: StorageObjectBody,
    _contentType: string,
    _contentLength?: number,
  ) {
    const filePath = this.resolveFilePath(key);
    await fsPromises.mkdir(path.dirname(filePath), { recursive: true });

    if (body instanceof Uint8Array) {
      await fsPromises.writeFile(filePath, Buffer.from(body));
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array | Buffer | string>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    await fsPromises.writeFile(filePath, Buffer.concat(chunks));
  }

  async getObject(key: string) {
    const filePath = this.resolveFilePath(key);
    const buffer = await fsPromises.readFile(filePath);
    return new Uint8Array(buffer);
  }

  async deleteObject(key: string) {
    await fsPromises.rm(this.resolveFilePath(key), { force: true });
  }

  async exists(key: string) {
    try {
      await fsPromises.access(this.resolveFilePath(key));
      return true;
    } catch {
      return false;
    }
  }

  async createDownloadUrl(
    key: string,
    _expiresIn = this.options.presignedUrlExpiresSeconds,
  ) {
    const normalizedKey = key.replace(/^\/+/, '');
    const baseUrl = this.options.publicBaseUrl.replace(/\/+$/, '');
    return `${baseUrl}/${normalizedKey}`;
  }

  async checkHealth() {
    await fsPromises.mkdir(this.options.rootDir, { recursive: true });
    await fsPromises.access(this.options.rootDir, fs.constants.W_OK);
  }

  private resolveFilePath(key: string) {
    const rootPath = path.resolve(this.options.rootDir);
    const safeKey = path
      .normalize(key)
      .replace(/^\.+(?=\/|$)/, '')
      .replace(/^\/+/, '');
    const fullPath = path.resolve(rootPath, safeKey);

    if (fullPath !== rootPath && !fullPath.startsWith(rootPath + path.sep)) {
      throw new Error(`Invalid storage path: ${key}`);
    }

    return fullPath;
  }
}
