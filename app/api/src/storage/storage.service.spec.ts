import { describe, expect, it, vi } from 'vitest';
import { StorageService } from './storage.service.js';

describe('StorageService', () => {
  it('delegates storage operations', async () => {
    const adapter = {
      putObject: vi.fn().mockResolvedValue(undefined),
      getObject: vi.fn().mockResolvedValue(new Uint8Array([1])),
      deleteObject: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockResolvedValue(true),
      createDownloadUrl: vi.fn().mockResolvedValue('https://signed.example'),
      checkHealth: vi.fn().mockResolvedValue(undefined),
    };
    const service = new StorageService(adapter);
    const body = new Uint8Array([1, 2, 3]);

    await service.putObject('key', body, 'text/plain', 3);
    await service.getObject('key');
    await service.deleteObject('key');
    await service.exists('key');
    await service.createDownloadUrl('key', 300);
    await service.checkHealth();

    expect(adapter.putObject).toHaveBeenCalledWith(
      'key',
      body,
      'text/plain',
      3,
    );
    expect(adapter.getObject).toHaveBeenCalledWith('key');
    expect(adapter.deleteObject).toHaveBeenCalledWith('key');
    expect(adapter.exists).toHaveBeenCalledWith('key');
    expect(adapter.createDownloadUrl).toHaveBeenCalledWith('key', 300);
    expect(adapter.checkHealth).toHaveBeenCalledOnce();
  });
});
