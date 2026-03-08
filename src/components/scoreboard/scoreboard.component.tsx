import { useCallback, useMemo } from "react";
import { useAppContext } from "../../app.context";
import { StateComponentType } from "../../app.types";
import { ScoreTable, usePlayersWithScore } from "../score-table";
import styles from "./scoreboard.module.css";

export const Scoreboard: StateComponentType = ({ context, players, send }) => {
  const [appContext, setAppContext] = useAppContext();
  const { player } = appContext;
  const { playersWithScore, position } = usePlayersWithScore(
    player?.userId ?? "",
    players,
    context.round,
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const staticPlayers = useMemo(() => playersWithScore, []);

  const currentPlayerWithScores = useMemo(
    () =>
      staticPlayers[position] || {
        place: staticPlayers.length,
        tied: false,
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const resetGame = useCallback(() => {
    setAppContext({ type: "reset" });
    send({ type: "home" });
  }, [send, setAppContext]);

  return (
    <div className={styles.container}>
      <h1>Final Scores</h1>
      <h2>
        {currentPlayerWithScores.place === 1 &&
        !currentPlayerWithScores.tied ? (
          <>
            <span>*</span>
            <span>
              Congratulations,
              <br />
              you won!
            </span>
            <span>*</span>
          </>
        ) : currentPlayerWithScores.tied ? (
          <>
            <span></span>
            <span>You tied for #{currentPlayerWithScores.place}</span>
            <span>*</span>
          </>
        ) : (
          <>
            <span></span>
            <span>You placed #{currentPlayerWithScores.place}</span>
            <span></span>
          </>
        )}
      </h2>

      <ScoreTable players={staticPlayers} position={position} />

      <div className={styles.buttonWrapper}>
        <button onClick={resetGame}>New Game</button>
      </div>
    </div>
  );
};
