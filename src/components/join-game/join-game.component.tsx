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
      const newPlayer = createPlayer(user);
      const normalizedRoomCode = String(roomCode || "").trim().toLowerCase();

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
