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

export const Home: StateComponentType = ({ send }) => {
  return (
    <div className={styles.container}>
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
