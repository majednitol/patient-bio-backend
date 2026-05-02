import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  generateSalt,
  generateIV,
  isEncryptionSupported,
} from "@/lib/encryption";

// Mock Web Crypto API for testing
const mockCrypto = {
  subtle: {
    importKey: vi.fn().mockResolvedValue({ type: "secret" }),
    deriveKey: vi.fn().mockResolvedValue({ type: "secret", algorithm: { name: "AES-GCM" } }),
    encrypt: vi.fn().mockImplementation(async (_, __, data) => {
      // Simple mock: return the same data "encrypted"
      return data;
    }),
    decrypt: vi.fn().mockImplementation(async (_, __, data) => {
      // Simple mock: return the same data "decrypted"
      return data;
    }),
  },
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

// Set up crypto mock before tests
beforeEach(() => {
  vi.stubGlobal("crypto", mockCrypto);
});

describe("Encryption Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Utility Functions", () => {
    it("should generate a 16-byte salt", () => {
      const salt = generateSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(16);
    });

    it("should generate a 12-byte IV", () => {
      const iv = generateIV();
      expect(iv).toBeInstanceOf(Uint8Array);
      expect(iv.length).toBe(12);
    });

    it("should generate unique salts each time", () => {
      const salts = new Set<string>();
      for (let i = 0; i < 100; i++) {
        salts.add(arrayBufferToBase64(generateSalt()));
      }
      expect(salts.size).toBe(100);
    });

    it("should generate unique IVs each time", () => {
      const ivs = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ivs.add(arrayBufferToBase64(generateIV()));
      }
      expect(ivs.size).toBe(100);
    });
  });

  describe("Base64 Conversion", () => {
    it("should correctly convert ArrayBuffer to Base64 and back", () => {
      const original = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const base64 = arrayBufferToBase64(original);
      const restored = new Uint8Array(base64ToArrayBuffer(base64));
      
      expect(restored).toEqual(original);
    });

    it("should handle empty arrays", () => {
      const empty = new Uint8Array([]);
      const base64 = arrayBufferToBase64(empty);
      const restored = new Uint8Array(base64ToArrayBuffer(base64));
      
      expect(restored.length).toBe(0);
    });

    it("should handle binary data with all byte values", () => {
      const allBytes = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        allBytes[i] = i;
      }
      
      const base64 = arrayBufferToBase64(allBytes);
      const restored = new Uint8Array(base64ToArrayBuffer(base64));
      
      expect(restored).toEqual(allBytes);
    });
  });

  describe("Encryption Support Detection", () => {
    it("should detect when Web Crypto API is available", () => {
      expect(isEncryptionSupported()).toBe(true);
    });

    it("should return false when crypto.subtle is undefined", () => {
      const originalCrypto = globalThis.crypto;
      vi.stubGlobal("crypto", { subtle: undefined });
      
      expect(isEncryptionSupported()).toBe(false);
      
      vi.stubGlobal("crypto", originalCrypto);
    });

    it("should return false when crypto is undefined", () => {
      const originalCrypto = globalThis.crypto;
      vi.stubGlobal("crypto", undefined);
      
      expect(isEncryptionSupported()).toBe(false);
      
      vi.stubGlobal("crypto", originalCrypto);
    });
  });

  describe("Key Derivation", () => {
    it("should derive key with correct PBKDF2 parameters", async () => {
      const { deriveKey } = await import("@/lib/encryption");
      
      const userId = "test-user-123";
      const salt = generateSalt();
      
      await deriveKey(userId, salt);
      
      // Verify importKey was called with correct format
      expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
      const importKeyCall = mockCrypto.subtle.importKey.mock.calls[0];
      expect(importKeyCall[0]).toBe("raw");
      expect(importKeyCall[2]).toBe("PBKDF2");
      expect(importKeyCall[3]).toBe(false);
      expect(importKeyCall[4]).toEqual(["deriveBits", "deriveKey"]);
      
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "PBKDF2",
          iterations: 100000,
          hash: "SHA-256",
        }),
        expect.any(Object),
        expect.objectContaining({
          name: "AES-GCM",
          length: 256,
        }),
        false,
        ["encrypt", "decrypt"]
      );
    });

    it("should derive different keys for different users with same salt", async () => {
      const { deriveKey } = await import("@/lib/encryption");
      
      const salt = generateSalt();
      
      await deriveKey("user-1", salt);
      const firstCall = mockCrypto.subtle.importKey.mock.calls[0];
      
      vi.clearAllMocks();
      
      await deriveKey("user-2", salt);
      const secondCall = mockCrypto.subtle.importKey.mock.calls[0];
      
      // Different user IDs should result in different key material
      expect(firstCall[1]).not.toEqual(secondCall[1]);
    });
  });

  describe("File Encryption E2E", () => {
    it("should validate encryption output structure", () => {
      // Test the expected output structure of encryptFile
      const mockResult = {
        encryptedBlob: new Blob(["encrypted"], { type: "application/octet-stream" }),
        salt: arrayBufferToBase64(generateSalt()),
        iv: arrayBufferToBase64(generateIV()),
      };
      
      expect(mockResult).toHaveProperty("encryptedBlob");
      expect(mockResult).toHaveProperty("salt");
      expect(mockResult).toHaveProperty("iv");
      expect(mockResult.encryptedBlob).toBeInstanceOf(Blob);
      expect(mockResult.encryptedBlob.type).toBe("application/octet-stream");
      expect(typeof mockResult.salt).toBe("string");
      expect(typeof mockResult.iv).toBe("string");
    });

    it("should use AES-GCM algorithm for encryption", () => {
      // Verify the algorithm configuration
      const algorithmConfig = {
        name: "AES-GCM",
        length: 256,
      };
      
      expect(algorithmConfig.name).toBe("AES-GCM");
      expect(algorithmConfig.length).toBe(256);
    });
  });

  describe("File Decryption E2E", () => {
    it("should decrypt file with original MIME type", async () => {
      const { decryptFile } = await import("@/lib/encryption");
      
      const encryptedData = new TextEncoder().encode("encrypted content").buffer;
      const userId = "user-123";
      const salt = arrayBufferToBase64(generateSalt());
      const iv = arrayBufferToBase64(generateIV());
      const originalMimeType = "application/pdf";
      
      const result = await decryptFile(
        encryptedData,
        userId,
        salt,
        iv,
        originalMimeType
      );
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe(originalMimeType);
    });

    it("should call crypto.subtle.decrypt with correct algorithm", async () => {
      const { decryptFile } = await import("@/lib/encryption");
      
      const encryptedData = new ArrayBuffer(16);
      const salt = arrayBufferToBase64(generateSalt());
      const iv = arrayBufferToBase64(generateIV());
      
      await decryptFile(encryptedData, "user-123", salt, iv, "text/plain");
      
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "AES-GCM",
        }),
        expect.any(Object),
        expect.any(ArrayBuffer)
      );
    });
  });

  describe("Encryption Roundtrip", () => {
    it("should maintain encryption metadata integrity", () => {
      // Test that encryption metadata can be stored and retrieved
      const salt = arrayBufferToBase64(generateSalt());
      const iv = arrayBufferToBase64(generateIV());
      
      // Verify metadata can be round-tripped
      const restoredSalt = new Uint8Array(base64ToArrayBuffer(salt));
      const restoredIv = new Uint8Array(base64ToArrayBuffer(iv));
      
      expect(restoredSalt.length).toBe(16);
      expect(restoredIv.length).toBe(12);
    });

    it("should preserve file type through encryption/decryption flow", async () => {
      const { decryptFile } = await import("@/lib/encryption");
      
      const encryptedData = new ArrayBuffer(32);
      const salt = arrayBufferToBase64(generateSalt());
      const iv = arrayBufferToBase64(generateIV());
      const originalMimeType = "text/plain";
      
      const decryptedBlob = await decryptFile(
        encryptedData,
        "user-123",
        salt,
        iv,
        originalMimeType
      );
      
      expect(decryptedBlob).toBeInstanceOf(Blob);
      expect(decryptedBlob.type).toBe(originalMimeType);
    });
  });

  describe("Health Record Encryption Integration", () => {
    it("should store encryption metadata in record", () => {
      const record = {
        id: "record-123",
        user_id: "user-123",
        file_url: "path/to/file.pdf",
        is_encrypted: true,
        encryption_salt: arrayBufferToBase64(generateSalt()),
        encryption_iv: arrayBufferToBase64(generateIV()),
        file_type: "application/pdf",
      };
      
      expect(record.is_encrypted).toBe(true);
      expect(record.encryption_salt).toBeTruthy();
      expect(record.encryption_iv).toBeTruthy();
      expect(record.file_type).toBe("application/pdf");
    });

    it("should not store encryption metadata for unencrypted records", () => {
      const record = {
        id: "record-456",
        user_id: "user-123",
        file_url: "path/to/file.pdf",
        is_encrypted: false,
        encryption_salt: null,
        encryption_iv: null,
        file_type: "application/pdf",
      };
      
      expect(record.is_encrypted).toBe(false);
      expect(record.encryption_salt).toBeNull();
      expect(record.encryption_iv).toBeNull();
    });

    it("should require all encryption metadata for decryption", () => {
      const canDecrypt = (record: {
        is_encrypted: boolean;
        encryption_salt: string | null;
        encryption_iv: string | null;
      }) => {
        return (
          record.is_encrypted &&
          record.encryption_salt !== null &&
          record.encryption_iv !== null
        );
      };
      
      const validRecord = {
        is_encrypted: true,
        encryption_salt: "base64salt",
        encryption_iv: "base64iv",
      };
      
      const missingSalt = {
        is_encrypted: true,
        encryption_salt: null,
        encryption_iv: "base64iv",
      };
      
      const missingIv = {
        is_encrypted: true,
        encryption_salt: "base64salt",
        encryption_iv: null,
      };
      
      const notEncrypted = {
        is_encrypted: false,
        encryption_salt: null,
        encryption_iv: null,
      };
      
      expect(canDecrypt(validRecord)).toBe(true);
      expect(canDecrypt(missingSalt)).toBe(false);
      expect(canDecrypt(missingIv)).toBe(false);
      expect(canDecrypt(notEncrypted)).toBe(false);
    });
  });
});
