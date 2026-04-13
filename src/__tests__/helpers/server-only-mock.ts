// Mock for 'server-only' package in test environment.
// The real package throws when imported in client context;
// this mock is a no-op so tests can import server modules.
export {};
