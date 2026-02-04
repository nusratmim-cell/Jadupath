"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

// Default Media Receiver App ID (provided by Google)
const DEFAULT_MEDIA_RECEIVER_APP_ID = "CC1AD845";

interface MediaMetadata {
  title: string;
  subtitle?: string;
  thumbnail?: string;
  images?: Array<{url: string; width?: number; height?: number}>;
}

interface CastContextValue {
  isAvailable: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  currentDevice: string | null;
  currentSession: chrome.cast.Session | null;
  error: string | null;
  castMedia: (contentId: string, contentType: string, metadata: MediaMetadata) => Promise<void>;
  disconnect: () => Promise<void>;
  requestSession: () => Promise<chrome.cast.Session>;
}

const CastContext = createContext<CastContextValue | null>(null);

interface CastProviderProps {
  children: ReactNode;
}

export function CastProvider({ children }: CastProviderProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<chrome.cast.Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-clear errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Session listener
  const sessionListener = useCallback((session: chrome.cast.Session) => {
    console.log("Cast session started:", session);
    setCurrentSession(session);
    setCurrentDevice(session.receiver.friendlyName);
    setIsConnected(true);
    setIsConnecting(false);
    setError(null);

    // Add session update listener
    session.addUpdateListener((isAlive) => {
      console.log("Session update:", isAlive);
      if (!isAlive) {
        setCurrentSession(null);
        setCurrentDevice(null);
        setIsConnected(false);
      }
    });
  }, []);

  // Receiver listener
  const receiverListener = useCallback((availability: chrome.cast.ReceiverAvailability) => {
    console.log("=== Receiver Availability Changed ===");
    console.log("Availability value:", availability);
    console.log("AVAILABLE constant:", chrome.cast.ReceiverAvailability.AVAILABLE);
    console.log("UNAVAILABLE constant:", chrome.cast.ReceiverAvailability.UNAVAILABLE);
    console.log("Match AVAILABLE?:", availability === chrome.cast.ReceiverAvailability.AVAILABLE);

    if (availability === chrome.cast.ReceiverAvailability.AVAILABLE) {
      console.log("✅ Chromecast devices found on network!");
      console.log("   The cast button should now be enabled");
      setIsAvailable(true);
      setError(null); // Clear any previous errors
    } else {
      console.log("❌ No Chromecast devices found on network");
      console.log("   Troubleshooting:");
      console.log("   1. Is Chromecast powered on?");
      console.log("   2. Is Chromecast on same WiFi as this device?");
      console.log("   3. Try restarting Chromecast");
      console.log("   4. Check router firewall (allow mDNS on port 5353)");
      setIsAvailable(false);
    }
  }, []);

  // Initialize Cast SDK
  useEffect(() => {
    console.log("=== Cast SDK Initialization Debug ===");
    console.log("1. Window.chrome exists:", !!window.chrome);
    console.log("2. Chrome.cast exists:", !!window.chrome?.cast);
    console.log("3. Cast.isAvailable:", window.chrome?.cast?.isAvailable);

    // Check if script tag loaded
    const scriptTag = document.querySelector('script[src*="cast_sender.js"]');
    console.log("4. Cast script tag found:", !!scriptTag);

    // Check environment
    console.log("5. Environment:", {
      isHTTPS: window.location.protocol === 'https:',
      isLocalhost: window.location.hostname === 'localhost',
      hostname: window.location.hostname,
      userAgent: navigator.userAgent.includes('Chrome') || navigator.userAgent.includes('Edge') ? 'Chrome/Edge' : 'Other'
    });

    // Wait for Cast SDK to load
    const initializeCastApi = () => {
      if (!window.chrome || !window.chrome.cast || !window.chrome.cast.isAvailable) {
        console.warn("⚠️ Cast SDK not ready, will retry when available");
        return;
      }

      console.log("6. Initializing Cast SDK with receiver:", DEFAULT_MEDIA_RECEIVER_APP_ID);

      const sessionRequest = new chrome.cast.SessionRequest(DEFAULT_MEDIA_RECEIVER_APP_ID);

      const apiConfig = new chrome.cast.ApiConfig(
        sessionRequest,
        sessionListener,
        receiverListener,
        chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED,
        chrome.cast.DefaultActionPolicy.CREATE_SESSION
      );

      chrome.cast.initialize(
        apiConfig,
        () => {
          console.log("✅ Cast SDK initialized successfully!");
          console.log("7. Waiting for receiver availability callback...");
          console.log("   Make sure:");
          console.log("   - Chromecast device is on same WiFi network");
          console.log("   - Chromecast device is powered on");
          console.log("   - No firewall blocking mDNS/SSDP discovery");
        },
        (err) => {
          console.error("❌ Cast SDK initialization failed:", err);
          console.error("   Error code:", err?.code);
          console.error("   Error description:", err?.description);
          setError("কাস্ট SDK শুরু করতে ব্যর্থ হয়েছে");
        }
      );
    };

    // Set up global callback
    window.__onGCastApiAvailable = (isAvailable) => {
      console.log("=== __onGCastApiAvailable Callback ===");
      console.log("8. SDK Available:", isAvailable);
      if (isAvailable) {
        console.log("9. Attempting to initialize Cast API...");
        initializeCastApi();
      } else {
        console.error("❌ Cast API not available!");
        console.error("   Possible reasons:");
        console.error("   - Not using Chrome/Edge browser");
        console.error("   - Not on HTTPS or localhost");
        console.error("   - Script failed to load");
        setError("এই ব্রাউজারে কাস্ট সমর্থিত নয়। Chrome বা Edge ব্যবহার করুন।");
      }
    };

    // If SDK is already loaded, initialize immediately
    if (window.chrome && window.chrome.cast && window.chrome.cast.isAvailable) {
      console.log("10. SDK already loaded, initializing immediately");
      initializeCastApi();
    } else {
      console.log("10. Waiting for SDK to load via __onGCastApiAvailable callback...");
    }
  }, [sessionListener, receiverListener]);

  // Request a cast session - returns the session on success
  const requestSession = useCallback(async () => {
    if (!window.chrome || !window.chrome.cast) {
      setError("কাস্ট SDK পাওয়া যায়নি");
      return Promise.reject(new Error("Cast SDK not available"));
    }

    setIsConnecting(true);
    setError(null);

    return new Promise<chrome.cast.Session>((resolve, reject) => {
      chrome.cast.requestSession(
        (session) => {
          console.log("Session requested successfully:", session);
          sessionListener(session);
          resolve(session); // Return the session
        },
        (err) => {
          console.log("Cast session error details:", {
            code: err?.code,
            description: err?.description,
            details: err?.details
          });

          setIsConnecting(false);

          // Handle different error types
          if (err?.code === chrome.cast.ErrorCode.CANCEL) {
            console.log("User cancelled cast session");
            setError(null); // User cancelled, not an error
          } else if (err?.code === chrome.cast.ErrorCode.TIMEOUT) {
            console.log("Cast session timeout");
            setError("সংযোগ সময়সীমা শেষ হয়েছে");
          } else if (err?.code === chrome.cast.ErrorCode.RECEIVER_UNAVAILABLE) {
            console.log("No cast receivers available");
            setError("কোনো কাস্ট ডিভাইস পাওয়া যায়নি");
          } else {
            console.log("Cast session failed with error");
            setError("কাস্ট ডিভাইস এ সংযোগ ব্যর্থ হয়েছে");
          }

          reject(err);
        }
      );
    });
  }, [sessionListener]);

  // Cast media
  const castMedia = useCallback(async (contentId: string, contentType: string, metadata: MediaMetadata) => {
    // Check if session exists, if not request one
    let session = currentSession;

    if (!session) {
      // No session, try to create one
      try {
        // requestSession now returns the session directly
        session = await requestSession();
      } catch (err: any) {
        // If user cancelled, don't throw error
        if (err?.code === chrome.cast.ErrorCode.CANCEL || err?.code === "cancel") {
          console.log("Cast session cancelled by user");
          return Promise.resolve();
        }
        throw new Error("কাস্ট সেশন তৈরি করতে ব্যর্থ হয়েছে");
      }
    }

    return new Promise<void>((resolve, reject) => {
      // Create media info
      const mediaInfo = new chrome.cast.media.MediaInfo(contentId, contentType);

      // Set metadata
      const castMetadata = new chrome.cast.media.GenericMediaMetadata();
      castMetadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
      castMetadata.title = metadata.title;

      if (metadata.subtitle) {
        castMetadata.subtitle = metadata.subtitle;
      }

      if (metadata.images && metadata.images.length > 0) {
        castMetadata.images = metadata.images;
      } else if (metadata.thumbnail) {
        castMetadata.images = [{ url: metadata.thumbnail }];
      }

      mediaInfo.metadata = castMetadata;

      // Create load request
      const loadRequest = new chrome.cast.media.LoadRequest(mediaInfo);
      loadRequest.autoplay = true;

      // Load media using the session variable
      session.loadMedia(
        loadRequest,
        (media) => {
          console.log("Media loaded successfully:", media);
          resolve();
        },
        (err) => {
          console.error("Failed to load media:", err);
          setError("মিডিয়া লোড ব্যর্থ হয়েছে");
          reject(err);
        }
      );
    });
  }, [currentSession, requestSession]);

  // Disconnect session
  const disconnect = useCallback(async () => {
    if (!currentSession) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      currentSession.stop(
        () => {
          console.log("Session stopped");
          setCurrentSession(null);
          setCurrentDevice(null);
          setIsConnected(false);
          resolve();
        },
        (err) => {
          console.error("Failed to stop session:", err);
          setError("সংযোগ বিচ্ছিন্ন করতে ব্যর্থ হয়েছে");
          reject(err);
        }
      );
    });
  }, [currentSession]);

  const value: CastContextValue = {
    isAvailable,
    isConnected,
    isConnecting,
    currentDevice,
    currentSession,
    error,
    castMedia,
    disconnect,
    requestSession,
  };

  return <CastContext.Provider value={value}>{children}</CastContext.Provider>;
}

export function useCastContext() {
  const context = useContext(CastContext);
  if (!context) {
    throw new Error("useCastContext must be used within CastProvider");
  }
  return context;
}
