import { renderHook, act, cleanup } from "@testing-library/react";
import useMobileShare from "../src/hooks/useMobileShare";

// Mock fetch globally to prevent real network requests
vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: true,
    blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
  }),
);

// ---------------------------------------------------------------------------
// Helpers – use vi.stubGlobal for safe navigator mocking
// ---------------------------------------------------------------------------

const originalShare = navigator.share;
const originalCanShare = navigator.canShare;

function patchNavigatorShare(shareImpl?: (...args: any[]) => Promise<void>) {
  const shareFn = shareImpl ?? vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "share", {
    value: shareFn,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(navigator, "canShare", {
    value: vi.fn().mockReturnValue(true),
    writable: true,
    configurable: true,
  });
  return shareFn;
}

function restoreNavigatorShare() {
  Object.defineProperty(navigator, "share", {
    value: originalShare,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(navigator, "canShare", {
    value: originalCanShare,
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Tests – kept intentionally minimal to avoid jsdom/renderHook memory issues
// ---------------------------------------------------------------------------

describe("useMobileShare", () => {
  afterEach(() => {
    cleanup();
    restoreNavigatorShare();
    vi.clearAllMocks();
  });

  it("returns share function, error, and canShare", () => {
    const { result, unmount } = renderHook(() =>
      useMobileShare({ title: "Test" }),
    );

    expect(typeof result.current.share).toBe("function");
    expect(result.current.error).toBeNull();
    expect(typeof result.current.canShare).toBe("boolean");

    unmount();
  });

  it("detects canShare=true when navigator.share exists", () => {
    patchNavigatorShare();

    const { result, unmount } = renderHook(() =>
      useMobileShare({ title: "Test" }),
    );

    expect(result.current.canShare).toBe(true);
    unmount();
  });

  it("detects canShare=false when navigator.share is missing", () => {
    restoreNavigatorShare();

    const { result, unmount } = renderHook(() =>
      useMobileShare({ title: "Test" }),
    );

    expect(result.current.canShare).toBe(false);
    unmount();
  });

  it("calls navigator.share with title and url", async () => {
    const shareFn = patchNavigatorShare();

    const { result, unmount } = renderHook(() =>
      useMobileShare({ title: "Hello", url: "https://example.com" }),
    );

    await act(async () => {
      await result.current.share();
    });

    expect(shareFn).toHaveBeenCalledTimes(1);
    expect(shareFn.mock.calls[0][0]).toMatchObject({
      title: "Hello",
      url: "https://example.com",
    });

    unmount();
  });

  it("sets error when navigator.share rejects", async () => {
    patchNavigatorShare(vi.fn().mockRejectedValue(new Error("User cancelled")));

    const { result, unmount } = renderHook(() =>
      useMobileShare({ title: "Test" }),
    );

    await act(async () => {
      await result.current.share();
    });

    expect(result.current.error).toBe("User cancelled");
    unmount();
  });

  it("does not attach files when attachImages is false", async () => {
    const shareFn = patchNavigatorShare();

    const { result, unmount } = renderHook(() =>
      useMobileShare({
        title: "Test",
        url: "https://example.com",
        attachImages: false,
      }),
    );

    await act(async () => {
      await result.current.share();
    });

    expect(shareFn).toHaveBeenCalledTimes(1);
    expect(shareFn.mock.calls[0][0].files).toBeUndefined();
    unmount();
  });
});
