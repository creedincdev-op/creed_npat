import { useCallback, useMemo, useState } from "react";
import { useTimeoutFn } from "react-use";
import { useAppContext } from "../../app.context";
import { StateComponentType } from "../../app.types";
import { UserCard } from "../user-card";
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

  const { player } = appContext;

  const otherPlayers = useMemo(
    () => players.filter((p) => player?.userId !== p.userId),
    [player?.userId, players]
  );

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

    const result = await channel.send({
      type: "broadcast",
      event: "start",
    });

    if (result !== "ok") {
      setStartError("Network sync issue. Please try once more.");
      return;
    }

    setStartError("");
    send({ type: "start" });
  }, [channel, isSubscribed, send]);

  return (
    <div className={styles.container}>
      <h1>
        Welcome <span>{player?.name}!</span>
      </h1>
      <h2 className={styles.heading}>You are in the lobby</h2>

      <div className={styles.roomCodeContainer}>
        <p>Your room code is:</p>

        <div className={styles.roomCodeContent}>
          <p className={styles.roomCode}>{context.roomCode}</p>
          <button
            onClick={copyRoomCodeToClipboard}
            disabled={copyTimeout !== 0}
          >
            {copyTimeout !== 0 ? "Copied" : "Copy Link"}
          </button>
        </div>

        <p>Click &quot;Copy Link&quot; button to copy room link to share!</p>
      </div>

      <h2 className={player?.leader ? styles.highlight : ""}>
        {player?.leader
          ? "You are the room leader"
          : "Waiting for the leader to begin the game..."}
      </h2>
      {player && <UserCard player={player} />}

      {otherPlayers.length > 0 && (
        <div className={styles.userListContainer}>
          <h2>Players in the room</h2>
          <UserList players={otherPlayers} />
        </div>
      )}

      <div className={styles.buttonWrapper}>
        {player?.leader && (
          <button onClick={startGame} disabled={!isSubscribed}>
            Start Game
          </button>
        )}
      </div>
      {startError && <p>{startError}</p>}
    </div>
  );
};
