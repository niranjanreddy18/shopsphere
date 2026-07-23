/**
 * Vitest global setup file (loaded once before the test suite runs — see
 * `test.setupFiles` in vite.config.js).
 *
 * Extends Vitest's `expect` with jest-dom's DOM-specific matchers
 * (toBeInTheDocument, toHaveTextContent, etc.) so every test file can use
 * them without importing jest-dom individually.
 */

import "@testing-library/jest-dom/vitest";
