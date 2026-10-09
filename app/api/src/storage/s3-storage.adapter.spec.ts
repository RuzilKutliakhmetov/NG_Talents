import { describe, expect, it, vi } from 'vitest';
import { S3StorageAdapter } from './s3-storage.adapter.js';

const options = {
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  accessKey: 'access-key',
  secretKey: 'secret-key',
  bucket: 'ngtalents',
  forcePathStyle: true,
  presignedUrlExpiresSeconds: 300,
};

function adapterWithSend(
  responses: Array<
    { kind: 'resolve'; value: unknown } | { kind: 'reject'; value: unknown }
  >,
) {
  const adapter = new S3StorageAdapter(options);
  const send = vi.fn();
  for (const response of responses) {
    if (response.kind === 'reject') send.mockRejectedValueOnce(response.value);
    else send.mockResolvedValueOnce(response.value);
  }
  (adapter as unknown as { client: { send: typeof send } }).client = { send };
  return { adapter, send };
}

describe('S3StorageAdapter', () => {
  it('delegates put, delete, exists and health with bucket configuration', async () => {
    const { adapter, send } = adapterWithSend([
      { kind: 'resolve', value: {} },
      { kind: 'resolve', value: {} },
      { kind: 'resolve', value: {} },
      { kind: 'resolve', value: {} },
    ]);

    await adapter.putObject('key', new Uint8Array([1]), 'text/plain', 1);
    await adapter.deleteObject('key');
    await expect(adapter.exists('key')).resolves.toBe(true);
    await adapter.checkHealth();

    expect(send).toHaveBeenCalledTimes(4);
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'ngtalents',
      Key: 'key',
      ContentType: 'text/plain',
      ContentLength: 1,
    });
    expect(send.mock.calls[1][0].input).toMatchObject({
      Bucket: 'ngtalents',
      Key: 'key',
    });
    expect(send.mock.calls[2][0].input).toMatchObject({
      Bucket: 'ngtalents',
      Key: 'key',
    });
    expect(send.mock.calls[3][0].input).toMatchObject({ Bucket: 'ngtalents' });
    expect(JSON.stringify(options)).not.toContain('https://');
  });

  it('returns false for missing objects', async () => {
    const { adapter } = adapterWithSend([
      {
        kind: 'reject',
        value: Object.assign(new Error('not found'), { name: 'NotFound' }),
      },
    ]);

    await expect(adapter.exists('missing')).resolves.toBe(false);
  });

  it('initializes a missing bucket and tolerates an existing bucket race', async () => {
    const { adapter, send } = adapterWithSend([
      {
        kind: 'reject',
        value: Object.assign(new Error('missing'), { name: 'NotFound' }),
      },
      {
        kind: 'reject',
        value: Object.assign(new Error('already exists'), {
          name: 'BucketAlreadyOwnedByYou',
        }),
      },
    ]);

    await expect(adapter.initializeBucket()).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: 'ngtalents' });
    expect(send.mock.calls[1][0].input).toMatchObject({ Bucket: 'ngtalents' });
  });
});
