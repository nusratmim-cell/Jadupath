"use client";

import { useCallback } from "react";
import { useCastContext } from "@/contexts/CastContext";

interface CastOptions {
  title: string;
  subtitle?: string;
  thumbnail?: string;
}

export function useChromecast() {
  const context = useCastContext();

  /**
   * Cast a video to the connected Chromecast device
   */
  const castVideo = useCallback(async (videoUrl: string, options: CastOptions) => {
    // Convert YouTube URLs to embeddable format if needed
    let contentId = videoUrl;
    let contentType = "video/mp4";

    if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
      // Extract video ID
      let videoId = "";
      if (videoUrl.includes("v=")) {
        videoId = videoUrl.split("v=")[1].split("&")[0];
      } else if (videoUrl.includes("youtu.be/")) {
        videoId = videoUrl.split("/").pop() || "";
      }

      if (videoId) {
        // Use YouTube URL directly for casting
        contentId = `https://www.youtube.com/watch?v=${videoId}`;
        contentType = "video/youtube";
      }
    }

    return context.castMedia(contentId, contentType, {
      title: options.title,
      subtitle: options.subtitle,
      thumbnail: options.thumbnail,
    });
  }, [context]);

  /**
   * Cast a PDF or web page to the connected Chromecast device
   */
  const castWebsite = useCallback(async (url: string, title: string) => {
    // For PDFs, we can use Google Docs Viewer or just display the URL
    const contentId = url.endsWith(".pdf")
      ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`
      : url;

    return context.castMedia(contentId, "text/html", {
      title,
    });
  }, [context]);

  /**
   * Cast custom HTML content
   */
  const castHTML = useCallback(async (htmlContent: string, title: string) => {
    // Create a data URL with the HTML content
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;

    return context.castMedia(dataUrl, "text/html", {
      title,
    });
  }, [context]);

  return {
    // State
    isAvailable: context.isAvailable,
    isConnected: context.isConnected,
    isConnecting: context.isConnecting,
    currentDevice: context.currentDevice,
    error: context.error,

    // Methods
    castVideo,
    castWebsite,
    castHTML,
    disconnect: context.disconnect,
    requestSession: context.requestSession,
  };
}
