"use client";

import * as React from "react";

import type { IconProps } from "../types";
import { buildIconRequestUrl, fetchIconSvg, parseIconName } from "../utils";

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export function Icon({
  name,
  size = 28,
  color,
  className,
  alt,
  apiKey,
  baseUrl,
  fallback
}: IconProps) {
  const [svgContent, setSvgContent] = React.useState<string | null>(null);
  const [hasError, setHasError] = React.useState(false);

  const parsedName = React.useMemo(() => parseIconName(name), [name]);

  const requestUrl = React.useMemo(() => {
    if (!parsedName) {
      return null;
    }

    try {
      return buildIconRequestUrl({ name, size, apiKey, baseUrl });
    } catch {
      return null;
    }
  }, [apiKey, baseUrl, name, parsedName, size]);

  React.useEffect(() => {
    let disposed = false;

    if (!requestUrl) {
      setSvgContent(null);
      setHasError(true);
      return;
    }

    setHasError(false);
    setSvgContent(null);

    fetchIconSvg(requestUrl)
      .then((svg) => {
        if (!disposed) {
          setSvgContent(svg);
        }
      })
      .catch(() => {
        if (!disposed) {
          setHasError(true);
        }
      });

    return () => {
      disposed = true;
    };
  }, [requestUrl]);

  const ariaLabel = alt || parsedName?.iconName;
  const a11yProps = ariaLabel
    ? ({ role: "img", "aria-label": ariaLabel } as const)
    : ({ "aria-hidden": true } as const);

  if (!svgContent) {
    return (
      <span
        className={joinClassNames("inline-block", className)}
        style={{ width: size, height: size }}
        data-state={hasError ? "error" : "loading"}
        {...a11yProps}
      >
        {hasError ? fallback : null}
      </span>
    );
  }

  return (
    <span
      className={joinClassNames("inline-flex items-center justify-center", className)}
      style={{
        width: size,
        height: size,
        color: color || "inherit"
      }}
      data-state="ready"
      dangerouslySetInnerHTML={{ __html: svgContent }}
      {...a11yProps}
    />
  );
}

export const DynamicIcon = Icon;
