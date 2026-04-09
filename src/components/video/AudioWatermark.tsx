import { useEffect, useRef } from "react";

/**
 * Periodically speaks "Media Mule preview" over the system audio output
 * while the parent signals that audio is playing.
 * Uses the Web Speech Synthesis API — no external service needed.
 */
export const AudioWatermark = ({
  isPlaying,
  intervalSeconds = 15,
}: {
  isPlaying: boolean;
  intervalSeconds?: number;
}) => {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      window.speechSynthesis?.cancel();
      return;
    }

    const speak = () => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Media Mule preview");
      utterance.rate = 0.95;
      utterance.volume = 0.6;
      utterance.pitch = 1.0;

      // Pick a neutral English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female"),
      ) || voices.find((v) => v.lang.startsWith("en")) || voices[0];
      if (preferred) utterance.voice = preferred;

      window.speechSynthesis.speak(utterance);
    };

    // Speak immediately, then repeat
    speak();
    timerRef.current = setInterval(speak, intervalSeconds * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      window.speechSynthesis?.cancel();
    };
  }, [isPlaying, intervalSeconds]);

  return null;
};