"use client";

import React, { useCallback, useState, useEffect } from "react";
import ReactDOM from "react-dom";
import useMobileShare from "../hooks/useMobileShare";
import { useIsTouchDevice } from "@opensite/hooks/useIsTouchDevice";
import { useScreen } from "@opensite/hooks/useScreen";
import type { SocialShareProps } from "../types";

const X_SHARE_URL = "https://twitter.com/intent/tweet";
const FACEBOOK_SHARE_URL = "https://www.facebook.com/sharer/sharer.php";
const PINTEREST_SHARE_URL = "https://pinterest.com/pin/create/button";
const LINKEDIN_SHARE_URL = "https://www.linkedin.com/shareArticle";
const MAIL_SHARE_URL = "mailto:";

// Debug logging helper - only logs when in development
const DEBUG =
  typeof process !== "undefined" && process.env?.NODE_ENV === "development";

const log = (
  category: string,
  action: string,
  data?: Record<string, unknown>,
) => {
  if (DEBUG) {
    console.log(`[SocialShare:${category}] ${action}`, data ?? "");
  }
};

/** Shared icon SVG class names used for both standard and sticky variants. */
const ICON_BASE =
  "block m-auto fill-current shrink-0 transition-colors duration-200";

/** Static class strings for sticky variant buttons – TW4 standard utilities only. */
const STICKY_BTN_CLASS =
  "group relative flex size-10 items-center justify-center rounded-full " +
  "transition-all duration-200 ease-out cursor-pointer " +
  "hover:bg-primary hover:text-primary-foreground hover:shadow-md";

const STICKY_ICON_CLASS = `${ICON_BASE} relative size-5 text-muted-foreground group-hover:text-primary-foreground`;

/** Static class strings for standard inline variant buttons. */
const INLINE_BTN_CLASS =
  "group flex items-center justify-center rounded-full bg-muted p-0 border-0 " +
  "transition-all duration-200 hover:bg-muted hover:shadow-lg cursor-pointer";

const INLINE_ICON_CLASS = `${ICON_BASE} text-muted-foreground group-hover:text-card-foreground`;

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
  isTouch?: boolean;
  scrollContainerSelector?: string;
  platforms: { x: boolean; facebook: boolean; pinterest: boolean; linkedIn: boolean; email: boolean; nativeTools: boolean };
}> = ({
  canShare,
  nativeShare,
  handleSocialShare,
  imgUrls,
  isTouch,
  scrollContainerSelector,
  platforms,
}) => {
    const [showSharebar, setShowSharebar] = useState<boolean>(false);
    const [hideSharebar, setHideSharebar] = useState<boolean>(false);
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
      null,
    );

    // Create a portal container when component mounts
    useEffect(() => {
      let container = document.getElementById("sticky-share-portal");

      if (!container) {
        container = document.createElement("div");
        container.id = "sticky-share-portal";
        document.body.appendChild(container);
      }

      setPortalContainer(container);

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

      // Locate an app-specific scroll container (if any).
      // When the page uses a fixed <main> with overflow-auto, window.scrollY
      // stays at 0 and we must read scrollTop from that element instead.
      const findScrollContainer = (): HTMLElement | null => {
        // 1. Consumer-supplied selector takes priority
        if (scrollContainerSelector) {
          const custom = document.querySelector(
            scrollContainerSelector,
          ) as HTMLElement | null;
          if (custom) return custom;
        }

        // 2. Common platform selectors
        const el = document.querySelector(
          "main.dashtrack-light, main.dashtrack-dark, main#os__root",
        ) as HTMLElement | null;

        return el || null;
      };

      const scroller = findScrollContainer();

      const handleScroll = () => {
        // Read scroll position from whichever source has a value.
        // This covers both custom-scroll-container apps and normal window scroll.
        const containerScroll = scroller ? scroller.scrollTop : 0;
        const windowScroll = window.scrollY || document.documentElement.scrollTop;
        const scrollY = Math.max(containerScroll, windowScroll);
        setShowSharebar(scrollY > 200);
      };

      // Listen on BOTH the scroll container and window for maximum compatibility.
      // One of them will fire regardless of how the page is structured.
      if (scroller) {
        scroller.addEventListener("scroll", handleScroll, { passive: true });
      }
      window.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();

      // Optional: hide when footer comes into view
      const footer = document.querySelector("footer, .footer");
      let footerObserver: IntersectionObserver | null = null;
      if (footer) {
        footerObserver = new IntersectionObserver(
          (entries) => {
            setHideSharebar(entries[0].isIntersecting);
          },
          { rootMargin: "0px", threshold: 0 },
        );
        footerObserver.observe(footer);
      }

      return () => {
        if (scroller) {
          scroller.removeEventListener("scroll", handleScroll);
        }
        window.removeEventListener("scroll", handleScroll);
        if (footerObserver) footerObserver.disconnect();
      };
    }, [scrollContainerSelector]);

    // The final class toggling for visibility
    const isActive = showSharebar && !hideSharebar;

    const showOnlyNativeButton = isTouch && canShare && platforms.nativeTools;

    const renderNativeShareButton = () => (
      <li>
        <button
          type="button"
          aria-label="Share"
          className={STICKY_BTN_CLASS}
          onClick={nativeShare}
        >
          <svg
            className={STICKY_ICON_CLASS}
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
          {platforms.x && (
            <li>
              <button
                type="button"
                aria-label="Share on X"
                className={STICKY_BTN_CLASS}
                onClick={(e) => handleSocialShare(e, "x")}
              >
                <svg className={STICKY_ICON_CLASS} viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
            </li>
          )}
          {/* Facebook */}
          {platforms.facebook && (
            <li>
              <button
                type="button"
                aria-label="Share on Facebook"
                className={STICKY_BTN_CLASS}
                onClick={(e) => handleSocialShare(e, "facebook")}
              >
                <svg className={STICKY_ICON_CLASS} viewBox="0 0 32 32">
                  <path d="M32,16A16,16,0,1,0,13.5,31.806V20.625H9.438V16H13.5V12.475c0-4.01,2.389-6.225,6.043-6.225a24.644,24.644,0,0,1,3.582.312V10.5H21.107A2.312,2.312,0,0,0,18.5,13v3h4.438l-.71,4.625H18.5V31.806A16,16,0,0,0,32,16Z" />
                </svg>
              </button>
            </li>
          )}
          {/* Pinterest (only if we have an image) */}
          {platforms.pinterest && imgUrls && imgUrls.length > 0 && (
            <li>
              <button
                type="button"
                aria-label="Share on Pinterest"
                className={STICKY_BTN_CLASS}
                onClick={(e) => handleSocialShare(e, "pinterest")}
              >
                <svg className={STICKY_ICON_CLASS} viewBox="0 0 32 32">
                  <path d="M16,0C7.2,0,0,7.2,0,16c0,6.8,4.2,12.6,10.2,14.9c-0.1-1.3-0.3-3.2,0.1-4.6c0.3-1.2,1.9-8,1.9-8 s-0.5-1-0.5-2.4c0-2.2,1.3-3.9,2.9-3.9c1.4,0,2,1,2,2.3c0,1.4-0.9,3.4-1.3,5.3c-0.4,1.6,0.8,2.9,2.4,2.9c2.8,0,5-3,5-7.3 c0-3.8-2.8-6.5-6.7-6.5c-4.6,0-7.2,3.4-7.2,6.9c0,1.4,0.5,2.8,1.2,3.7c0.1,0.2,0.1,0.3,0.1,0.5c-0.1,0.5-0.4,1.6-0.4,1.8 C9.5,21.9,9.3,22,9,21.8c-2-0.9-3.2-3.9-3.2-6.2c0-5,3.7-9.7,10.6-9.7c5.6,0,9.9,4,9.9,9.2c0,5.5-3.5,10-8.3,10 c-1.6,0-3.1-0.8-3.7-1.8c0,0-0.8,3.1-1,3.8c-0.4,1.4-1.3,3.1-2,4.2c1.5,0.5,3.1,0.7,4.7,0.7c8.8,0,16-7.2,16-16C32,7.2,24.8,0,16,0z " />
                </svg>
              </button>
            </li>
          )}
          {/* LinkedIn */}
          {platforms.linkedIn && (
            <li>
              <button
                type="button"
                aria-label="Share on LinkedIn"
                className={STICKY_BTN_CLASS}
                onClick={(e) => handleSocialShare(e, "linkedin")}
              >
                <svg className={STICKY_ICON_CLASS} viewBox="0 0 32 32">
                  <path d="M29,1H3A2,2,0,0,0,1,3V29a2,2,0,0,0,2,2H29a2,2,0,0,0,2-2V3A2,2,0,0,0,29,1ZM9.887,26.594H5.374V12.25H9.887ZM7.63,10.281a2.625,2.625,0,1,1,2.633-2.625A2.624,2.624,0,0,1,7.63,10.281ZM26.621,26.594H22.2V19.656c0-1.687,0-3.75-2.35-3.75s-2.633,1.782-2.633,3.656v7.126H12.8V12.25h4.136v1.969h.094a4.7,4.7,0,0,1,4.231-2.344c4.513,0,5.359,3,5.359,6.844Z" />
                </svg>
              </button>
            </li>
          )}
          {/* Email */}
          {platforms.email && (
            <li>
              <button
                type="button"
                aria-label="Share via Email"
                className={STICKY_BTN_CLASS}
                onClick={(e) => handleSocialShare(e, "mail")}
              >
                <svg className={STICKY_ICON_CLASS} viewBox="0 0 32 32">
                  <path d="M28,3H4A3.957,3.957,0,0,0,0,7V25a3.957,3.957,0,0,0,4,4H28a3.957,3.957,0,0,0,4-4V7A3.957,3.957,0,0,0,28,3Zm.6,6.8-12,9a1,1,0,0,1-1.2,0l-12-9A1,1,0,0,1,4.6,8.2L16,16.75,27.4,8.2a1,1,0,1,1,1.2,1.6Z" />
                </svg>
              </button>
            </li>
          )}
          {/* Add native share button on desktop only if available */}
          {platforms.nativeTools && canShare && !isTouch && (
            <li>
              <button
                type="button"
                aria-label="Share with System"
                className={STICKY_BTN_CLASS}
                onClick={nativeShare}
              >
                <svg
                  className={STICKY_ICON_CLASS}
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
        className={`fixed top-0 right-5 lg:right-8 flex h-full items-center pointer-events-none z-40 transition-all duration-300 ease-in-out ${isActive
          ? "opacity-100 visible translate-x-0"
          : "opacity-0 invisible translate-x-4"
          }`}
      >
        <ul className="pointer-events-auto bg-card backdrop-blur-sm rounded-full shadow-lg p-2 border border-border">
          {showOnlyNativeButton
            ? renderNativeShareButton()
            : renderSocialButtons()}
        </ul>
      </div>
    );

    return portalContainer
      ? ReactDOM.createPortal(shareBarContent, portalContainer)
      : null;
  };

/********************************************************************
 * SocialShare - main component
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
  scrollContainerSelector,
  platformsConfig,
}) => {
  // Merge caller-supplied flags with defaults (all true except email)
  const platforms = {
    x: true,
    facebook: true,
    pinterest: true,
    linkedIn: true,
    email: false,
    nativeTools: true,
    ...platformsConfig,
  };
  log("SocialShare", "Component rendering", {
    variant,
    postTitle,
    shareUrl,
    summaryContent: summaryContent?.substring(0, 50) + "...",
    imgUrls: imgUrls?.length ?? 0,
    hashtags,
    disableImageAttachments,
  });

  const { screenType } = useScreen();
  const { isTouchDevice: isTouch } = useIsTouchDevice();
  const isMobileOrTablet = screenType === "MOBILE" || screenType === "TABLET";

  // Pass summaryContent separately – the hook will compose the full text
  // by combining title + summaryContent + url (avoids duplicate postTitle).
  log("SocialShare", "Built share text", {
    summaryContent: summaryContent?.substring(0, 100) + "...",
  });

  // Setup native share capabilities
  const { share: originalNativeShare, canShare } = useMobileShare({
    title: postTitle,
    text: summaryContent || "",
    url: shareUrl,
    imageUrls: imgUrls,
    attachImages: !disableImageAttachments,
  });

  // Determine what to render based on device and capabilities
  const showOnlyNativeButton = isTouch && isMobileOrTablet && canShare && platforms.nativeTools;

  const handleNativeShare = useCallback(() => {
    log("handleNativeShare", "Native share triggered", { canShare });

    if (!canShare) {
      log("handleNativeShare", "Cannot share - canShare is false");
      return;
    }

    try {
      log("handleNativeShare", "Calling originalNativeShare()");
      originalNativeShare();
    } catch (error) {
      log("handleNativeShare", "Native share error", { error: String(error) });
      console.error("Error sharing content:", error);
    }
  }, [canShare, originalNativeShare]);

  const getSocialUrl = useCallback(
    (social: string) => {
      log("getSocialUrl", `Building URL for ${social}`, {
        postTitle,
        shareUrl,
        summaryContent: summaryContent?.substring(0, 50) + "...",
        hashtags,
        hasImages: !!(imgUrls && imgUrls.length > 0),
      });

      switch (social) {
        case "x": {
          let url = `${X_SHARE_URL}?text=${encodeURIComponent(postTitle)}`;
          if (shareUrl) {
            url += `&url=${encodeURIComponent(shareUrl)}`;
          }
          const formattedHashtags = hashtags
            .map((tag) => tag.replace(/\s+/g, ""))
            .join(",");
          if (formattedHashtags) {
            url += `&hashtags=${encodeURIComponent(formattedHashtags)}`;
          }
          log("getSocialUrl", "X/Twitter URL built", {
            url: url.substring(0, 150) + "...",
          });
          return url;
        }

        case "facebook": {
          // Facebook sharer supports 'quote' for pre-fill text and 'hashtag' for a single hashtag
          // Note: The link preview (title, description, image) always comes from OG tags on the shared URL
          let url = `${FACEBOOK_SHARE_URL}?u=${encodeURIComponent(shareUrl)}`;
          if (summaryContent || postTitle) {
            const quote = summaryContent
              ? `${postTitle}: ${summaryContent}`
              : postTitle;
            url += `&quote=${encodeURIComponent(quote)}`;
          }
          if (hashtags.length > 0) {
            // Facebook only supports a single hashtag, prefixed with #
            url += `&hashtag=${encodeURIComponent("#" + hashtags[0].replace(/\s+/g, ""))}`;
          }
          log("getSocialUrl", "Facebook URL built", {
            url: url.substring(0, 150) + "...",
          });
          return url;
        }

        case "linkedin": {
          // LinkedIn's shareArticle endpoint supports title and summary params
          let url = `${LINKEDIN_SHARE_URL}?mini=true&url=${encodeURIComponent(shareUrl)}`;
          if (postTitle) {
            url += `&title=${encodeURIComponent(postTitle)}`;
          }
          if (summaryContent) {
            url += `&summary=${encodeURIComponent(summaryContent)}`;
          }
          log("getSocialUrl", "LinkedIn URL built", {
            url: url.substring(0, 150) + "...",
          });
          return url;
        }

        case "pinterest": {
          let url = `${PINTEREST_SHARE_URL}?url=${encodeURIComponent(shareUrl)}`;
          if (imgUrls && imgUrls.length > 0) {
            url += `&media=${encodeURIComponent(imgUrls[0])}`;
          }
          // Pinterest supports a description parameter
          const desc = summaryContent
            ? `${postTitle} - ${summaryContent}`
            : postTitle;
          url += `&description=${encodeURIComponent(desc)}`;
          log("getSocialUrl", "Pinterest URL built", {
            url: url.substring(0, 150) + "...",
          });
          return url;
        }

        case "mail": {
          const subject = encodeURIComponent(postTitle);
          // Build body with title, summary, URL, and image links
          let bodyContent = "";
          if (postTitle) {
            bodyContent = postTitle;
          }
          if (summaryContent) {
            bodyContent += bodyContent
              ? `\n\n${summaryContent}`
              : summaryContent;
          }
          if (shareUrl) {
            bodyContent += bodyContent ? `\n\n${shareUrl}` : shareUrl;
          }
          if (imgUrls && imgUrls.length > 0) {
            bodyContent += bodyContent ? "\n\n" : "";
            bodyContent += imgUrls.join("\n");
          }
          const body = encodeURIComponent(bodyContent);
          const mailtoUrl = `${MAIL_SHARE_URL}?subject=${subject}&body=${body}`;
          log("getSocialUrl", "Mail URL built", {
            subject,
            bodyPreview: bodyContent.substring(0, 100) + "...",
            mailtoUrl: mailtoUrl.substring(0, 150) + "...",
          });
          return mailtoUrl;
        }

        default:
          log("getSocialUrl", `Unknown social platform: ${social}`);
          return "#";
      }
    },
    [postTitle, summaryContent, shareUrl, imgUrls, hashtags],
  );

  const handleSocialShare = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, social: string) => {
      event.preventDefault();
      log("handleSocialShare", `Handling share for ${social}`);

      const url = getSocialUrl(social);
      if (url === "#") {
        log("handleSocialShare", `Invalid URL for ${social}, aborting`);
        return;
      }

      log("handleSocialShare", `Opening share dialog for ${social}`, {
        urlPreview: url.substring(0, 100) + "...",
      });

      if (social === "mail") {
        // For mailto: links, create a temporary anchor element and click it.
        // This is more reliable than window.location.href in SPAs (e.g. Next.js)
        // which can intercept or silently swallow the navigation.
        // IMPORTANT: Do NOT set target="_blank" – that causes the browser to
        // open a new tab first which can be blocked by popup blockers and
        // prevents the mailto: protocol handler from firing on some platforms.
        log("handleSocialShare", "Opening mail client via anchor click");
        const link = document.createElement("a");
        link.href = url;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      } else {
        // For social platforms, open in a popup window
        const popupFeatures =
          "width=626,height=436,scrollbars=yes,resizable=yes";
        const popup = window.open(url, `${social}-share-dialog`, popupFeatures);

        if (popup) {
          log("handleSocialShare", `Popup opened successfully for ${social}`);
        } else {
          log(
            "handleSocialShare",
            `Popup blocked for ${social}, trying window.open without features`,
          );
          // If popup was blocked, try opening in a new tab
          window.open(url, "_blank");
        }
      }
    },
    [getSocialUrl],
  );

  // Computed icon size is half the button size
  const iconSize = Math.round(inlineSize / 2);

  // Render native share button for mobile touch devices
  const renderNativeShareButton = () => (
    <button
      type="button"
      aria-label="Share"
      className={`${INLINE_BTN_CLASS} mx-auto`}
      style={{ width: inlineSize, height: inlineSize }}
      onClick={handleNativeShare}
    >
      <svg
        className={INLINE_ICON_CLASS}
        style={{ width: iconSize, height: iconSize }}
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

  const renderSocialButtons = () => (
    <ul className="flex flex-wrap gap-2 lg:gap-3 justify-center">
      {/* X (formerly Twitter) */}
      {platforms.x && (
        <li>
          <button
            type="button"
            aria-label="Share on X"
            className={INLINE_BTN_CLASS}
            style={{ width: inlineSize, height: inlineSize }}
            onClick={(e) => handleSocialShare(e, "x")}
          >
            <svg
              className={INLINE_ICON_CLASS}
              style={{ width: iconSize, height: iconSize }}
              viewBox="0 0 24 24"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
        </li>
      )}
      {/* Facebook */}
      {platforms.facebook && (
        <li>
          <button
            type="button"
            aria-label="Share on Facebook"
            className={INLINE_BTN_CLASS}
            style={{ width: inlineSize, height: inlineSize }}
            onClick={(e) => handleSocialShare(e, "facebook")}
          >
            <svg
              className={INLINE_ICON_CLASS}
              style={{ width: iconSize, height: iconSize }}
              viewBox="0 0 32 32"
            >
              <path d="M32,16A16,16,0,1,0,13.5,31.806V20.625H9.438V16H13.5V12.475c0-4.01,2.389-6.225,6.043-6.225a24.644,24.644,0,0,1,3.582.312V10.5H21.107A2.312,2.312,0,0,0,18.5,13v3h4.438l-.71,4.625H18.5V31.806A16,16,0,0,0,32,16Z" />
            </svg>
          </button>
        </li>
      )}
      {/* Pinterest */}
      {platforms.pinterest && imgUrls && imgUrls.length > 0 && (
        <li>
          <button
            type="button"
            aria-label="Share on Pinterest"
            className={INLINE_BTN_CLASS}
            style={{ width: inlineSize, height: inlineSize }}
            onClick={(e) => handleSocialShare(e, "pinterest")}
          >
            <svg
              className={INLINE_ICON_CLASS}
              style={{ width: iconSize, height: iconSize }}
              viewBox="0 0 32 32"
            >
              <path d="M16,0C7.2,0,0,7.2,0,16c0,6.8,4.2,12.6,10.2,14.9c-0.1-1.3-0.3-3.2,0.1-4.6c0.3-1.2,1.9-8,1.9-8 s-0.5-1-0.5-2.4c0-2.2,1.3-3.9,2.9-3.9c1.4,0,2,1,2,2.3c0,1.4-0.9,3.4-1.3,5.3c-0.4,1.6,0.8,2.9,2.4,2.9c2.8,0,5-3,5-7.3  c0-3.8-2.8-6.5-6.7-6.5c-4.6,0-7.2,3.4-7.2,6.9c0,1.4,0.5,2.8,1.2,3.7c0.1,0.2,0.1,0.3,0.1,0.5c-0.1,0.5-0.4,1.6-0.4,1.8  C9.5,21.9,9.3,22,9,21.8c-2-0.9-3.2-3.9-3.2-6.2c0-5,3.7-9.7,10.6-9.7c5.6,0,9.9,4,9.9,9.2c0,5.5-3.5,10-8.3,10  c-1.6,0-3.1-0.8-3.7-1.8c0,0-0.8,3.1-1,3.8c-0.4,1.4-1.3,3.1-2,4.2c1.5,0.5,3.1,0.7,4.7,0.7c8.8,0,16-7.2,16-16C32,7.2,24.8,0,16,0z " />
            </svg>
          </button>
        </li>
      )}
      {/* LinkedIn */}
      {platforms.linkedIn && (
        <li>
          <button
            type="button"
            aria-label="Share on LinkedIn"
            className={INLINE_BTN_CLASS}
            style={{ width: inlineSize, height: inlineSize }}
            onClick={(e) => handleSocialShare(e, "linkedin")}
          >
            <svg
              className={INLINE_ICON_CLASS}
              style={{ width: iconSize, height: iconSize }}
              viewBox="0 0 32 32"
            >
              <path d="M29,1H3A2,2,0,0,0,1,3V29a2,2,0,0,0,2,2H29a2,2,0,0,0,2-2V3A2,2,0,0,0,29,1ZM9.887,26.594H5.374V12.25H9.887ZM7.63,10.281a2.625,2.625,0,1,1,2.633-2.625A2.624,2.624,0,0,1,7.63,10.281ZM26.621,26.594H22.2V19.656c0-1.687,0-3.75-2.35-3.75s-2.633,1.782-2.633,3.656v7.126H12.8V12.25h4.136v1.969h.094a4.7,4.7,0,0,1,4.231-2.344c4.513,0,5.359,3,5.359,6.844Z" />
            </svg>
          </button>
        </li>
      )}
      {/* Email */}
      {platforms.email && (
        <li>
          <button
            type="button"
            aria-label="Share via Email"
            className={INLINE_BTN_CLASS}
            style={{ width: inlineSize, height: inlineSize }}
            onClick={(e) => handleSocialShare(e, "mail")}
          >
            <svg
              className={INLINE_ICON_CLASS}
              style={{ width: iconSize, height: iconSize }}
              viewBox="0 0 32 32"
            >
              <path d="M28,3H4A3.957,3.957,0,0,0,0,7V25a3.957,3.957,0,0,0,4,4H28a3.957,3.957,0,0,0,4-4V7A3.957,3.957,0,0,0,28,3Zm.6,6.8-12,9a1,1,0,0,1-1.2,0l-12-9A1,1,0,0,1,4.6,8.2L16,16.75,27.4,8.2a1,1,0,1,1,1.2,1.6Z" />
            </svg>
          </button>
        </li>
      )}
      {/* Add native share button at the end for desktop if available */}
      {platforms.nativeTools && canShare && !isTouch && (
        <li>
          <button
            type="button"
            aria-label="Share with System"
            className={INLINE_BTN_CLASS}
            style={{ width: inlineSize, height: inlineSize }}
            onClick={handleNativeShare}
          >
            <svg
              className={INLINE_ICON_CLASS}
              style={{ width: iconSize, height: iconSize }}
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
        </section>
      )}

      {/* Render sticky sharebar based on variant */}
      {(variant === "sticky" || variant === "combo") && (
        <StickyShareBar
          canShare={canShare}
          nativeShare={handleNativeShare}
          handleSocialShare={handleSocialShare}
          imgUrls={imgUrls}
          isTouch={isTouch}
          scrollContainerSelector={scrollContainerSelector}
          platforms={platforms}
        />
      )}
    </>
  );
};
