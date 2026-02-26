import { render, screen, fireEvent } from "@testing-library/react";
import { SocialShare } from "../src/core/social-share";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock @opensite/hooks
vi.mock("@opensite/hooks/useIsTouchDevice", () => ({
  useIsTouchDevice: vi.fn(() => ({ isTouchDevice: false })),
}));

vi.mock("@opensite/hooks/useScreen", () => ({
  useScreen: vi.fn(() => ({ screenType: "DESKTOP" })),
}));

// Mock useMobileShare so we control canShare / share behavior
const mockShare = vi.fn();
vi.mock("../src/hooks/useMobileShare", () => ({
  default: vi.fn(() => ({
    share: mockShare,
    canShare: false,
    error: null,
  })),
}));

// Provide a minimal IntersectionObserver stub for jsdom
beforeAll(() => {
  class FakeIO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as any).IntersectionObserver = FakeIO;
  (globalThis as any).IntersectionObserverEntry = { prototype: { intersectionRatio: 0 } };
});

// Clean up any portal containers between tests
afterEach(() => {
  const portal = document.getElementById("sticky-share-portal");
  if (portal) portal.remove();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  postTitle: "Test Title",
  shareUrl: "https://example.com/test",
  summaryContent: "A short summary.",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SocialShare", () => {
  // ---- Standard variant rendering -----------------------------------------

  describe("standard variant", () => {
    it("renders X, Facebook, LinkedIn, and Email buttons", () => {
      render(<SocialShare {...defaultProps} />);

      expect(screen.getByLabelText("Share on X")).toBeInTheDocument();
      expect(screen.getByLabelText("Share on Facebook")).toBeInTheDocument();
      expect(screen.getByLabelText("Share on LinkedIn")).toBeInTheDocument();
      expect(screen.getByLabelText("Share via Email")).toBeInTheDocument();
    });

    it("does not render Pinterest button when imgUrls is empty", () => {
      render(<SocialShare {...defaultProps} />);

      expect(screen.queryByLabelText("Share on Pinterest")).not.toBeInTheDocument();
    });

    it("renders Pinterest button when imgUrls are provided", () => {
      render(
        <SocialShare {...defaultProps} imgUrls={["https://example.com/img.jpg"]} />,
      );

      expect(screen.getByLabelText("Share on Pinterest")).toBeInTheDocument();
    });

    it("applies containerClassName to the wrapper section", () => {
      const { container } = render(
        <SocialShare {...defaultProps} containerClassName="my-custom-class" />,
      );

      const section = container.querySelector("section");
      expect(section).toHaveClass("my-custom-class");
    });

    it("respects inlineSize for button dimensions", () => {
      render(<SocialShare {...defaultProps} inlineSize={60} />);

      const btn = screen.getByLabelText("Share on X");
      expect(btn).toHaveStyle({ width: "60px", height: "60px" });
    });
  });

  // ---- Sticky variant rendering -------------------------------------------

  describe("sticky variant", () => {
    it("renders a portal container in the document body", () => {
      render(<SocialShare {...defaultProps} variant="sticky" />);

      const portal = document.getElementById("sticky-share-portal");
      expect(portal).toBeInTheDocument();
    });

    it("does not render an inline section", () => {
      const { container } = render(
        <SocialShare {...defaultProps} variant="sticky" />,
      );

      expect(container.querySelector("section")).not.toBeInTheDocument();
    });
  });

  // ---- Combo variant rendering --------------------------------------------

  describe("combo variant", () => {
    it("renders both the inline section and the sticky portal", () => {
      const { container } = render(
        <SocialShare {...defaultProps} variant="combo" />,
      );

      // Inline section exists
      expect(container.querySelector("section")).toBeInTheDocument();
      // Portal container exists
      expect(document.getElementById("sticky-share-portal")).toBeInTheDocument();
    });
  });

  // ---- Social button click behavior ---------------------------------------

  describe("social share clicks", () => {
    it("opens a popup window when a social button is clicked", () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      render(<SocialShare {...defaultProps} />);

      fireEvent.click(screen.getByLabelText("Share on X"));
      expect(openSpy).toHaveBeenCalledTimes(1);

      const calledUrl = openSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("twitter.com/intent/tweet");
      expect(calledUrl).toContain(encodeURIComponent("Test Title"));
      expect(calledUrl).toContain(encodeURIComponent("https://example.com/test"));

      openSpy.mockRestore();
    });

    it("includes hashtags in the X share URL", () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      render(
        <SocialShare {...defaultProps} hashtags={["react", "webdev"]} />,
      );

      fireEvent.click(screen.getByLabelText("Share on X"));
      const calledUrl = openSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("hashtags=react%2Cwebdev");

      openSpy.mockRestore();
    });

    it("uses mailto: for email sharing", () => {
      // jsdom doesn't navigate on location.href assignment, so just spy on it
      const hrefSetter = vi.fn();
      Object.defineProperty(window, "location", {
        value: { ...window.location, href: "" },
        writable: true,
        configurable: true,
      });

      const originalDescriptor = Object.getOwnPropertyDescriptor(window.location, "href");
      Object.defineProperty(window.location, "href", {
        set: hrefSetter,
        get: () => "",
        configurable: true,
      });

      render(<SocialShare {...defaultProps} />);
      fireEvent.click(screen.getByLabelText("Share via Email"));

      expect(hrefSetter).toHaveBeenCalledTimes(1);
      const mailUrl = hrefSetter.mock.calls[0][0] as string;
      expect(mailUrl).toContain("mailto:");
      expect(mailUrl).toContain("subject=");
      expect(mailUrl).toContain("body=");

      // Restore
      if (originalDescriptor) {
        Object.defineProperty(window.location, "href", originalDescriptor);
      }
    });

    it("builds correct Facebook share URL", () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      render(<SocialShare {...defaultProps} />);
      fireEvent.click(screen.getByLabelText("Share on Facebook"));

      const calledUrl = openSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("facebook.com/sharer.php");
      expect(calledUrl).toContain(`u=${encodeURIComponent("https://example.com/test")}`);

      openSpy.mockRestore();
    });

    it("builds correct LinkedIn share URL with share-offsite endpoint", () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      render(<SocialShare {...defaultProps} />);
      fireEvent.click(screen.getByLabelText("Share on LinkedIn"));

      const calledUrl = openSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("linkedin.com/sharing/share-offsite");
      expect(calledUrl).toContain(`url=${encodeURIComponent("https://example.com/test")}`);
      // Should NOT contain deprecated title/summary params
      expect(calledUrl).not.toContain("title=");
      expect(calledUrl).not.toContain("summary=");

      openSpy.mockRestore();
    });

    it("builds correct Pinterest share URL with media param", () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
      const imgUrl = "https://example.com/photo.jpg";

      render(<SocialShare {...defaultProps} imgUrls={[imgUrl]} />);
      fireEvent.click(screen.getByLabelText("Share on Pinterest"));

      const calledUrl = openSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("pinterest.com/pin/create/button");
      expect(calledUrl).toContain(`media=${encodeURIComponent(imgUrl)}`);
      expect(calledUrl).toContain(`description=${encodeURIComponent("Test Title")}`);

      openSpy.mockRestore();
    });
  });

  // ---- Native share / adaptive behavior -----------------------------------

  describe("native share behavior", () => {
    it("does not render native share button when canShare is false", () => {
      render(<SocialShare {...defaultProps} />);

      expect(screen.queryByLabelText("Share with System")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Share")).not.toBeInTheDocument();
    });

    it("renders native share button on desktop when canShare is true", async () => {
      const { default: useMobileShare } = await import("../src/hooks/useMobileShare");
      (useMobileShare as ReturnType<typeof vi.fn>).mockReturnValue({
        share: mockShare,
        canShare: true,
        error: null,
      });

      render(<SocialShare {...defaultProps} />);

      // On desktop (not touch), native share appears alongside social buttons
      expect(screen.getByLabelText("Share with System")).toBeInTheDocument();
    });
  });
});
