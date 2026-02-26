"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import useMobileShare from "../hooks/useMobileShare";
import { useIsTouchDevice } from "@opensite/hooks/useIsTouchDevice";
import { useScreen } from "@opensite/hooks/useScreen";
import type { SocialShareProps } from "../types";

const X_SHARE_URL = "https://twitter.com/intent/tweet";
const FACEBOOK_SHARE_URL = "https://www.facebook.com/sharer.php";
const PINTEREST_SHARE_URL = "https://pinterest.com/pin/create/button";
const LINKEDIN_SHARE_URL = "https://www.linkedin.com/shareArticle";
const MAIL_SHARE_URL = "mailto:";

/********************************************************************
 * StickyShareBar - subcomponent
 ********************************************************************/
const StickyShareBar: React.FC<{
  canShare: boolean;
  nativeShare: () => void;
  handleSocialShare: (
    event: React.MouseEvent<HTMLButtonElement>,
    social: string,
  ) => void;
  imgUrls?: string[];
  summaryContent?: string;
  shareUrl?: string;
  postTitle?: string;
  hashtags?: string[];
  triggerRef?: React.RefObject<HTMLElement>;
  isTouch?: boolean;
}> = ({
  canShare,
  nativeShare,
  handleSocialShare,
  imgUrls,
  triggerRef,
  isTouch,
}) => {
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const [showSharebar, setShowSharebar] = useState<boolean>(false);
  const [hideSharebar, setHideSharebar] = useState<boolean>(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  // Create a portal container when component mounts
  useEffect(() => {
    // Check if we already have a container
    let container = document.getElementById("sticky-share-portal");

    if (!container) {
      container = document.createElement("div");
      container.id = "sticky-share-portal";
      document.body.appendChild(container);
    }

    setPortalContainer(container);

    // Clean up on unmount
    return () => {
      if (
        container &&
        container.parentNode &&
        !document.getElementById("sticky-share-portal-persistent")
      ) {
        container.parentNode.removeChild(container);
      }
    };
  }, []);

  useEffect(() => {
    if (
      !("IntersectionObserver" in window) ||
      !("IntersectionObserverEntry" in window) ||
      !("intersectionRatio" in window.IntersectionObserverEntry.prototype)
    ) {
      setShowSharebar(true);
      return;
    }

    // Helper: locate the app's scroll container. In this app the root <main>
    // element is fixed and owns the scroll (see app.css), so window.scrollY
    // does not update. We detect and listen to that container when no
    // explicit triggerRef is provided.
    const findScrollContainer = () => {
      const el = document.querySelector(
        "main.dashtrack-light, main.dashtrack-dark",
      ) as HTMLElement | null;
      return el || (document.scrollingElement as HTMLElement | null) || null;
    };

    if (!triggerRef?.current) {
      const scroller = findScrollContainer();
      const handleScroll = () => {
        const scrollY = scroller
          ? (scroller as HTMLElement).scrollTop
          : window.scrollY || document.documentElement.scrollTop;
        setShowSharebar(scrollY > 200);
      };

      const target: any = scroller || window;
      target.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();

      return () => {
        target.removeEventListener("scroll", handleScroll);
      };
    }

    // Create observer for the trigger element
    const observerIn = new IntersectionObserver(
      (entries) => {
        // When the trigger element moves out of view (scrolled past), show the share bar
        setShowSharebar(!entries[0].isIntersecting);
      },
      {
        // This threshold makes the share bar appear after scrolling down a bit
        // Adjust rootMargin to control when the bar appears (e.g., after 100px of scrolling)
        rootMargin: "-100px 0px 0px 0px",
        threshold: 0,
      },
    );

    observerIn.observe(triggerRef.current);

    // Optional: Detect when the user reaches the bottom of the page
    const observerFooter = document.querySelector("footer, .footer");
    if (observerFooter) {
      const observerOut = new IntersectionObserver(
        (entries) => {
          setHideSharebar(entries[0].isIntersecting);
        },
        {
          rootMargin: "0px",
          threshold: 0,
        },
      );
      observerOut.observe(observerFooter);

      return () => {
        observerIn.disconnect();
        observerOut.disconnect();
      };
    }

    return () => {
      observerIn.disconnect();
    };
  }, [triggerRef]);

  // The final class toggling for visibility
  const isActive = showSharebar && !hideSharebar;

  /*********************************************************************
   * Render methods using the same logic from the main component
   * On mobile/touch device: only show native button if available
   * On desktop: always show social icons and optionally include native button
   *********************************************************************/
  const showOnlyNativeButton = isTouch && canShare;

  const renderNativeShareButton = () => (
    <li>
      <button
        type="button"
        aria-label="Share"
        className="sticky-sharebar__btn"
        onClick={nativeShare}
      >
        <svg
          className="icon h-[1em] w-[1em] inline-block text-inherit fill-current leading-none shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M18 16.08C17.24 16.08 16.56 16.37 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.22C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.78C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.22L15.16 18.35C15.11 18.56 15.08 18.78 15.08 19C15.08 20.66 16.42 22 18.08 22C19.74 22 21.08 20.66 21.08 19C21.08 17.34 19.74 16 18.08 16H18V16.08Z" />
        </svg>
      </button>
    </li>
  );

  const renderSocialButtons = () => {
    return (
      <>
        {/* X/Twitter */}
        <li>
          <button
            type="button"
            aria-label="Share on X"
            className="sticky-sharebar__btn"
            onClick={(e) => handleSocialShare(e, "x")}
          >
            <svg
              className="icon h-[1em] w-[1em] inline-block text-inherit fill-current leading-none shrink-0"
              viewBox="0 0 24 24"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
        </li>
        {/* Facebook */}
        <li>
          <button
            type="button"
            aria-label="Share on Facebook"
            className="sticky-sharebar__btn"
            onClick={(e) => handleSocialShare(e, "facebook")}
          >
            <svg
              className="icon h-[1em] w-[1em] inline-block text-inherit fill-current leading-none shrink-0"
              viewBox="0 0 32 32"
            >
              <path d="M32,16A16,16,0,1,0,13.5,31.806V20.625H9.438V16H13.5V12.475c0-4.01,2.389-6.225,6.043-6.225a24.644,24.644,0,0,1,3.582.312V10.5H21.107A2.312,2.312,0,0,0,18.5,13v3h4.438l-.71,4.625H18.5V31.806A16,16,0,0,0,32,16Z" />
            </svg>
          </button>
        </li>
        {/* Pinterest (only if we have an image) */}
        {imgUrls && imgUrls.length > 0 && (
          <li>
            <button
              type="button"
              aria-label="Share on Pinterest"
              className="sticky-sharebar__btn"
              onClick={(e) => handleSocialShare(e, "pinterest")}
            >
              <svg
                className="icon h-[1em] w-[1em] inline-block text-inherit fill-current leading-none shrink-0"
                viewBox="0 0 32 32"
              >
                <path d="M16,0C7.2,0,0,7.2,0,16c0,6.8,4.2,12.6,10.2,14.9c-0.1-1.3-0.3-3.2,0.1-4.6c0.3-1.2,1.9-8,1.9-8 s-0.5-1-0.5-2.4c0-2.2,1.3-3.9,2.9-3.9c1.4,0,2,1,2,2.3c0,1.4-0.9,3.4-1.3,5.3c-0.4,1.6,0.8,2.9,2.4,2.9c2.8,0,5-3,5-7.3 c0-3.8-2.8-6.5-6.7-6.5c-4.6,0-7.2,3.4-7.2,6.9c0,1.4,0.5,2.8,1.2,3.7c0.1,0.2,0.1,0.3,0.1,0.5c-0.1,0.5-0.4,1.6-0.4,1.8 C9.5,21.9,9.3,22,9,21.8c-2-0.9-3.2-3.9-3.2-6.2c0-5,3.7-9.7,10.6-9.7c5.6,0,9.9,4,9.9,9.2c0,5.5-3.5,10-8.3,10 c-1.6,0-3.1-0.8-3.7-1.8c0,0-0.8,3.1-1,3.8c-0.4,1.4-1.3,3.1-2,4.2c1.5,0.5,3.1,0.7,4.7,0.7c8.8,0,16-7.2,16-16C32,7.2,24.8,0,16,0z " />
              </svg>
            </button>
          </li>
        )}
        {/* LinkedIn */}
        <li>
          <button
            type="button"
            aria-label="Share on LinkedIn"
            className="sticky-sharebar__btn"
            onClick={(e) => handleSocialShare(e, "linkedin")}
          >
            <svg
              className="icon h-[1em] w-[1em] inline-block text-inherit fill-current leading-none shrink-0"
              viewBox="0 0 32 32"
            >
              <path d="M29,1H3A2,2,0,0,0,1,3V29a2,2,0,0,0,2,2H29a2,2,0,0,0,2-2V3A2,2,0,0,0,29,1ZM9.887,26.594H5.374V12.25H9.887ZM7.63,10.281a2.625,2.625,0,1,1,2.633-2.625A2.624,2.624,0,0,1,7.63,10.281ZM26.621,26.594H22.2V19.656c0-1.687,0-3.75-2.35-3.75s-2.633,1.782-2.633,3.656v7.126H12.8V12.25h4.136v1.969h.094a4.7,4.7,0,0,1,4.231-2.344c4.513,0,5.359,3,5.359,6.844Z" />
            </svg>
          </button>
        </li>
        {/* Email */}
        <li>
          <button
            type="button"
            aria-label="Share via Email"
            className="sticky-sharebar__btn"
            onClick={(e) => handleSocialShare(e, "mail")}
          >
            <svg
              className="icon h-[1em] w-[1em] inline-block text-inherit fill-current leading-none shrink-0"
              viewBox="0 0 32 32"
            >
              <path d="M28,3H4A3.957,3.957,0,0,0,0,7V25a3.957,3.957,0,0,0,4,4H28a3.957,3.957,0,0,0,4-4V7A3.957,3.957,0,0,0,28,3Zm.6,6.8-12,9a1,1,0,0,1-1.2,0l-12-9A1,1,0,0,1,4.6,8.2L16,16.75,27.4,8.2a1,1,0,1,1,1.2,1.6Z" />
            </svg>
          </button>
        </li>
        {/* Add native share button on desktop only if available */}
        {canShare && !isTouch && (
          <li>
            <button
              type="button"
              aria-label="Share with System"
              className="sticky-sharebar__btn"
              onClick={nativeShare}
            >
              <svg
                className="icon h-[1em] w-[1em] inline-block text-inherit fill-current leading-none shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18 16.08C17.24 16.08 16.56 16.37 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.22C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.78C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.22L15.16 18.35C15.11 18.56 15.08 18.78 15.08 19C15.08 20.66 16.42 22 18.08 22C19.74 22 21.08 20.66 21.08 19C21.08 17.34 19.74 16 18.08 16H18V16.08Z" />
              </svg>
            </button>
          </li>
        )}
      </>
    );
  };

  const shareBarContent = (
    <div
      ref={stickyBarRef}
      className={`sticky-sharebar js-sticky-sharebar ${
        isActive ? "sticky-sharebar--on-target" : ""
      }`}
    >
      <ul className="sticky-sharebar__list">
        {showOnlyNativeButton
          ? renderNativeShareButton()
          : renderSocialButtons()}
      </ul>

      {/* Inline CSS for the Sticky sharebar */}
      <style>{`
        .sticky-sharebar {
          display: flex;
          align-items: center;
          position: fixed;
          height: 100%;
          top: 0;
          right: 1.25rem; /* = right-5 */
          pointer-events: none;
          z-index: 9999; /* Higher z-index to ensure it's above all other components */
          transition: visibility 0s 0.3s, opacity 0.3s,
            transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
          transform: translateX(10%);
          opacity: 0;
          visibility: hidden;
        }
        @media (min-width: 1024px) {
          .sticky-sharebar {
            right: 2rem; /* = lg:right-8 */
          }
        }
        .sticky-sharebar--on-target {
          transition: visibility 0s, opacity 0.3s,
            transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
          transform: translateX(0);
          opacity: 1;
          visibility: visible;
        }
        .sticky-sharebar__list {
          pointer-events: auto;
          background-color: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(5px);
          border-radius: 50em;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05);
          padding: 8px; /* Increased padding for more spacious look */
        }
        .sticky-sharebar__btn {
          --size: 42px;
          width: var(--size);
          height: var(--size);
          position: relative;
          display: flex;
          border-radius: 50%;
          margin: 0;
        }
        .sticky-sharebar__btn .icon {
          position: relative;
          color: #6b7280; /* text-gray-500 */
          display: block;
          margin: auto;
          z-index: 2;
          transition: color 0.2s;
          height: 21px;
          width: 21px;
        }
        .sticky-sharebar__btn::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          border-radius: inherit;
          background-color: rgba(17, 24, 39, 0.1); /* ~bg-gray-900/10 */
          transform: scale(0);
          transition: transform 0.2s cubic-bezier(0.215, 0.61, 0.355, 1);
        }
        .sticky-sharebar__btn:hover .icon {
          color: #111827; /* text-gray-900 */
        }
        .sticky-sharebar__btn:hover::before {
          transform: scale(1);
        }
        /* Add more visual contrast with a subtle border */
        .sticky-sharebar__list {
          border: 1px solid rgba(229, 231, 235, 0.8); /* very light gray border */
        }
      `}</style>
    </div>
  );

  // Use ReactDOM.createPortal to render outside the component hierarchy
  return portalContainer
    ? ReactDOM.createPortal(shareBarContent, portalContainer)
    : null;
};

/********************************************************************
 * SocialShare - your main social sharing (non-sticky) or single-button
 ********************************************************************/
export const SocialShare: React.FC<SocialShareProps> = ({
  containerClassName = "",
  summaryContent,
  shareUrl,
  postTitle,
  imgUrls,
  hashtags = [],
  variant = "standard",
  inlineSize = 42,
  disableImageAttachments = false,
}) => {
  // Check if we're on a touch device and get the screen type
  const { screenType } = useScreen();
  const { isTouchDevice: isTouch } = useIsTouchDevice();
  const isMobileOrTablet = screenType === "MOBILE" || screenType === "TABLET";

  // Setup native share capabilities
  const { share: originalNativeShare, canShare: originalCanShare } =
    useMobileShare({
      title: postTitle,
      url: shareUrl,
      imageUrls: imgUrls,
      attachImages: !disableImageAttachments,
    });

  // We'll consider images loaded only when they've been actually loaded
  // rather than just checking if the array exists
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Preload images to ensure they're available for sharing
  useEffect(() => {
    if (imgUrls && imgUrls.length > 0) {
      let isMounted = true;
      const loadImages = async () => {
        try {
          // Create image elements to preload the images
          const preloadedImages = await Promise.all(
            imgUrls.map((src) => {
              return new Promise<string>((resolve) => {
                // Create an image for visual display preloading
                const img = new Image();
                img.onload = () => resolve(src);
                img.onerror = () => {
                  console.warn(`Failed to load image for display: ${src}`);
                  // Even if it fails to load for display, we'll still try to include it for sharing
                  // since the proxy will handle it separately
                  resolve(src);
                };
                img.src = src;
              });
            }),
          );

          if (isMounted) {
            setImagesLoaded(true);
            console.log(
              "Images successfully preloaded for sharing:",
              preloadedImages,
            );
          }
        } catch (error) {
          console.warn("Failed to load some images for sharing:", error);
          if (isMounted) {
            // Even if some images fail, use the ones that succeeded
            setImagesLoaded(true);
          }
        }
      };

      loadImages();
      return () => {
        isMounted = false;
      };
    } else {
      setImagesLoaded(true);
    }
  }, [imgUrls]);

  // Images are ready when they are loaded and the Native Share API is available
  const canShare = originalCanShare && imagesLoaded;

  // Determine what to render based on device and capabilities
  // On mobile/tablet with touch, only show native share if available
  // On desktop, always show social buttons and optionally include native share at the end
  const showOnlyNativeButton = isTouch && isMobileOrTablet && canShare;

  // Adjust the share handler to work with the native share API
  const handleNativeShare = useCallback(() => {
    if (!canShare) return;

    try {
      console.log("Attempting native share with proxy-enabled sharing");

      // Even if images weren't fully preloaded, the sharing mechanism will
      // fetch them through the proxy to avoid CORS issues
      originalNativeShare();
    } catch (error) {
      console.error("Error sharing content:", error);
    }
  }, [canShare, originalNativeShare]);

  // Define the getSocialUrl function first
  const getSocialUrl = useCallback(
    (social: string) => {
      let baseUrl = "";

      switch (social) {
        case "x":
          baseUrl = X_SHARE_URL;
          break;
        case "facebook":
          baseUrl = FACEBOOK_SHARE_URL;
          break;
        case "pinterest":
          baseUrl = PINTEREST_SHARE_URL;
          break;
        case "linkedin":
          baseUrl = LINKEDIN_SHARE_URL;
          break;
        case "mail":
          baseUrl = MAIL_SHARE_URL;
          break;
      }

      if (!baseUrl) return "#";

      // Handle each sharing platform with direct URL construction
      switch (social) {
        case "x": {
          // For Twitter/X: Only include title and URL
          let twitterUrl = `${baseUrl}?text=${encodeURIComponent(postTitle)}`;

          if (shareUrl) {
            twitterUrl += `&url=${encodeURIComponent(shareUrl)}`;
          }

          const formattedHashtags = hashtags
            .map((tag) => tag.replace(/\s+/g, ""))
            .join(",");
          if (formattedHashtags) {
            twitterUrl += `&hashtags=${encodeURIComponent(formattedHashtags)}`;
          }

          return twitterUrl;
        }

        case "facebook": {
          // For Facebook: Use the modern approach with only the URL parameter
          // For better compatibility, use the direct encodeURIComponent URL without any other parameters
          return `${baseUrl}?u=${encodeURIComponent(shareUrl)}`;
        }

        case "linkedin": {
          // For LinkedIn: Include title, summary, and URL with proper formatting
          let linkedInUrl = `${baseUrl}?mini=true`;
          linkedInUrl += `&url=${encodeURIComponent(shareUrl)}`;

          if (postTitle) {
            linkedInUrl += `&title=${encodeURIComponent(postTitle)}`;
          }

          if (summaryContent) {
            // LinkedIn has a 256 character limit for summary
            const truncatedSummary =
              summaryContent.length > 256
                ? summaryContent.substring(0, 253) + "..."
                : summaryContent;
            linkedInUrl += `&summary=${encodeURIComponent(truncatedSummary)}`;
          }

          return linkedInUrl;
        }

        case "pinterest": {
          // For Pinterest: URL, media, and description
          let pinterestUrl = `${baseUrl}?url=${encodeURIComponent(shareUrl)}`;

          if (imgUrls && imgUrls.length > 0) {
            pinterestUrl += `&media=${encodeURIComponent(imgUrls[0])}`;
          }

          pinterestUrl += `&description=${encodeURIComponent(postTitle)}`;

          return pinterestUrl;
        }

        case "mail": {
          // For Email: Set subject as postTitle, and format the body properly
          const subject = encodeURIComponent(postTitle);
          const bodyContent = `Check out this article:\n\n${summaryContent}\n\n${shareUrl}`;
          const body = encodeURIComponent(bodyContent);
          // For mailto: the format is "mailto:?subject=...&body=..."
          return `${baseUrl}?subject=${subject}&body=${body}`;
        }

        default:
          return "#";
      }
    },
    [postTitle, summaryContent, shareUrl, imgUrls, hashtags],
  );

  // Handle social sharing through URL schemes
  const handleSocialShare = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, social: string) => {
      event.preventDefault();
      const url = getSocialUrl(social);
      if (url === "#") return;

      if (social === "mail") {
        window.location.href = url;
      } else {
        window.open(url, `${social}-share-dialog`, "width=626,height=436");
      }
    },
    [getSocialUrl],
  );

  // Render native share button for mobile touch devices
  const renderNativeShareButton = () => (
    <button
      type="button"
      aria-label="Share"
      className="sharebar__btn native-share-btn"
      onClick={handleNativeShare}
      disabled={!imagesLoaded}
    >
      <svg
        className="icon h-[24px] w-[24px] inline-block text-inherit fill-current leading-none shrink-0"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M18 16.08C17.24 16.08 16.56 16.37 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.22C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.78C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.22L15.16 18.35C15.11 18.56 15.08 18.78 15.08 19C15.08 20.66 16.42 22 18.08 22C19.74 22 21.08 20.66 21.08 19C21.08 17.34 19.74 16 18.08 16H18V16.08Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );

  // Update the standard social buttons rendering to include native share button at the end for desktop
  const renderSocialButtons = () => (
    <ul className="sharebar flex flex-wrap gap-2 lg:gap-3 justify-center">
      {/* X (formerly Twitter) */}
      <li>
        <button
          type="button"
          aria-label="Share on X"
          className="sharebar__btn js-social-share"
          onClick={(e) => handleSocialShare(e, "x")}
        >
          <svg className="icon h-[24px] w-[24px]" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>
      </li>
      {/* Facebook */}
      <li>
        <button
          type="button"
          aria-label="Share on Facebook"
          className="sharebar__btn js-social-share"
          onClick={(e) => handleSocialShare(e, "facebook")}
        >
          <svg className="icon h-[24px] w-[24px]" viewBox="0 0 32 32">
            <path d="M32,16A16,16,0,1,0,13.5,31.806V20.625H9.438V16H13.5V12.475c0-4.01,2.389-6.225,6.043-6.225a24.644,24.644,0,0,1,3.582.312V10.5H21.107A2.312,2.312,0,0,0,18.5,13v3h4.438l-.71,4.625H18.5V31.806A16,16,0,0,0,32,16Z" />
          </svg>
        </button>
      </li>
      {/* Pinterest */}
      {imgUrls && imgUrls.length > 0 && (
        <li>
          <button
            type="button"
            aria-label="Share on Pinterest"
            className="sharebar__btn js-social-share"
            onClick={(e) => handleSocialShare(e, "pinterest")}
          >
            <svg className="icon h-[24px] w-[24px]" viewBox="0 0 32 32">
              <path d="M16,0C7.2,0,0,7.2,0,16c0,6.8,4.2,12.6,10.2,14.9c-0.1-1.3-0.3-3.2,0.1-4.6c0.3-1.2,1.9-8,1.9-8 s-0.5-1-0.5-2.4c0-2.2,1.3-3.9,2.9-3.9c1.4,0,2,1,2,2.3c0,1.4-0.9,3.4-1.3,5.3c-0.4,1.6,0.8,2.9,2.4,2.9c2.8,0,5-3,5-7.3  c0-3.8-2.8-6.5-6.7-6.5c-4.6,0-7.2,3.4-7.2,6.9c0,1.4,0.5,2.8,1.2,3.7c0.1,0.2,0.1,0.3,0.1,0.5c-0.1,0.5-0.4,1.6-0.4,1.8  C9.5,21.9,9.3,22,9,21.8c-2-0.9-3.2-3.9-3.2-6.2c0-5,3.7-9.7,10.6-9.7c5.6,0,9.9,4,9.9,9.2c0,5.5-3.5,10-8.3,10  c-1.6,0-3.1-0.8-3.7-1.8c0,0-0.8,3.1-1,3.8c-0.4,1.4-1.3,3.1-2,4.2c1.5,0.5,3.1,0.7,4.7,0.7c8.8,0,16-7.2,16-16C32,7.2,24.8,0,16,0z " />
            </svg>
          </button>
        </li>
      )}
      {/* LinkedIn */}
      <li>
        <button
          type="button"
          aria-label="Share on LinkedIn"
          className="sharebar__btn js-social-share"
          onClick={(e) => handleSocialShare(e, "linkedin")}
        >
          <svg className="icon h-[24px] w-[24px]" viewBox="0 0 32 32">
            <path d="M29,1H3A2,2,0,0,0,1,3V29a2,2,0,0,0,2,2H29a2,2,0,0,0,2-2V3A2,2,0,0,0,29,1ZM9.887,26.594H5.374V12.25H9.887ZM7.63,10.281a2.625,2.625,0,1,1,2.633-2.625A2.624,2.624,0,0,1,7.63,10.281ZM26.621,26.594H22.2V19.656c0-1.687,0-3.75-2.35-3.75s-2.633,1.782-2.633,3.656v7.126H12.8V12.25h4.136v1.969h.094a4.7,4.7,0,0,1,4.231-2.344c4.513,0,5.359,3,5.359,6.844Z" />
          </svg>
        </button>
      </li>
      {/* Email */}
      <li>
        <button
          type="button"
          aria-label="Share via Email"
          className="sharebar__btn js-social-share"
          onClick={(e) => handleSocialShare(e, "mail")}
        >
          <svg className="icon h-[24px] w-[24px]" viewBox="0 0 32 32">
            <path d="M28,3H4A3.957,3.957,0,0,0,0,7V25a3.957,3.957,0,0,0,4,4H28a3.957,3.957,0,0,0,4-4V7A3.957,3.957,0,0,0,28,3Zm.6,6.8-12,9a1,1,0,0,1-1.2,0l-12-9A1,1,0,0,1,4.6,8.2L16,16.75,27.4,8.2a1,1,0,1,1,1.2,1.6Z" />
          </svg>
        </button>
      </li>
      {/* Add native share button at the end for desktop if available */}
      {canShare && !isTouch && (
        <li>
          <button
            type="button"
            aria-label="Share with System"
            className="sharebar__btn js-social-share"
            onClick={handleNativeShare}
            disabled={!imagesLoaded}
          >
            <svg
              className="icon h-[24px] w-[24px]"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M18 16.08C17.24 16.08 16.56 16.37 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.22C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.78C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.22L15.16 18.35C15.11 18.56 15.08 18.78 15.08 19C15.08 20.66 16.42 22 18.08 22C19.74 22 21.08 20.66 21.08 19C21.08 17.34 19.74 16 18.08 16H18V16.08Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </li>
      )}
    </ul>
  );

  return (
    <>
      {/* Render standard share buttons based on variant */}
      {(variant === "standard" || variant === "combo") && (
        <section className={containerClassName}>
          {showOnlyNativeButton
            ? renderNativeShareButton()
            : renderSocialButtons()}

          {/* Inline CSS for the sharebar */}
          <style>{`
            .sharebar__btn {
              --size: ${inlineSize}px;
              width: var(--size);
              height: var(--size);
              display: flex;
              background-color: rgba(17, 24, 39, 0.1);
              border-radius: 50%;
              transition: 0.2s;
              justify-content: center;
              align-items: center;
              cursor: pointer;
              border: none;
              padding: 0;
            }
            .sharebar__btn .icon {
              --size: ${inlineSize / 2}px;
              width: var(--size);
              height: var(--size);
              display: block;
              margin: auto;
              color: #374151;
              transition: color 0.2s;
              fill: currentColor;
              flex-shrink: 0;
            }
            .sharebar__btn:hover {
              background-color: rgba(17, 24, 39, 0.07);
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
                0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }
            .sharebar__btn:hover .icon {
              color: #111827;
            }

            .native-share-btn {
              margin: 0 auto;
            }
            .native-share-btn .icon {
            }
            .native-share-btn:hover {
            }

            .sharebar {
            }
          `}</style>
        </section>
      )}

      {/* Render sticky sharebar based on variant */}
      {(variant === "sticky" || variant === "combo") && (
        <StickyShareBar
          canShare={canShare}
          nativeShare={handleNativeShare}
          handleSocialShare={handleSocialShare}
          imgUrls={imgUrls}
          summaryContent={summaryContent}
          shareUrl={shareUrl}
          postTitle={postTitle}
          hashtags={hashtags}
          isTouch={isTouch}
        />
      )}
    </>
  );
};
