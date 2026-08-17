import * as Crypto from 'expo-crypto';

/** Client-generated UUID — used as both a row's primary key and its idempotency key. */
export function generateUuid(): string {
  return Crypto.randomUUID();
}
