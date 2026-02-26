# @page-speed/social-share

Performance-optimized social sharing component for React applications. Supports inline buttons, a scroll-aware sticky sidebar, or both combined -- with automatic native Web Share API integration on supported devices.

## Installation

```bash
pnpm add @page-speed/social-share
# or
npm install @page-speed/social-share
```

### Peer dependencies

| Package | Version |
|---|---|
| `react` | `>=18.0.0` |
| `react-dom` | `>=18.0.0` |
| `@opensite/hooks` | `>=2.0.0` |

## Quick start

```tsx
import { SocialShare } from "@page-speed/social-share";

export default function BlogPost() {
  return (
    <SocialShare
      postTitle="My Blog Post"
      shareUrl="https://example.com/my-post"
      summaryContent="A short summary of the article for email sharing."
      imgUrls={["https://example.com/og-image.jpg"]}
      hashtags={["react", "webdev"]}
    />
  );
}
```

## Exports

The package exposes four sub-path entry points for tree-shaking:

```ts
// Main entry -- everything
import { SocialShare, useMobileShare } from "@page-speed/social-share";
import type { SocialShareProps, ShareParams, ShareResult } from "@page-speed/social-share";

// Sub-path imports for smaller bundles
import { SocialShare } from "@page-speed/social-share/core";
import { useMobileShare } from "@page-speed/social-share/hooks";
import type { SocialShareProps } from "@page-speed/social-share/types";
```

| Entry point | Contents |
|---|---|
| `.` | `SocialShare`, `useMobileShare`, all types |
| `./core` | `SocialShare` component + re-exported `SocialShareProps` type |
| `./hooks` | `useMobileShare` hook |
| `./types` | `SocialShareProps`, `ShareParams`, `ShareResult` type definitions |

## Component: `SocialShare`

The primary export. Renders social share buttons for X (Twitter), Facebook, Pinterest, LinkedIn, Email, and the native Web Share API.

### Props (`SocialShareProps`)

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|
| `postTitle` | `string` | -- | Yes | Title text used in share intents (tweet text, email subject, Pinterest description). |
| `shareUrl` | `string` | -- | Yes | The canonical URL to share. |
| `summaryContent` | `string` | -- | Yes | Short summary included in the email body. |
| `imgUrls` | `string[]` | `undefined` | No | Image URLs. The first image is used for Pinterest `media` param. All images are attached to native share payloads when supported. Pinterest button only appears when at least one image is provided. |
| `hashtags` | `string[]` | `[]` | No | Hashtags for X/Twitter (rendered without `#`, comma-separated). |
| `variant` | `"standard"` \| `"sticky"` \| `"combo"` | `"standard"` | No | Layout variant (see [Variants](#variants) below). |
| `inlineSize` | `number` | `42` | No | Width and height in pixels for each inline (standard) button. Icon size is automatically derived as half this value. |
| `containerClassName` | `string` | `""` | No | Additional CSS class applied to the outer `<section>` wrapper of the standard variant. |
| `disableImageAttachments` | `boolean` | `false` | No | When `true`, skips image fetching/conversion and does not attach images to native share payloads. Useful when images are behind auth or CORS restrictions. |

### Variants

#### `"standard"` (default)

Renders a horizontal row of circular share buttons inline with your content.

```tsx
<SocialShare
  variant="standard"
  postTitle="My Post"
  shareUrl="https://example.com/post"
  summaryContent="Post summary"
/>
```

#### `"sticky"`

Renders a vertical floating sidebar on the right edge of the viewport. The bar appears after the user scrolls past 200px (or past a `triggerRef` element) and hides when a `<footer>` element comes into view. Rendered via `ReactDOM.createPortal` to avoid layout conflicts.

```tsx
<SocialShare
  variant="sticky"
  postTitle="My Post"
  shareUrl="https://example.com/post"
  summaryContent="Post summary"
/>
```

#### `"combo"`

Renders both the standard inline buttons **and** the sticky sidebar simultaneously.

```tsx
<SocialShare
  variant="combo"
  postTitle="My Post"
  shareUrl="https://example.com/post"
  summaryContent="Post summary"
/>
```

### Adaptive behavior

The component automatically adapts to the device:

| Context | Behavior |
|---|---|
| **Mobile/tablet + touch + Web Share API** | Shows a single native share button (opens the OS share sheet). |
| **Desktop + Web Share API** | Shows all social buttons **plus** a native share button at the end. |
| **Desktop without Web Share API** | Shows social buttons only (X, Facebook, Pinterest, LinkedIn, Email). |

## Hook: `useMobileShare`

Low-level hook that wraps the [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API). Use this directly if you need custom share UI.

### Parameters (`ShareParams`)

| Param | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | -- | Share title (required). |
| `url` | `string` | `undefined` | URL to share. |
| `imageUrls` | `string[]` | `undefined` | Image URLs to fetch, convert to base64, and attach as files. |
| `images` | `string[]` | `undefined` | Pre-converted base64 image strings (fallback when `imageUrls` is empty). |
| `attachImages` | `boolean` | `true` | When `false`, skips all image processing and never attaches files. |

### Return value (`ShareResult`)

| Field | Type | Description |
|---|---|---|
| `share` | `() => Promise<void>` | Trigger the native share dialog. Gracefully falls back to sharing without files if file sharing is unsupported. |
| `canShare` | `boolean` | `true` when `navigator.share` is available on the current device. |
| `error` | `string \| null` | Error message from the last failed share attempt, or `null`. |

### Example

```tsx
import { useMobileShare } from "@page-speed/social-share/hooks";

function CustomShareButton() {
  const { share, canShare, error } = useMobileShare({
    title: "Check this out",
    url: "https://example.com",
    imageUrls: ["https://example.com/photo.jpg"],
  });

  if (!canShare) return null;

  return (
    <>
      <button onClick={share}>Share</button>
      {error && <p>Error: {error}</p>}
    </>
  );
}
```

## Supported platforms

### Social share URL endpoints

| Platform | Endpoint | Parameters |
|---|---|---|
| **X (Twitter)** | `https://twitter.com/intent/tweet` | `text`, `url`, `hashtags` |
| **Facebook** | `https://www.facebook.com/sharer.php` | `u` (URL only) |
| **Pinterest** | `https://pinterest.com/pin/create/button` | `url`, `media`, `description` |
| **LinkedIn** | `https://www.linkedin.com/sharing/share-offsite/` | `url` (title/description read from page OG tags) |
| **Email** | `mailto:` | `subject`, `body` |

### Web Share API browser compatibility

| Browser | Support |
|---|---|
| Chrome 128+ | Full |
| Edge 104+ | Full |
| Safari 12.1+ (macOS), 12.2+ (iOS) | Full |
| Samsung Internet 8.2+ | Full |
| Opera 114+ | Full |
| Firefox Android 147+ | Full |
| Firefox Desktop | Not supported (experimental flag only) |

When the Web Share API is unavailable, the component gracefully falls back to showing only the URL-based social buttons.

## Styling

The component uses [Tailwind CSS 4](https://tailwindcss.com/) with semantic design tokens from the `@theme` configuration. All styling is done via utility classes -- there are no inline `<style>` tags or CSS files to import.

### Design tokens used

| Token | Usage |
|---|---|
| `bg-card` | Sticky bar background |
| `text-card-foreground` | Icon hover color |
| `bg-muted` | Inline button background, sticky button hover pseudo-element |
| `text-muted-foreground` | Icon default color |
| `border-border` | Sticky bar border |

To customize the appearance, override these CSS custom properties in your theme. The component inherits all colors dynamically, making it compatible with light/dark mode and custom brand themes.

## Performance

### Bundle size

| Entry | Raw | Gzipped |
|---|---|---|
| `index.js` (ESM) | 26.39 KB | 6.02 KB |
| `core/index.js` | 26.35 KB | 6.01 KB |
| `hooks/index.js` | 4.49 KB | 1.48 KB |

### Optimizations

- **Module-level constants** -- All CSS class strings and share URL constants are hoisted outside components to eliminate per-render allocations.
- **`useCallback` throughout** -- `getSocialUrl`, `handleSocialShare`, `handleNativeShare`, and the `share` function in `useMobileShare` are all stabilized with `useCallback`.
- **Pure utility extraction** -- `fetchBlob`, `urlToBase64`, and `dataURLtoFile` are defined at module scope (not inside hooks), so they are never recreated.
- **Passive scroll listeners** -- The sticky variant uses `{ passive: true }` scroll event listeners for zero scroll-jank.
- **Portal rendering** -- The sticky sidebar renders via `ReactDOM.createPortal` to avoid triggering parent re-layouts.
- **Image preloading** -- Images are preloaded into the browser cache on mount so they are ready when the user clicks share.
- **Graceful degradation** -- If `IntersectionObserver` is unavailable, the sticky bar shows immediately rather than breaking.
- **Tree-shakable** -- Sub-path exports allow consumers to import only what they need. The package is marked `"sideEffects": false`.

## Image handling

When `imgUrls` is provided and `disableImageAttachments` is `false`:

1. Images are **preloaded** into the browser cache via `new Image()` on component mount.
2. For native sharing, images are **fetched as blobs** and converted to base64 `File` objects.
3. S3 URLs matching the allowed bucket are fetched through a CORS proxy (`/media_proxy`). All other URLs use a direct fetch with `no-cors` fallback.
4. If file sharing is not supported by the device (checked via `navigator.canShare`), the share falls back to URL-only sharing automatically.

Set `disableImageAttachments={true}` to skip all image processing when images are behind authentication or when you want faster share interactions.

## Architecture

```
src/
  index.ts              Main barrel export
  core/
    index.ts            Re-exports SocialShare + SocialShareProps
    social-share.tsx    SocialShare component + StickyShareBar subcomponent
  hooks/
    index.ts            Re-exports useMobileShare
    useMobileShare.tsx  Web Share API hook + image proxy utilities
  types/
    index.ts            Re-exports all type definitions
    social-share.ts     SocialShareProps, ShareParams, ShareResult
```

### Build

Built with [tsup](https://tsup.egoist.dev/). Outputs ESM + CJS with TypeScript declarations and source maps.

```bash
pnpm build          # Production build
pnpm dev            # Watch mode
pnpm type-check     # TypeScript validation (tsc --noEmit)
pnpm bundle-analysis # Print raw + gzipped sizes
pnpm test           # Run tests with Vitest
```

## License

MIT
