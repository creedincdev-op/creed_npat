import { CSSProperties } from "react";
import { StateComponentType } from "../../app.types";
import styles from "./home.module.css";

const BUTTON_CONFIG = [
  {
    label: "Instructions",
    type: "instructions",
  },
  {
    label: "Join",
    type: "join",
  },
  {
    label: "Create Game",
    type: "create",
  },
];

const EMOJI_DROPS = [
  { emoji: "😀", left: 4, duration: 13, delay: -2, size: 1.6 },
  { emoji: "🧑", left: 11, duration: 16, delay: -7, size: 1.5 },
  { emoji: "🏙️", left: 18, duration: 14, delay: -3, size: 1.7 },
  { emoji: "🗺️", left: 24, duration: 18, delay: -10, size: 1.5 },
  { emoji: "🐶", left: 30, duration: 15, delay: -5, size: 1.8 },
  { emoji: "🦁", left: 36, duration: 17, delay: -8, size: 1.7 },
  { emoji: "🐘", left: 42, duration: 14, delay: -4, size: 1.9 },
  { emoji: "📦", left: 48, duration: 16, delay: -11, size: 1.5 },
  { emoji: "📚", left: 55, duration: 15, delay: -6, size: 1.5 },
  { emoji: "🧸", left: 61, duration: 18, delay: -12, size: 1.7 },
  { emoji: "✈️", left: 67, duration: 13, delay: -1, size: 1.6 },
  { emoji: "🌍", left: 73, duration: 16, delay: -9, size: 1.8 },
  { emoji: "🐼", left: 79, duration: 14, delay: -4, size: 1.8 },
  { emoji: "🐯", left: 85, duration: 17, delay: -8, size: 1.8 },
  { emoji: "🏛️", left: 92, duration: 15, delay: -5, size: 1.6 },
];

export const Home: StateComponentType = ({ send }) => {
  return (
    <div className={styles.container}>
      <div className={styles.emojiRain} aria-hidden="true">
        {EMOJI_DROPS.map((drop, index) => {
          const style = {
            left: `${drop.left}%`,
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.duration}s`,
            fontSize: `${drop.size}rem`,
          } as CSSProperties;

          return (
            <span key={`${drop.emoji}-${index}`} className={styles.emojiDrop} style={style}>
              {drop.emoji}
            </span>
          );
        })}
      </div>

      <h1 className={styles.heading}>Name, Place, Animal, Thing</h1>
      <div className={styles.buttonList}>
        {BUTTON_CONFIG.map((buttonConfig, index) => (
          <button key={index} onClick={() => send({ type: buttonConfig.type })}>
            {buttonConfig.label}
          </button>
        ))}
      </div>
    </div>
  );
};
