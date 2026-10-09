import { randomUUID } from 'node:crypto';

export function createStorageKey(
  namespace: 'resume' | 'document' | 'candidate-document',
  ownerId: string,
  extension: string,
) {
  const normalizedExtension = extension
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  const suffix = normalizedExtension ? `.${normalizedExtension}` : '';
  return `candidates/${ownerId}/${namespace}/${randomUUID()}${suffix}`;
}
