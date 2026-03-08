import { useCallback, useMemo, useState } from "react";
import { useTimeoutFn } from "react-use";
import { useAppContext } from "../../app.context";
import { StateComponentType } from "../../app.types";
import { useDelay } from "../../hooks/delay.hook";
import { UserList } from "../user-list";
import styles from "./waiting-room.module.css";

export const WaitingRoom: StateComponentType = ({
  channel,
  context,
  isSubscribed,
  players,
  send,
}) => {
  const [copyTimeout, setCopyTimeout] = useState<number>(0);
  const [startError, setStartError] = useState<string>("");
  const [appContext] = useAppContext();
  const delay = useDelay();

  const { maxRounds, categories, player } = appContext;

  const orderedPlayers = useMemo(() => {
    return players
      .slice()
      .sort((a, b) => Number(Boolean(b.leader)) - Number(Boolean(a.leader)));
  }, [players]);

  useTimeoutFn(() => {
    setCopyTimeout(0);
  }, copyTimeout);

  const copyRoomCodeToClipboard = useCallback(() => {
    const roomLink = `${window.location.origin}?code=${context.roomCode}`;
    navigator.clipboard.writeText(roomLink);

    setCopyTimeout(4000);
  }, [context.roomCode]);

  const startGame = useCallback(async () => {
    if (!channel || !isSubscribed) {
      setStartError("Realtime is still connecting. Wait 1-2 seconds.");
      return;
    }

    const payload = {
      categories,
      maxRounds,
    };

    const result = await channel.send({
      type: "broadcast",
      event: "start",
      payload,
    });

    if (result !== "ok") {
      setStartError("Network sync issue. Please try once more.");
      return;
    }

    await delay(350);
    await channel.send({
      type: "broadcast",
      event: "start",
      payload,
    });
    await delay(350);
    await channel.send({
      type: "broadcast",
      event: "start",
      payload,
    });

    setStartError("");
    send({ type: "start" });
  }, [categories, channel, delay, isSubscribed, maxRounds, send]);

  return (
    <div className={styles.container}>
      <button className={styles.controlLeft} type="button" aria-label="Mute">
        ??
      </button>
      <button className={styles.controlRight} type="button" aria-label="Exit">
        X
      </button>

      <div className={styles.roomCodeContainer}>
        <p>Your Game Code is:</p>

        <div className={styles.roomCodeContent}>
          <p className={styles.roomCode}>{context.roomCode}</p>
          <button
            onClick={copyRoomCodeToClipboard}
            disabled={copyTimeout !== 0}
          >
            {copyTimeout !== 0 ? "Copied" : "Copy"}
          </button>
        </div>

        <p>Send it to your friends to start the game!</p>
      </div>

      <h2 className={styles.playersHeading}>Who&apos;s Playing?</h2>
      <div className={styles.playerWrap}>
        <UserList players={orderedPlayers} />
      </div>

      <p className={styles.waitingText}>
        {player?.leader
          ? "You are admin. Start when everyone joins."
          : "Waiting for admin to start the game..."}
      </p>

      <div className={styles.buttonWrapper}>
        {player?.leader && (
          <button onClick={startGame} disabled={!isSubscribed}>
            Start Game
          </button>
        )}
      </div>
      {startError && <p className={styles.errorText}>{startError}</p>}
    </div>
  );
};
