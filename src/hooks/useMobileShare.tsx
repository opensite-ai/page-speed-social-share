"use client";

import { useState, useEffect, useCallback } from "react";
import type { ShareParams, ShareResult } from "../types";

// Debug logging helper - only logs when DEBUG_SOCIAL_SHARE is true
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

// Helper: Fetch a URL as a blob via the Rails API proxy.
const fetchBlob = async (url: string): Promise<Blob> => {
  const proxyUrl = "https://api.dashtrack.com/media_proxy";

  const isAllowedS3Url = url.startsWith(
    "https://toastability-production.s3.amazonaws.com",
  );

  log("fetchBlob", "Starting fetch", { url, isAllowedS3Url });

  try {
    if (isAllowedS3Url) {
      log("fetchBlob", "Using proxy for S3 URL", { proxyUrl });
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Referrer-Policy": "origin",
        },
        credentials: "include",
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        log("fetchBlob", "Proxy fetch failed", { status: response.status });
        throw new Error(`Failed to fetch ${url}`);
      }

      const blob = response.blob();
      log("fetchBlob", "Proxy fetch successful", { size: (await blob).size });
      return blob;
    } else {
      // Try standard CORS fetch first - this works when the image server
      // returns proper Access-Control-Allow-Origin headers.
      log("fetchBlob", "Fetching with CORS mode", { url });
      const response = await fetch(url, {
        mode: "cors",
      });
      const blob = response.blob();
      log("fetchBlob", "CORS fetch complete", { size: (await blob).size });
      return blob;
    }
  } catch (error) {
    log("fetchBlob", "Primary fetch failed, trying fallback", {
      error: String(error),
    });
    try {
      const response = await fetch(url);
      const blob = response.blob();
      log("fetchBlob", "Fallback fetch successful", {
        size: (await blob).size,
      });
      return blob;
    } catch (fallbackError) {
      log("fetchBlob", "All fetch attempts failed", {
        error: String(fallbackError),
      });
      throw error;
    }
  }
};

/** Convert a remote image URL to a base64 data URL via the proxy. */
const urlToBase64 = async (url: string): Promise<string> => {
  log("urlToBase64", "Converting URL to base64", { url });
  try {
    const blob = await fetchBlob(url);

    // Opaque responses from no-cors produce 0-byte blobs – skip them.
    if (blob.size === 0) {
      log("urlToBase64", "Got empty blob, skipping", { url });
      return "";
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        log("urlToBase64", "Conversion successful", {
          url,
          resultLength: result?.length ?? 0,
          preview: result?.substring(0, 50) + "...",
        });
        resolve(result);
      };
      reader.onerror = () => {
        log("urlToBase64", "FileReader error", { url });
        resolve("");
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    log("urlToBase64", "Conversion failed", { url, error: String(error) });
    return "";
  }
};

/** Convert a base64 data URL string into a File object. */
const dataURLtoFile = (dataurl: string): File | undefined => {
  if (!dataurl) {
    log("dataURLtoFile", "No data URL provided");
    return undefined;
  }

  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1];
  if (!mime) {
    log("dataURLtoFile", "Could not extract MIME type", {
      dataurlPreview: dataurl.substring(0, 50),
    });
    return undefined;
  }

  try {
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    const file = new File([u8arr], "image.jpg", { type: mime });
    log("dataURLtoFile", "File created successfully", {
      size: file.size,
      type: mime,
    });
    return file;
  } catch (error) {
    log("dataURLtoFile", "Failed to create file", { error: String(error) });
    return undefined;
  }
};

const useMobileShare = (params: ShareParams): ShareResult => {
  const [error, setError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState<boolean>(false);
  const [base64Images, setBase64Images] = useState<string[]>([]);
  const attachmentsEnabled = params.attachImages ?? true;

  log("useMobileShare", "Hook initialized", {
    title: params.title,
    text: params.text?.substring(0, 50) + "...",
    url: params.url,
    imageCount: params.imageUrls?.length ?? 0,
    attachmentsEnabled,
  });

  // Stable key for imageUrls so the effect only re-runs when the actual
  // URL values change, not when the parent passes a new array reference.
  const imageUrlsKey = params.imageUrls?.join(",") ?? "";

  // Convert images to base64 if imageUrls are provided
  useEffect(() => {
    log("useMobileShare", "Image conversion effect running", {
      attachmentsEnabled,
      imageUrlsKey: imageUrlsKey?.substring(0, 100) + "...",
    });

    if (!attachmentsEnabled) {
      log(
        "useMobileShare",
        "Image attachments disabled, clearing base64Images",
      );
      setBase64Images([]);
      return;
    }

    if (!imageUrlsKey) {
      log("useMobileShare", "No image URLs provided, clearing base64Images");
      setBase64Images([]);
      return;
    }

    let cancelled = false;
    const urls = imageUrlsKey.split(",");

    const convertImages = async () => {
      log("useMobileShare", "Starting image conversion", {
        urlCount: urls.length,
      });
      try {
        const converted = await Promise.all(urls.map((u) => urlToBase64(u)));
        if (!cancelled) {
          const validImages = converted.filter(Boolean);
          log("useMobileShare", "Image conversion complete", {
            requested: urls.length,
            successful: validImages.length,
          });
          setBase64Images(validImages);
        }
      } catch (error) {
        if (!cancelled) {
          log("useMobileShare", "Image conversion failed", {
            error: String(error),
          });
          setBase64Images([]);
        }
      }
    };

    convertImages();

    return () => {
      cancelled = true;
      log("useMobileShare", "Image conversion effect cleaned up");
    };
  }, [attachmentsEnabled, imageUrlsKey]);

  // Check if sharing is available
  useEffect(() => {
    const hasShare =
      typeof navigator !== "undefined" &&
      typeof (navigator as any).share === "function";

    log("useMobileShare", "Checking share availability", {
      hasNavigator: typeof navigator !== "undefined",
      hasShareFunction: hasShare,
    });

    if (hasShare) {
      setCanShare(true);
      log("useMobileShare", "Native share is available");
    }
  }, []);

  const share = useCallback(async () => {
    const { url, title, text } = params;

    log("useMobileShare", "share() called", {
      title,
      text: text?.substring(0, 50) + "...",
      url,
      base64ImageCount: base64Images.length,
      attachmentsEnabled,
    });

    // Build share data: combine text + URL into the 'text' field.
    // When 'url' is set as a separate property, many native apps (especially
    // Messages on macOS / iOS) only share the URL and silently discard 'text'.
    // By embedding the URL inside the text we ensure the full content reaches
    // the share target.
    let fullText = text || title || "";
    if (url) {
      fullText = fullText ? `${fullText}\n\n${url}` : url;
    }

    const shareData: ShareData = {
      title,
      text: fullText,
    };

    log("useMobileShare", "Built shareData", {
      title: shareData.title,
      text: shareData.text?.substring(0, 100) + "...",
    });

    try {
      // Only attempt file attachment when enabled AND we have converted images
      if (attachmentsEnabled && base64Images.length > 0) {
        log("useMobileShare", "Attempting to attach images", {
          count: base64Images.length,
        });

        const files = (
          await Promise.all(
            base64Images.map(async (image) => {
              try {
                if (image.startsWith("data:")) {
                  return dataURLtoFile(image);
                }
                return null;
              } catch {
                return null;
              }
            }),
          )
        ).filter(Boolean) as File[];

        log("useMobileShare", "Files prepared", {
          fileCount: files.length,
          sizes: files.map((f) => f.size),
        });

        if (files.length > 0) {
          const shareDataWithFiles = { ...shareData, files };

          const canShareFiles =
            navigator.canShare && navigator.canShare(shareDataWithFiles);
          log("useMobileShare", "Checking if can share with files", {
            canShareFiles,
          });

          if (canShareFiles) {
            log("useMobileShare", "Sharing with files attached");
            await navigator.share(shareDataWithFiles);
            return;
          }
          // If canShare rejects files, fall through to share without them
          log(
            "useMobileShare",
            "Cannot share with files, falling back to share without files",
          );
        }
      }

      // Share without files
      const canShareBasic = navigator.canShare && navigator.canShare(shareData);
      log("useMobileShare", "Checking if can share basic", { canShareBasic });

      if (canShareBasic) {
        log("useMobileShare", "Calling navigator.share with basic data");
        await navigator.share(shareData);
        log("useMobileShare", "Share completed successfully");
      } else if (typeof navigator.share === "function") {
        // Some browsers don't implement canShare – try share directly
        log("useMobileShare", "Trying share directly (no canShare available)");
        await navigator.share(shareData);
        log("useMobileShare", "Share completed successfully");
      } else {
        log("useMobileShare", "Share not supported on this device");
        throw new Error(
          "Sharing this content is not supported on this device.",
        );
      }
    } catch (err: any) {
      // AbortError means the user cancelled – not a real error
      if (err?.name === "AbortError") {
        log("useMobileShare", "Share was cancelled by user");
        return;
      }

      log("useMobileShare", "Share failed with error", {
        name: err?.name,
        message: err?.message,
      });
      setError(err?.message ?? "Share failed");
    }
  }, [params, attachmentsEnabled, base64Images]);

  log("useMobileShare", "Returning hook result", {
    canShare,
    hasError: !!error,
  });

  return { share, error, canShare };
};

export default useMobileShare;
