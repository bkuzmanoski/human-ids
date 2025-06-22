import type * as NodeCrypto from "node:crypto";

// Cache the Node.js crypto module to avoid repeated require calls
let nodeCrypto: typeof NodeCrypto | undefined;

interface CryptoGlobal {
  crypto: {
    getRandomValues: (buffer: Uint8Array) => void;
  };
}

const isCryptoGlobal = (scope: unknown): scope is CryptoGlobal => {
  if (typeof scope !== "object" || scope === null) {
    return false;
  }

  const potentialCrypto = (scope as { crypto?: unknown }).crypto;
  if (typeof potentialCrypto !== "object" || potentialCrypto === null) {
    return false;
  }

  return typeof (potentialCrypto as { getRandomValues?: unknown }).getRandomValues === "function";
};

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

/*
 * Securely generates a random ID in an isomorphic/universal environment.
 *
 * It uses the most secure source of entropy available in the current runtime:
 * 1. Node.js: `crypto.randomBytes()`
 * 2. Web API: `crypto.getRandomValues()`
 * 3. Fallback: `Math.random()` (with a console warning)
 *
 */
export const generateId = (length = 32): string => {
  // Node.js environment
  if (globalThis.process?.versions?.node) {
    try {
      // Use require to avoid async import
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      nodeCrypto ??= require("node:crypto");
      if (nodeCrypto) {
        const byteLength = Math.ceil(length / 2);
        return nodeCrypto.randomBytes(byteLength).toString("hex").slice(0, length);
      }
    } catch (error) {
      console.error("Failed to load Node.js crypto module:", error);
    }
  }

  // Browser/Web Worker environment (Web Crypto API)
  const scope = globalThis;
  if (isCryptoGlobal(scope)) {
    const byteLength = Math.ceil(length / 2);
    const randomBytes = new Uint8Array(byteLength);
    scope.crypto.getRandomValues(randomBytes);
    return bytesToHex(randomBytes).slice(0, length);
  }

  // Insecure Fallback
  console.warn("Secure random number generator not available. Falling back to insecure Math.random().");

  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join("");
};
