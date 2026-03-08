import { useCallback, useMemo, useState } from "react";
import { useTimeoutFn } from "react-use";
import { useAppContext } from "../../app.context";
import { StateComponentType } from "../../app.types";
import { useDelay } from "../../hooks/delay.hook";
import { TopControls } from "../top-controls";
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
  const [isStarting, setIsStarting] = useState(false);
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
    if (isStarting) return;

    if (!channel || !isSubscribed) {
      setStartError("Realtime is still connecting. Wait 1-2 seconds.");
      return;
    }

    setIsStarting(true);
    setStartError("");

    const payload = {
      categories,
      maxRounds,
      round: context.round + 1,
    };

    const syncPayload = {
      ...payload,
      currentLetter: appContext.currentLetter,
      possibleAlphabet: appContext.possibleAlphabet,
    };

    try {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        await channel.send({
          type: "broadcast",
          event: "start",
          payload,
        });

        await channel.send({
          type: "broadcast",
          event: "syncState",
          payload: syncPayload,
        });

        if (attempt < 5) {
          await delay(300);
        }
      }

      send({ type: "start" });
    } catch (_) {
      setStartError("Network sync issue. Please try once more.");
    } finally {
      setIsStarting(false);
    }
  }, [
    appContext.currentLetter,
    appContext.possibleAlphabet,
    categories,
    channel,
    context.round,
    delay,
    isStarting,
    isSubscribed,
    maxRounds,
    send,
  ]);

  const exitToHome = useCallback(() => {
    window.location.href = "/";
  }, []);

  return (
    <div className={styles.container}>
      <TopControls onExit={exitToHome} />

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
          <button onClick={startGame} disabled={!isSubscribed || isStarting}>
            {isStarting ? "Starting..." : "Start Game"}
          </button>
        )}
      </div>
      {startError && <p className={styles.errorText}>{startError}</p>}
    </div>
  );
};
