import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { LocalStorageAdapter } from './local-storage.adapter.js';

describe('LocalStorageAdapter', () => {
  it('stores, reads and removes files from the project-local storage directory', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'ng-talents-storage-'));
    const adapter = new LocalStorageAdapter({
      rootDir,
      publicBaseUrl: 'http://localhost:3000/storage',
      presignedUrlExpiresSeconds: 300,
    });

    try {
      await adapter.putObject('candidates/user-1/resume/file.txt', new Uint8Array([1, 2, 3]), 'text/plain', 3);
      await expect(adapter.exists('candidates/user-1/resume/file.txt')).resolves.toBe(true);
      await expect(adapter.getObject('candidates/user-1/resume/file.txt')).resolves.toEqual(new Uint8Array([1, 2, 3]));
      await expect(adapter.createDownloadUrl('candidates/user-1/resume/file.txt')).resolves.toBe('http://localhost:3000/storage/candidates/user-1/resume/file.txt');

      await adapter.deleteObject('candidates/user-1/resume/file.txt');
      await expect(adapter.exists('candidates/user-1/resume/file.txt')).resolves.toBe(false);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
