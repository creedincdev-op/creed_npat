import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { useAppContext } from "../../app.context";
import { StateComponentType } from "../../app.types";
import { createPlayer } from "../../app.utils";
import {
  CATEGORIES,
  DEFAULT_CATEGORIES,
  DEFAULT_MAX_ROUNDS,
  ROUND_SELECTIONS,
} from "../../constants";
import styles from "./create-game.module.css";
import { generateRoomName } from "./create-game.utils";

type FormValues = {
  categories: Array<string>;
  rounds: string;
  user: string;
};

export const CreateGame: StateComponentType = ({ send }) => {
  const [, setAppContext] = useAppContext();
  const { handleSubmit, register } = useForm<FormValues>({
    mode: "onSubmit",
    defaultValues: {
      categories: DEFAULT_CATEGORIES,
      rounds: DEFAULT_MAX_ROUNDS.toString(),
    },
  });

  const onSubmitHanlder = useCallback(
    async (formData: FormValues) => {
      const { categories, rounds, user } = formData;
      const newRoomCode = generateRoomName().trim().toLowerCase();
      const newPlayer = createPlayer(user, true, newRoomCode);

      setAppContext({ type: "categories", value: categories });
      setAppContext({ type: "maxRounds", value: parseInt(rounds, 10) });
      setAppContext({ type: "player", value: newPlayer });

      send({ type: "ready", value: newRoomCode });
    },
    [send, setAppContext]
  );

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit(onSubmitHanlder)}>
        <div className={styles.inputContainer}>
          <label>Your Name:</label>
          <input
            {...register("user", { required: true })}
            maxLength={20}
            type="text"
          />
        </div>

        <div className={styles.optionsContainer}>
          <h2>Select number of rounds:</h2>
          <div className={styles.roundSelectionList}>
            {ROUND_SELECTIONS.map((round, index) => (
              <div key={index}>
                <input
                  type="radio"
                  id={round.toString()}
                  value={round}
                  {...register("rounds")}
                />
                <label htmlFor={round.toString()}>{round.toString()}</label>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.optionsContainer}>
          <h2>Select categories:</h2>
          <div className={styles.categoriesList}>
            {CATEGORIES.map((category, index) => (
              <div key={index}>
                <input
                  type="checkbox"
                  id={category.id}
                  value={category.value}
                  {...register("categories")}
                />
                <label htmlFor={category.id}>{category.value}</label>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.buttonWrapper}>
          <button type="submit">Create Game</button>
          <button onClick={() => send({ type: "back" })}>Cancel</button>
        </div>
      </form>
    </div>
  );
};
