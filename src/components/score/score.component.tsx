import { isEmpty, propEq, reject } from "ramda";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useAsync } from "react-use";
import { useAppContext } from "../../app.context";
import { Player, StateComponentType } from "../../app.types";
import { generateScoringPartners } from "../../app.utils";
import { DEFAULT_CATEGORIES } from "../../constants";
import { useDelay } from "../../hooks/delay.hook";
import { UserList } from "../user-list";
import { ScoreCardBody } from "./card-body";
import { ScoreCardHeader } from "./card-header";
import styles from "./score.module.css";
import { transformReponses } from "./score.utils";

export const Score: StateComponentType = ({
  channel,
  context,
  players,
  send,
}) => {
  const [appContext, setAppContext] = useAppContext();
  const delay = useDelay();

  const { round } = context;
  const { allResponses, categories = [], player, scoringPartners } = appContext;
  const activeCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const userId = useMemo(() => player?.userId ?? "", [player]);

  const orderedPlayers = useMemo(() => {
    return players
      .slice()
      .sort((a, b) => Number(Boolean(b.leader)) - Number(Boolean(a.leader)));
  }, [players]);

  const allResponsesForRound = useMemo(
    () => allResponses[context.round] ?? {},
    [allResponses, context.round]
  );

  const eligiblePlayersForScoring = useMemo(() => {
    return reject<Player>(propEq("restoredOn", round))(players).filter(
      (p) => Boolean(allResponsesForRound[p.userId])
    );
  }, [allResponsesForRound, players, round]);

  const userResponseForRound = useMemo(() => {
    return allResponses[round]?.[userId];
  }, [allResponses, round, userId]);

  const { loading } = useAsync(async () => {
    if (channel && userResponseForRound) {
      await delay(1000);

      await channel.send({
        type: "broadcast",
        event: "responses",
        payload: {
          userId,
          round,
          values: userResponseForRound,
        },
      });

      await delay(1000);

      if (player?.leader) {
        const scoringUserIds = eligiblePlayersForScoring.map(
          (currentPlayer: Player) => currentPlayer.userId
        );
        const newScoringPartners = generateScoringPartners(scoringUserIds);

        await channel.send({
          type: "broadcast",
          event: "scoringPartners",
          payload: newScoringPartners,
        });

        setAppContext({
          type: "scoringPartners",
          value: newScoringPartners,
        });
      }
    }
  }, [channel, delay, eligiblePlayersForScoring, player?.leader, round, setAppContext, userId, userResponseForRound]);

  const [currentScore, setCurrentScore] = useState<Record<string, number>>({});

  const playerIdToScore = useMemo(() => {
    return scoringPartners?.[userId] || userId;
  }, [scoringPartners, userId]);

  const responseList = useMemo(() => {
    return transformReponses(
      allResponsesForRound,
      playerIdToScore,
      eligiblePlayersForScoring
    );
  }, [allResponsesForRound, eligiblePlayersForScoring, playerIdToScore]);

  const similarityCheck = useCallback(
    (targetUserId: string) => (category: string) => {
      const currentUserResponse = allResponsesForRound?.[targetUserId]?.[category];
      const currentUserResponseValue = currentUserResponse
        ? currentUserResponse.toLowerCase().trim()
        : null;

      return Object.entries(allResponsesForRound)
        .filter(([currentUserId]) => targetUserId !== currentUserId)
        .some(([, responses]: [string, Record<string, string>]) => {
          const otherResponse = responses?.[category];
          const otherResponseValue = otherResponse
            ? otherResponse.toLowerCase().trim()
            : null;

          return (
            currentUserResponseValue &&
            otherResponseValue &&
            currentUserResponseValue === otherResponseValue
          );
        });
    },
    [allResponsesForRound]
  );

  useEffect(() => {
    const playerToScoreResponses = allResponsesForRound[playerIdToScore];

    if (
      !loading &&
      isEmpty(currentScore) &&
      playerIdToScore &&
      playerToScoreResponses
    ) {
      const initialScores = Object.entries(playerToScoreResponses).reduce(
        (scores, [category]) => {
          const isSimilar = similarityCheck(playerIdToScore)(category);

          return {
            ...scores,
            [category]: isSimilar ? 5 : 0,
          };
        },
        {}
      );

      setCurrentScore(initialScores);
    }
  }, [
    allResponsesForRound,
    currentScore,
    loading,
    playerIdToScore,
    similarityCheck,
  ]);

  const onReadyClick = useCallback(async () => {
    if (channel && playerIdToScore) {
      const totalScore = Object.values<number>(currentScore).reduce(
        (total, score) => (total += score),
        0
      );

      const payload = {
        round: context.round,
        score: totalScore,
        userId: playerIdToScore,
      };

      await channel.send({
        type: "broadcast",
        event: "score",
        payload,
      });

      setAppContext({
        type: "allScores",
        value: payload,
      });
    }

    send({ type: "submitScores" });
  }, [
    channel,
    context.round,
    currentScore,
    playerIdToScore,
    send,
    setAppContext,
  ]);

  if (loading) {
    return <div className={styles.loading}><h3>Submit Responses...</h3></div>;
  }

  return (
    <div className={styles.container}>
      <button className={styles.controlLeft} type="button" aria-label="Mute">
        ??
      </button>
      <button className={styles.controlRight} type="button" aria-label="Exit">
        X
      </button>

      <div className={styles.topPlayers}>
        <UserList players={orderedPlayers} />
      </div>

      <h1>Time to score!</h1>
      <div className={styles.legend}>
        <div className={styles.yellowBox} />
        <span>- means duplicate answer</span>
      </div>

      <div className={styles.cardGrid}>
        {responseList.map(({ user, responses }, userIndex) => {
          const currentUserId = user?.userId ?? "";
          const isScoring = currentUserId === playerIdToScore;
          const similarCheckFn = similarityCheck(currentUserId);

          return (
            <Fragment key={currentUserId || userIndex}>
              <div className={styles.card}>
                <ScoreCardHeader
                  isCurrentUser={userId === currentUserId}
                  isScoring={isScoring}
                  name={user?.name ?? ""}
                />
                <div className={styles.scoreLayout}>
                  {activeCategories.map((category) => {
                    return (
                      <ScoreCardBody
                        key={`${currentUserId}-${category}`}
                        category={category}
                        currentScore={currentScore}
                        isScoring={isScoring}
                        isSimilar={similarCheckFn(category)}
                        response={responses?.[category]}
                        setCurrentScore={setCurrentScore}
                      />
                    );
                  })}
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>

      <div className={styles.buttonWrapper}>
        <button onClick={onReadyClick}>Submit</button>
      </div>
    </div>
  );
};
