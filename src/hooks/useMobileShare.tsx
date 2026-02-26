import * as React from "react";
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
      console.log(`Using media proxy for S3 URL: ${url}`);
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Adding referrer policy to help with origin validation
          "Referrer-Policy": "origin",
        },
        credentials: "include",
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        console.warn(
          `Proxy request failed with status ${response.status}: ${response.statusText}`,
        );
        throw new Error(`Failed to fetch ${url}`);
      }

      return response.blob();
    } else {
      // For non-S3 URLs, try a direct fetch as fallback
      console.log(`Using direct fetch for non-S3 URL: ${url}`);
      const response = await fetch(url, {
        // Use no-cors mode as fallback for external resources
        mode: "no-cors",
        credentials: "same-origin",
      });
      return response.blob();
    }
  } catch (error) {
    console.error(`Error in fetchBlob for ${url}:`, error);

    // Last resort fallback - try a direct fetch with no special options
    // This won't work for cross-origin requests without CORS but worth a try
    console.log("Attempting last resort direct fetch");
    try {
      const response = await fetch(url);
      return response.blob();
    } catch (fallbackError) {
      console.error("Fallback fetch also failed:", fallbackError);
      throw error; // Throw the original error
    }
  }
};

const useMobileShare = (params: ShareParams): ShareResult => {
  const [error, setError] = React.useState<string | null>(null);
  const [canShare, setCanShare] = React.useState<boolean>(false);
  const [base64Images, setBase64Images] = React.useState<string[]>([]);
  const attachmentsEnabled = params.attachImages ?? true;

  const urlToBase64 = async (url: string): Promise<string> => {
    try {
      // Use the proxy fetch instead of direct fetching to avoid CORS issues
      const blob = await fetchBlob(url);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting image to base64:", error);
      return "";
    }
  };

  // Convert images to base64 if imageUrls are provided
  React.useEffect(() => {
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
  React.useEffect(() => {
    const checkSharingAvailability = () => {
      if (
        typeof navigator !== "undefined" &&
        typeof (navigator as any).share === "function"
      ) {
        setCanShare(true);
      } else {
        setCanShare(false);
      }
    };

    checkSharingAvailability();
  }, []);

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

  const share = async () => {
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
        console.log(`Preparing to share ${imagesToShare.length} images`);

        // Ensure images are fully loaded and converted before attempting to share
        const files = await Promise.all(
          imagesToShare
            .map(async (image, index) => {
              try {
                console.log(
                  `Processing image ${index + 1}/${imagesToShare.length}`,
                );

                // If it's already a base64 string
                if (typeof image === "string" && image.startsWith("data:")) {
                  console.log(`Image ${index + 1} is already a base64 string`);
                  return dataURLtoFile(image);
                }
                // If it's a URL that needs to be fetched and converted
                else if (
                  typeof image === "string" &&
                  (image.startsWith("http") || image.startsWith("/"))
                ) {
                  console.log(
                    `Image ${index + 1} is a URL, fetching via proxy`,
                  );
                  const base64 = await urlToBase64(image);
                  return dataURLtoFile(base64);
                }
                return null;
              } catch (e) {
                console.warn(`Error processing image ${index + 1}:`, e);
                return null;
              }
            })
            .filter(Boolean),
        );

        if (files.length > 0) {
          console.log(
            `Successfully processed ${files.length} files for sharing`,
          );
          shareData.files = files.filter(Boolean);
        } else {
          console.warn("No files were successfully processed for sharing");
        }
      }

      // Check if the browser/device can share the content with the configured data
      if (navigator.canShare && navigator.canShare(shareData)) {
        console.log("Device can share with the provided data", shareData);
        await navigator.share(shareData);
      } else {
        console.warn("Device cannot share with the provided data", shareData);
        // Try without files if sharing with files is not supported
        if (shareData.files && !navigator.canShare(shareData)) {
          console.log("Trying to share without files");
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
      console.error("Native Sharing Error: ", error.message);
      setError(error.message);
    }
  };

  return { share, error, canShare };
};

export default useMobileShare;
