import { useCallback, useEffect, useMemo, useState } from "react";
import { useAsync } from "react-use";
import { useAppContext } from "../../app.context";
import { StateComponentType } from "../../app.types";
import { useDelay } from "../../hooks/delay.hook";
import { usePlayersWithScore } from "../score-table";
import { TopControls } from "../top-controls";
import { UserCard } from "../user-card";
import { UserList } from "../user-list";
import styles from "./score-review.module.css";

export const ScoreReview: StateComponentType = ({
  channel,
  context,
  players,
  send,
}) => {
  const [appContext, setAppContext] = useAppContext();
  const [isStarting, setIsStarting] = useState(false);
  const delay = useDelay();

  const { player } = appContext;
  const { maxRounds, round } = context;

  const { loading } = useAsync(async () => {
    await delay(1000);
  }, []);

  useEffect(() => {
    if (!loading && channel) {
      const payload = {
        userId: player?.userId,
        round,
      };

      channel.send({
        type: "broadcast",
        event: "ready",
        payload,
      });

      setAppContext({
        type: "ready",
        value: payload,
      });

      setAppContext({
        type: "currentLetter",
        value: undefined,
      });

      setAppContext({
        type: "scoringPartners",
        value: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, loading]);

  const activePlayerIds = useMemo(() => {
    return players.map((p) => p.userId);
  }, [players]);

  const responderIds = useMemo(() => {
    const roundResponses = appContext.allResponses?.[round] || {};
    return Object.keys(roundResponses);
  }, [appContext.allResponses, round]);

  const expectedReadyPlayerIds = useMemo(() => {
    return responderIds.filter((userId) => activePlayerIds.includes(userId));
  }, [activePlayerIds, responderIds]);

  const allReady = useMemo(() => {
    if (expectedReadyPlayerIds.length === 0) return false;

    return expectedReadyPlayerIds.every((userId) => {
      return appContext.ready?.[round]?.[userId] ?? false;
    });
  }, [appContext.ready, expectedReadyPlayerIds, round]);

  const startGame = useCallback(async () => {
    if (!channel || isStarting) return;

    setIsStarting(true);

    const payload = {
      categories: appContext.categories,
      maxRounds: context.maxRounds,
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
    } finally {
      setIsStarting(false);
    }
  }, [
    appContext.categories,
    appContext.currentLetter,
    appContext.possibleAlphabet,
    channel,
    context.maxRounds,
    context.round,
    delay,
    isStarting,
    send,
  ]);

  const exitToHome = useCallback(() => {
    window.location.href = "/";
  }, []);

  const { playersWithScore } = usePlayersWithScore(
    player?.userId ?? "",
    players,
    round
  );

  const playerWithScore = useMemo(
    () => playersWithScore.find((p) => player?.userId === p.userId),
    [player?.userId, playersWithScore]
  );

  const otherPlayers = useMemo(
    () => playersWithScore.filter((p) => player?.userId !== p.userId),
    [player?.userId, playersWithScore]
  );

  const isLastRound = useMemo(() => maxRounds === round, [maxRounds, round]);

  if (loading) {
    return <div>Submitting scores...</div>;
  }

  return (
    <div className={styles.container}>
      <TopControls onExit={exitToHome} />
      <h1>Current Scores</h1>

      <h3>
        {allReady && !player?.leader
          ? "Waiting for admin to start the next round..."
          : "Waiting for active players to finish scoring..."}
      </h3>

      {playerWithScore && <UserCard player={playerWithScore} />}

      {otherPlayers.length > 0 && (
        <div className={styles.userListContainer}>
          <UserList players={otherPlayers} />
        </div>
      )}

      <div className={styles.buttonWrapper}>
        {player?.leader && allReady && (
          <button disabled={isStarting} onClick={startGame}>
            {isLastRound ? "Go to scoreboard" : "Start Next Round"}
          </button>
        )}
      </div>
    </div>
  );
};
