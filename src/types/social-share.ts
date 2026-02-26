export type SocialShareProps = {
  containerClassName?: string;
  summaryContent: string;
  shareUrl: string;
  postTitle: string;
  imgUrls?: string[];
  hashtags?: string[];
  variant?: "standard" | "sticky" | "combo";
  inlineSize?: number;
  /**
   * When true, skips any image fetching/conversion and does not attach images to native share payloads.
   * Defaults to false to preserve existing behavior.
   */
  disableImageAttachments?: boolean;
};

export interface ShareParams {
  url?: string;
  title: string;
  imageUrls?: string[];
  images?: string[];
  /**
   * When true (default), the hook will attempt to fetch/convert images and attach them to the native share payload.
   * When false, the hook skips any image fetching/conversion and never attaches files to the share payload.
   */
  attachImages?: boolean;
}

export interface ShareResult {
  share: () => Promise<void>;
  error: string | null;
  canShare: boolean;
}
