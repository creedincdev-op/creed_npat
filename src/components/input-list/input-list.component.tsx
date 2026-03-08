import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useAsync, useInterval } from "react-use";
import { useAppContext } from "../../app.context";
import { Game, StateComponentType } from "../../app.types";
import { generateDefaultResponses } from "../../app.utils";
import { DEFAULT_CATEGORIES } from "../../constants";
import { getLetterFromAlphabet } from "../create-game/create-game.utils";
import styles from "./input-list.module.css";

export const InputList: StateComponentType = ({
  channel,
  context,
  isSubscribed,
  send,
}) => {
  const [countDown, setCountdown] = useState(5);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [appContext, setAppContext] = useAppContext();
  const { categories, currentLetter, maxRounds, player, possibleAlphabet } =
    appContext;
  const activeCategories =
    categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const { register, getValues } = useForm<any>({
    mode: "onSubmit",
    defaultValues: generateDefaultResponses(activeCategories),
  });

  useInterval(() => {
    if (countDown > 0) {
      setCountdown(countDown - 1);
    }
  }, 1000);

  const isCountDownFinished = useMemo(() => {
    return countDown === 0;
  }, [countDown]);

  useAsync(async () => {
    if (channel && player?.leader && isCountDownFinished) {
      const letter = getLetterFromAlphabet(possibleAlphabet);
      let payload: Partial<Game> = letter;

      await channel.send({
        type: "broadcast",
        event: "game",
        payload,
      });

      setAppContext({ type: "currentLetter", value: letter.currentLetter });
      setAppContext({
        type: "possibleAlphabet",
        value: letter.possibleAlphabet,
      });

      send({ type: "updateMaxRounds", value: maxRounds });
    }
  }, [isCountDownFinished]);

  useEffect(() => {
    if (channel && isSubscribed) {
      channel.on("broadcast", { event: "submit" }, () => {
        setAppContext({
          type: "allResponses",
          value: {
            round: context.round,
            userId: player?.userId,
            values: getValues(),
          },
        });
        setIsSubmitted(true);

        send({ type: "submitResponses" });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, isSubscribed, send]);

  const onSubmitHanlder = useCallback(async () => {
    if (channel && !isSubmitted) {
      await channel.send({
        type: "broadcast",
        event: "submit",
      });

      setAppContext({
        type: "allResponses",
        value: {
          round: context.round,
          userId: player?.userId,
          values: getValues(),
        },
      });
      setIsSubmitted(true);

      send({ type: "submitResponses" });
    }
  }, [channel, context.round, getValues, isSubmitted, player?.userId, send, setAppContext]);

  useEffect(() => {
    setIsSubmitted(false);
  }, [context.round]);

  if (!currentLetter || countDown > 0) {
    return (
      <div className={styles.countdown}>
        <h2>Starting round in...</h2>
        <h1>{countDown}</h1>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2>
            Round:{" "}
            <span>
              #{context.round}/{context.maxRounds}
            </span>
          </h2>
          <h2>
            Current Letter: <span className={styles.currentLetter}>{currentLetter}</span>
          </h2>
        </div>
      </div>

      {activeCategories &&
        activeCategories.map((category: string, index: number) => (
          <div key={index} className={styles.inputListItem}>
            <input
              {...register(category)}
              autoFocus={index === 0}
              maxLength={30}
              placeholder={category}
              type="text"
            />
          </div>
        ))}

      <div className={styles.buttonWrapper}>
        <button disabled={isSubmitted} onClick={onSubmitHanlder}>
          Submit
        </button>
      </div>
    </div>
  );
};
