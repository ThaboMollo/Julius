const PBKDF2_ITERATIONS = 310000
const PBKDF2_HASH = 'SHA-256'
const KEY_LENGTH = 256

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: asBufferSource(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt'],
  )
}

export type EncryptedPayload = {
  iv: string
  ciphertext: string
}

export async function encryptString(key: CryptoKey, plaintext: string): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoder = new TextEncoder()
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: asBufferSource(iv),
    },
    key,
    encoder.encode(plaintext),
  )

  return {
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
  }
}

export async function decryptString(key: CryptoKey, payload: EncryptedPayload): Promise<string> {
  const iv = fromBase64(payload.iv)
  const ciphertext = fromBase64(payload.ciphertext)
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: asBufferSource(iv),
    },
    key,
    asBufferSource(ciphertext),
  )

  return new TextDecoder().decode(decrypted)
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16))
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const output = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    output[i] = binary.charCodeAt(i)
  }
  return output
}

function asBufferSource(data: Uint8Array): BufferSource {
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return copy as unknown as BufferSource
}
