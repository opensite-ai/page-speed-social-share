# How We Called It from our CMS

```tsx
const shareImage = ogImageUrl || props.initialOgImage || "";
  
<SmartShare
  variant="combo"
  containerClassName="mb-4"
  postTitle={shareTitle}
  shareUrl={shareUrl}
  summaryContent={shareDescription}
  imgUrls={
    shareImage
      ? [shareImage]
      : []
  }
  hashtags={["BrandAssets", "Design", "Marketing"]}
  disableImageAttachments
/>
```
