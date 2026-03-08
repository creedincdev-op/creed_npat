import { useCallback, useEffect, useState } from "react";
import styles from "./top-controls.module.css";

const MUTE_STORAGE_KEY = "npat-muted";

interface TopControlsProps {
  onExit?: () => void;
}

export const TopControls: React.FC<TopControlsProps> = ({ onExit }) => {
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsMuted(localStorage.getItem(MUTE_STORAGE_KEY) === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem(MUTE_STORAGE_KEY, isMuted ? "1" : "0");

    document.querySelectorAll("audio").forEach((audio) => {
      audio.muted = isMuted;
    });
  }, [isMuted]);

  const handleExit = useCallback(() => {
    if (onExit) {
      onExit();
      return;
    }

    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, [onExit]);

  return (
    <div className={styles.wrapper}>
      <button
        aria-label={isMuted ? "Unmute" : "Mute"}
        className={styles.left}
        onClick={() => setIsMuted((value) => !value)}
        type="button"
      >
        {isMuted ? "🔇" : "🔊"}
      </button>
      <button
        aria-label="Exit game"
        className={styles.right}
        onClick={handleExit}
        type="button"
      >
        X
      </button>
    </div>
  );
};
