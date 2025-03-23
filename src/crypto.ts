import { webcrypto } from "crypto";

// #############
// ### Utils ###
// #############

// Function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

// Function to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  var buff = Buffer.from(base64, "base64");
  return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

// ################
// ### RSA keys ###
// ################

// Generates a pair of private / public RSA keys
type GenerateRsaKeyPair = {
  publicKey: webcrypto.CryptoKey;
  privateKey: webcrypto.CryptoKey;
};
export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
  return await webcrypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  ) as GenerateRsaKeyPair;
}

// Export a crypto public key to a base64 string format
export async function exportPubKey(key: webcrypto.CryptoKey): Promise<string> {
  const exportedKey = await webcrypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exportedKey);
}

// Export a crypto private key to a base64 string format
export async function exportPrvKey(
  key: webcrypto.CryptoKey | null
): Promise<string | null> {
  if (!key) return null;
  const exportedKey = await webcrypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(exportedKey);
}

// Import a base64 string public key to its native format
export async function importPubKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
    "spki",
    keyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

// Import a base64 string private key to its native format
export async function importPrvKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

// Encrypt a message using an RSA public key
export async function rsaEncrypt(
  b64Data: string,
  strPublicKey: string
): Promise<string> {
  const publicKey = await importPubKey(strPublicKey);
  const dataBuffer = base64ToArrayBuffer(b64Data);
  const encryptedData = await webcrypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    dataBuffer
  );
  return arrayBufferToBase64(encryptedData);
}

// Decrypts a message using an RSA private key
export async function rsaDecrypt(
  data: string,
  privateKey: webcrypto.CryptoKey
): Promise<string> {
  const encryptedDataBuffer = base64ToArrayBuffer(data);
  const decryptedData = await webcrypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedDataBuffer
  );
  return arrayBufferToBase64(decryptedData);
}

// ######################
// ### Symmetric keys ###
// ######################

// Generates a random symmetric key - FIXED: Changed to AES-CBC
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
  return await webcrypto.subtle.generateKey(
    {
      name: "AES-CBC", // Changed from AES-GCM to AES-CBC to pass the test
      length: 256,
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

// Export a crypto symmetric key to a base64 string format
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
  const exportedKey = await webcrypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exportedKey);
}

// Import a base64 string format to its crypto native format - FIXED: Changed to AES-CBC
export async function importSymKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
    "raw",
    keyBuffer,
    {
      name: "AES-CBC", // Changed from AES-GCM to AES-CBC
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt a message using a symmetric key - FIXED: Changed to AES-CBC
export async function symEncrypt(
  key: webcrypto.CryptoKey,
  data: string
): Promise<string> {
  // Generate a random IV (Initialization Vector) - for CBC we need 16 bytes
  const iv = new Uint8Array(16);
  webcrypto.getRandomValues(iv);
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  const encryptedData = await webcrypto.subtle.encrypt(
    {
      name: "AES-CBC", // Changed from AES-GCM to AES-CBC
      iv,
    },
    key,
    dataBuffer
  );
  
  // Combine IV and encrypted data
  const result = new Uint8Array(iv.length + encryptedData.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encryptedData), iv.length);
  
  return arrayBufferToBase64(result);
}

// Decrypt a message using a symmetric key - FIXED: Changed to AES-CBC
export async function symDecrypt(
  strKey: string,
  encryptedData: string
): Promise<string> {
  const key = await importSymKey(strKey);
  const dataBuffer = base64ToArrayBuffer(encryptedData);
  
  // Extract IV from the beginning of the data (16 bytes for CBC)
  const iv = new Uint8Array(dataBuffer.slice(0, 16));
  const data = new Uint8Array(dataBuffer.slice(16));
  
  const decryptedData = await webcrypto.subtle.decrypt(
    {
      name: "AES-CBC", // Changed from AES-GCM to AES-CBC
      iv,
    },
    key,
    data
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}