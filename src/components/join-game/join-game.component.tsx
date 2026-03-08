import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { useAppContext } from "../../app.context";
import { StateComponentType } from "../../app.types";
import { createPlayer } from "../../app.utils";
import styles from "./join-game.module.css";

type FormData = {
  roomCode: string;
  user: string;
};

const extractRoomCode = (input: string) => {
  const rawValue = String(input || "").trim();
  if (!rawValue) return "";

  const codePattern = /([a-z]+-[a-z]+-\d+)/i;

  try {
    const parsedUrl = new URL(rawValue);
    const queryCode = parsedUrl.searchParams.get("code");
    if (queryCode?.trim()) {
      return queryCode.trim().toLowerCase();
    }

    const matchFromPath = parsedUrl.pathname.match(codePattern);
    if (matchFromPath?.[1]) {
      return matchFromPath[1].toLowerCase();
    }
  } catch (_) {
    const match = rawValue.match(codePattern);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }

  return rawValue.toLowerCase();
};

export const JoinGame: StateComponentType = ({ context, send }) => {
  const [, setAppContext] = useAppContext();
  const { handleSubmit, register } = useForm<FormData>({
    mode: "onSubmit",
    defaultValues: {
      roomCode: context.roomCode,
      user: "",
    },
  });

  const onSubmitHanlder = useCallback(
    async (formData: FormData) => {
      const { roomCode, user } = formData;
      const normalizedRoomCode = extractRoomCode(roomCode);
      const newPlayer = createPlayer(user, false, normalizedRoomCode);

      setAppContext({ type: "player", value: newPlayer });

      send({ type: "ready", value: normalizedRoomCode });
    },
    [send, setAppContext]
  );

  return (
    <form onSubmit={handleSubmit(onSubmitHanlder)}>
      <div className={styles.inputContainer}>
        <label>Your Name:</label>
        <input
          {...register("user", { required: true })}
          maxLength={30}
          type="text"
        />
      </div>

      <div className={styles.inputContainer}>
        <label>Room Code:</label>
        <input {...register("roomCode", { required: true })} type="text" />
      </div>

      <div className={styles.buttonWrapper}>
        <button type="submit">Join Game</button>
        <button onClick={() => send({ type: "back" })}>Cancel</button>
      </div>
    </form>
  );
};
