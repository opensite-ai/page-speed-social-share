import { useState, useEffect, useCallback } from "react";
import type { ShareParams, ShareResult } from "../types";

// Helper: Fetch a URL as a blob via the Rails API proxy.
// This sends a POST request to your proxy endpoint with credentials.
const fetchBlob = async (url: string): Promise<Blob> => {
  const proxyUrl = "https://api.dashtrack.com/media_proxy";

  // First check if the URL is from our allowed S3 bucket
  const isAllowedS3Url = url.startsWith(
    "https://toastability-production.s3.amazonaws.com",
  );

  try {
    // Only use the proxy for S3 URLs that match the controller's allowed host
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
      // For non-S3 URLs, try a direct fetch as fallback
      const response = await fetch(url, {
        mode: "no-cors",
        credentials: "same-origin",
      });
      return response.blob();
    }
  } catch (error) {
    // Last resort fallback - try a direct fetch with no special options
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
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
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

  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], "image.jpg", { type: mime });
};

const useMobileShare = (params: ShareParams): ShareResult => {
  const [error, setError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState<boolean>(false);
  const [base64Images, setBase64Images] = useState<string[]>([]);
  const attachmentsEnabled = params.attachImages ?? true;

  // Convert images to base64 if imageUrls are provided
  useEffect(() => {
    // If attachments are disabled, ensure we clear any previously converted images and skip processing
    if (!attachmentsEnabled) {
      setBase64Images([]);
      return;
    }

    const convertImages = async () => {
      if (params.imageUrls && params.imageUrls.length > 0) {
        const convertedImages = await Promise.all(
          params.imageUrls.map((url) => urlToBase64(url)),
        );
        setBase64Images(convertedImages.filter(Boolean));
      } else {
        setBase64Images([]);
      }
    };

    convertImages();
  }, [attachmentsEnabled, params.imageUrls]);

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
    const { url, title, imageUrls } = params;

    // Avoid duplication: either use title for the title and omit text,
    // or use something different for text than title
    const shareData: any = { title };

    // Add URL if available
    if (url) {
      shareData.url = url;
    }

    // Prioritize imageUrls conversion if provided
    const imagesToShare = attachmentsEnabled
      ? imageUrls && imageUrls.length > 0
        ? base64Images
        : params.images && params.images.length > 0
          ? params.images
          : []
      : [];

    // Files array must be constructed carefully for proper image sharing
    try {
      if (
        attachmentsEnabled &&
        Array.isArray(imagesToShare) &&
        imagesToShare.length > 0
      ) {
        // Ensure images are fully loaded and converted before attempting to share
        const files = await Promise.all(
          imagesToShare
            .map(async (image) => {
              try {
                // If it's already a base64 string
                if (typeof image === "string" && image.startsWith("data:")) {
                  return dataURLtoFile(image);
                }
                // If it's a URL that needs to be fetched and converted
                else if (
                  typeof image === "string" &&
                  (image.startsWith("http") || image.startsWith("/"))
                ) {
                  const base64 = await urlToBase64(image);
                  return dataURLtoFile(base64);
                }
                return null;
              } catch {
                return null;
              }
            })
            .filter(Boolean),
        );

        if (files.length > 0) {
          shareData.files = files.filter(Boolean);
        }
      }

      // Check if the browser/device can share the content with the configured data
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Try without files if sharing with files is not supported
        if (shareData.files) {
          delete shareData.files;
          if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
          } else {
            throw new Error(
              "Sharing this content is not supported on this device.",
            );
          }
        } else {
          throw new Error(
            "Sharing this content is not supported on this device.",
          );
        }
      }
    } catch (error: any) {
      setError(error.message);
    }
  }, [params, attachmentsEnabled, base64Images]);

  return { share, error, canShare };
};

export default useMobileShare;
