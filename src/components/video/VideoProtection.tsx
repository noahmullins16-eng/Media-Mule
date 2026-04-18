import { useEffect, useRef } from "react";

/**
 * Tiled watermark grid — renders semi-transparent "MEDIA MULE" labels
 * across the entire video surface in a diagonal pattern.
 * One instance also bounces (MovingWatermark handles that).
 */
export const TiledWatermark = ({ customImageUrl }: { customImageUrl?: string | null }) => {
  const tiles: { row: number; col: number }[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      tiles.push({ row, col });
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" style={{ zIndex: 20 }}>
      {tiles.map(({ row, col }) => (
        customImageUrl ? (
          <img
            key={`${row}-${col}`}
            src={customImageUrl}
            alt=""
            className="absolute"
            style={{
              left: `${col * 25 + 5}%`,
              top: `${row * 25 + 8}%`,
              transform: "rotate(-25deg)",
              width: "80px",
              height: "auto",
              opacity: 0.15,
            }}
            draggable={false}
          />
        ) : (
          <span
            key={`${row}-${col}`}
            className="absolute font-display text-sm md:text-base font-bold tracking-widest text-white/15 whitespace-nowrap"
            style={{
              left: `${col * 25 + 5}%`,
              top: `${row * 25 + 8}%`,
              transform: "rotate(-25deg)",
            }}
          >
            MEDIA MULE
          </span>
        )
      ))}
    </div>
  );
};

/**
 * Invisible forensic-style watermark — renders a unique session fingerprint
 * as nearly invisible text that can be recovered from screenshots.
 */
export const ForensicWatermark = ({ sessionId }: { sessionId: string }) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" style={{ zIndex: 21 }}>
      <span
        className="absolute font-mono text-[6px] whitespace-nowrap"
        style={{
          color: "rgba(255,255,255,0.02)",
          left: "12%",
          top: "45%",
          transform: "rotate(-10deg)",
          letterSpacing: "0.5em",
        }}
      >
        {sessionId}
      </span>
      <span
        className="absolute font-mono text-[6px] whitespace-nowrap"
        style={{
          color: "rgba(255,255,255,0.02)",
          right: "8%",
          bottom: "20%",
          transform: "rotate(15deg)",
          letterSpacing: "0.5em",
        }}
      >
        {sessionId}
      </span>
    </div>
  );
};

/**
 * Hook that detects likely screen-recording / screen-sharing via
 * the Page Visibility API and Picture-in-Picture events, then
 * pauses the video when detected.
 */
export const useScreenRecordingGuard = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isPlaying: boolean,
  onDetected: () => void
) => {
  const detectedRef = useRef(false);

  useEffect(() => {
    // Detect PiP (often used to capture video)
    const handlePiP = () => {
      if (videoRef.current && document.pictureInPictureElement === videoRef.current) {
        document.exitPictureInPicture?.();
        onDetected();
      }
    };

    // Block keyboard shortcuts commonly used for screenshots / dev tools
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        onDetected();
      }
      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+U / F12
      if (
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && e.key === "u") ||
        e.key === "F12"
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("enterpictureinpicture", handlePiP);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("enterpictureinpicture", handlePiP);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [videoRef, isPlaying, onDetected]);

  return detectedRef;
};
