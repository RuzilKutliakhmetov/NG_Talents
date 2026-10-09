import { describe, expect, it } from 'vitest';
import { createStorageKey } from './storage-key.js';

describe('createStorageKey', () => {
  it('creates a non-PII backend-owned key', () => {
    const key = createStorageKey('document', 'user-uuid', '.PDF');

    expect(key).toMatch(/^candidates\/user-uuid\/document\/[0-9a-f-]+\.pdf$/);
    expect(key).not.toContain('@');
  });
});
