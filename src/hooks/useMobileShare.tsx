"use client";

import { useState, useEffect, useCallback } from "react";
import type { ShareParams, ShareResult } from "../types";

// Helper: Fetch a URL as a blob via the Rails API proxy.
const fetchBlob = async (url: string): Promise<Blob> => {
  const proxyUrl = "https://api.dashtrack.com/media_proxy";

  const isAllowedS3Url = url.startsWith(
    "https://toastability-production.s3.amazonaws.com",
  );

  try {
    if (isAllowedS3Url) {
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
        throw new Error(`Failed to fetch ${url}`);
      }

      return response.blob();
    } else {
      const response = await fetch(url, {
        mode: "no-cors",
        credentials: "same-origin",
      });
      return response.blob();
    }
  } catch (error) {
    try {
      const response = await fetch(url);
      return response.blob();
    } catch {
      throw error;
    }
  }
};

/** Convert a remote image URL to a base64 data URL via the proxy. */
const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const blob = await fetchBlob(url);

    // Opaque responses from no-cors produce 0-byte blobs – skip them.
    if (blob.size === 0) return "";

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
};

/** Convert a base64 data URL string into a File object. */
const dataURLtoFile = (dataurl: string): File | undefined => {
  if (!dataurl) return undefined;

  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1];
  if (!mime) return undefined;

  try {
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], "image.jpg", { type: mime });
  } catch {
    return undefined;
  }
};

const useMobileShare = (params: ShareParams): ShareResult => {
  const [error, setError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState<boolean>(false);
  const [base64Images, setBase64Images] = useState<string[]>([]);
  const attachmentsEnabled = params.attachImages ?? true;

  // Stable key for imageUrls so the effect only re-runs when the actual
  // URL values change, not when the parent passes a new array reference.
  const imageUrlsKey = params.imageUrls?.join(",") ?? "";

  // Convert images to base64 if imageUrls are provided
  useEffect(() => {
    if (!attachmentsEnabled) {
      setBase64Images([]);
      return;
    }

    if (!imageUrlsKey) {
      setBase64Images([]);
      return;
    }

    let cancelled = false;
    const urls = imageUrlsKey.split(",");

    const convertImages = async () => {
      try {
        const converted = await Promise.all(urls.map((u) => urlToBase64(u)));
        if (!cancelled) {
          setBase64Images(converted.filter(Boolean));
        }
      } catch {
        if (!cancelled) {
          setBase64Images([]);
        }
      }
    };

    convertImages();

    return () => {
      cancelled = true;
    };
  }, [attachmentsEnabled, imageUrlsKey]);

  // Check if sharing is available
  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      typeof (navigator as any).share === "function"
    ) {
      setCanShare(true);
    }
  }, []);

  const share = useCallback(async () => {
    const { url, title } = params;

    const shareData: ShareData = { title };

    if (url) {
      shareData.url = url;
    }

    try {
      // Only attempt file attachment when enabled AND we have converted images
      if (attachmentsEnabled && base64Images.length > 0) {
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

        if (files.length > 0) {
          const shareDataWithFiles = { ...shareData, files };

          if (navigator.canShare && navigator.canShare(shareDataWithFiles)) {
            await navigator.share(shareDataWithFiles);
            return;
          }
          // If canShare rejects files, fall through to share without them
        }
      }

      // Share without files
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else if (typeof navigator.share === "function") {
        // Some browsers don't implement canShare – try share directly
        await navigator.share(shareData);
      } else {
        throw new Error(
          "Sharing this content is not supported on this device.",
        );
      }
    } catch (err: any) {
      // AbortError means the user cancelled – not a real error
      if (err?.name !== "AbortError") {
        setError(err?.message ?? "Share failed");
      }
    }
  }, [params, attachmentsEnabled, base64Images]);

  return { share, error, canShare };
};

export default useMobileShare;
