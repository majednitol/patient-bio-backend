import "@testing-library/jest-dom";

// Mock matchMedia for components that use it
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = "";
  thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as any;

// Mock crypto for token generation and SHA-256
Object.defineProperty(global, "crypto", {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () => "test-uuid-" + Math.random().toString(36).substring(7),
    subtle: {
      digest: async (_algorithm: string, data: ArrayBuffer) => {
        // Simple deterministic hash mock for testing
        const bytes = new Uint8Array(data);
        const result = new Uint8Array(32); // SHA-256 = 32 bytes
        for (let i = 0; i < bytes.length; i++) {
          result[i % 32] = (result[i % 32] + bytes[i]) % 256;
        }
        return result.buffer;
      },
    },
  },
});
