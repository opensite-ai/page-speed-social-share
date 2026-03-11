import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock @page-speed/router
vi.mock("@page-speed/router", () => ({
  useUrl: () => ({
    href: "https://example.com/test",
    origin: "https://example.com",
    protocol: "https:",
    host: "example.com",
    hostname: "example.com",
    port: "",
    pathname: "/test",
    search: "",
    hash: "",
  }),
  useNavigation: () => ({
    navigateTo: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  }),
}));
