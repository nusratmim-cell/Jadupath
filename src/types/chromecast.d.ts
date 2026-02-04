/**
 * TypeScript declarations for Google Cast SDK
 */

declare namespace chrome {
  namespace cast {
    class SessionRequest {
      constructor(appId: string, capabilities?: Capability[], timeout?: number);
      appId: string;
      capabilities: Capability[];
      requestSessionTimeout: number;
    }

    class ApiConfig {
      constructor(
        sessionRequest: SessionRequest,
        sessionListener: (session: Session) => void,
        receiverListener: (available: ReceiverAvailability) => void,
        autoJoinPolicy?: AutoJoinPolicy,
        defaultActionPolicy?: DefaultActionPolicy
      );
      sessionRequest: SessionRequest;
      sessionListener: (session: Session) => void;
      receiverListener: (available: ReceiverAvailability) => void;
      autoJoinPolicy?: AutoJoinPolicy;
      defaultActionPolicy?: DefaultActionPolicy;
    }

    enum AutoJoinPolicy {
      TAB_AND_ORIGIN_SCOPED = "tab_and_origin_scoped",
      ORIGIN_SCOPED = "origin_scoped",
      PAGE_SCOPED = "page_scoped",
    }

    enum DefaultActionPolicy {
      CREATE_SESSION = "create_session",
      CAST_THIS_TAB = "cast_this_tab",
    }

    enum ReceiverAvailability {
      AVAILABLE = "available",
      UNAVAILABLE = "unavailable",
    }

    enum ReceiverType {
      CAST = "cast",
      DIAL = "dial",
      HANGOUT = "hangout",
      CUSTOM = "custom",
    }

    enum SessionStatus {
      CONNECTED = "connected",
      DISCONNECTED = "disconnected",
      STOPPED = "stopped",
    }

    enum Capability {
      VIDEO_OUT = "video_out",
      AUDIO_OUT = "audio_out",
      VIDEO_IN = "video_in",
      AUDIO_IN = "audio_in",
    }

    interface Error {
      code: ErrorCode;
      description?: string;
      details?: object;
    }

    enum ErrorCode {
      CANCEL = "cancel",
      TIMEOUT = "timeout",
      API_NOT_INITIALIZED = "api_not_initialized",
      INVALID_PARAMETER = "invalid_parameter",
      RECEIVER_UNAVAILABLE = "receiver_unavailable",
      SESSION_ERROR = "session_error",
      CHANNEL_ERROR = "channel_error",
      LOAD_MEDIA_FAILED = "load_media_failed",
    }

    interface Receiver {
      label: string;
      friendlyName: string;
      capabilities: Capability[];
      volume: Volume | null;
      receiverType: ReceiverType;
      isActiveInput: boolean | null;
    }

    interface Volume {
      level: number | null;
      muted: boolean | null;
    }

    class Session {
      sessionId: string;
      appId: string;
      displayName: string;
      statusText: string;
      receiver: Receiver;
      media: media.Media[];
      status: SessionStatus;

      loadMedia(
        loadRequest: media.LoadRequest,
        successCallback: (media: media.Media) => void,
        errorCallback: (error: Error) => void
      ): void;

      stop(
        successCallback: () => void,
        errorCallback: (error: Error) => void
      ): void;

      sendMessage(
        namespace: string,
        message: object | string,
        successCallback?: () => void,
        errorCallback?: (error: Error) => void
      ): void;

      addUpdateListener(listener: (isAlive: boolean) => void): void;
      removeUpdateListener(listener: (isAlive: boolean) => void): void;

      addMessageListener(namespace: string, listener: (namespace: string, message: string) => void): void;
      removeMessageListener(namespace: string, listener: (namespace: string, message: string) => void): void;

      addMediaListener(listener: (media: media.Media) => void): void;
      removeMediaListener(listener: (media: media.Media) => void): void;
    }

    namespace media {
      class LoadRequest {
        constructor(mediaInfo: MediaInfo);
        media: MediaInfo;
        autoplay: boolean;
        currentTime: number;
        customData?: object;
      }

      class MediaInfo {
        constructor(contentId: string, contentType: string);
        contentId: string;
        contentType: string;
        streamType?: StreamType;
        duration?: number;
        metadata?: object | GenericMediaMetadata | MovieMediaMetadata | TvShowMediaMetadata;
        customData?: object;
      }

      class GenericMediaMetadata {
        constructor();
        metadataType: MetadataType;
        title?: string;
        subtitle?: string;
        images?: Image[];
        releaseDate?: string;
      }

      class MovieMediaMetadata {
        constructor();
        metadataType: MetadataType;
        title?: string;
        subtitle?: string;
        studio?: string;
        images?: Image[];
        releaseDate?: string;
      }

      class TvShowMediaMetadata {
        constructor();
        metadataType: MetadataType;
        seriesTitle?: string;
        title?: string;
        season?: number;
        episode?: number;
        images?: Image[];
        originalAirdate?: string;
      }

      interface Image {
        url: string;
        width?: number;
        height?: number;
      }

      enum MetadataType {
        GENERIC = 0,
        MOVIE = 1,
        TV_SHOW = 2,
        MUSIC_TRACK = 3,
        PHOTO = 4,
      }

      enum StreamType {
        BUFFERED = "buffered",
        LIVE = "live",
        OTHER = "other",
      }

      class Media {
        sessionId: string;
        mediaSessionId: number;
        media: MediaInfo;
        playbackRate: number;
        playerState: PlayerState;
        currentTime: number;

        play(
          playRequest: PlayRequest | null,
          successCallback: () => void,
          errorCallback: (error: Error) => void
        ): void;

        pause(
          pauseRequest: PauseRequest | null,
          successCallback: () => void,
          errorCallback: (error: Error) => void
        ): void;

        seek(
          seekRequest: SeekRequest,
          successCallback: () => void,
          errorCallback: (error: Error) => void
        ): void;

        stop(
          stopRequest: StopRequest | null,
          successCallback: () => void,
          errorCallback: (error: Error) => void
        ): void;

        addUpdateListener(listener: (isAlive: boolean) => void): void;
        removeUpdateListener(listener: (isAlive: boolean) => void): void;
      }

      enum PlayerState {
        IDLE = "IDLE",
        PLAYING = "PLAYING",
        PAUSED = "PAUSED",
        BUFFERING = "BUFFERING",
      }

      class PlayRequest {
        constructor();
        customData?: object;
      }

      class PauseRequest {
        constructor();
        customData?: object;
      }

      class SeekRequest {
        constructor();
        currentTime?: number;
        resumeState?: ResumeState;
        customData?: object;
      }

      enum ResumeState {
        PLAYBACK_START = "PLAYBACK_START",
        PLAYBACK_PAUSE = "PLAYBACK_PAUSE",
      }

      class StopRequest {
        constructor();
        customData?: object;
      }
    }

    function initialize(
      apiConfig: ApiConfig,
      successCallback: () => void,
      errorCallback: (error: Error) => void
    ): void;

    function requestSession(
      successCallback: (session: Session) => void,
      errorCallback: (error: Error) => void
    ): void;

    function requestSessionById(
      sessionId: string,
      successCallback: (session: Session) => void,
      errorCallback: (error: Error) => void
    ): void;

    function setCustomReceivers(
      receivers: Receiver[],
      successCallback: () => void,
      errorCallback: (error: Error) => void
    ): void;

    function setReceiverDisplayStatus(
      receiver: Receiver,
      successCallback: () => void,
      errorCallback: (error: Error) => void
    ): void;

    function usingPresentationApi(): boolean;

    const VERSION: [number, number, number];
    const isAvailable: boolean;
  }
}

declare global {
  interface Window {
    __onGCastApiAvailable: (isAvailable: boolean) => void;
    chrome?: typeof chrome;
  }
}

export {};
