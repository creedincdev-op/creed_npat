import { useCallback, useEffect, useMemo, useState } from "react";
import { useInterval } from "react-use";
import { useAppContext } from "./app.context";
import { Player, StateComponentProps } from "./app.types";
import { useChannel } from "./hooks/channel.hook";

export const useAppChannel = ({ context, send }: StateComponentProps) => {
  const getChannel = useChannel();
  const [isSubscribed, setIsSubscribed] = useState<boolean>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [hasLeaderExited, setHasLeaderExited] = useState<boolean>();
  const [newPlayer, setNewPlayer] = useState<Player>();
  const [appContext, setAppContext] = useAppContext();

  const { player } = appContext;

  const normalizedRoomCode = useMemo(() => {
    return String(context.roomCode || "").trim().toLowerCase();
  }, [context.roomCode]);

  const channel = useMemo(() => {
    if (normalizedRoomCode && player?.userId) {
      return getChannel(normalizedRoomCode, player?.userId);
    }
  }, [getChannel, normalizedRoomCode, player?.userId]);

  const updatePlayers = useCallback((newPlayers: Player[]) => {
    setPlayers(newPlayers);
  }, []);

  const getDeterministicLeader = useCallback((activePlayers: Player[]) => {
    return activePlayers
      .slice()
      .sort((a, b) => a.userId.localeCompare(b.userId))[0];
  }, []);

  useEffect(() => {
    if (player) {
      sessionStorage.setItem("userId", player.userId);
    }
  }, [player]);

  useEffect(() => {
    if (channel) {
      channel.on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState();
        const players = Object.values(presenceState).map(
          (player) => player[0]
        ) as unknown as Player[];

        updatePlayers(players);
      });

      channel.on("presence", { event: "join" }, (presence) => {
        const newPlayer = presence.newPresences[0] as unknown as Player;

        if (newPlayer.leader) {
          setHasLeaderExited(undefined);
        } else {
          setNewPlayer(newPlayer);
        }
      });

      channel.on("presence", { event: "leave" }, (presence) => {
        const exitedPlayer = presence.leftPresences[0] as unknown as Player;

        if (exitedPlayer.leader) {
          setHasLeaderExited(true);
        }
      });

      channel.on("broadcast", { event: "start" }, () => {
        send({ type: "start" });
      });

      channel.on("broadcast", { event: "responses" }, ({ payload }) => {
        setAppContext({
          type: "allResponses",
          value: payload,
        });
      });

      channel.on("broadcast", { event: "scoringPartners" }, ({ payload }) => {
        setAppContext({
          type: "scoringPartners",
          value: payload,
        });
      });

      channel.on("broadcast", { event: "score" }, ({ payload }) => {
        setAppContext({
          type: "allScores",
          value: payload,
        });
      });

      channel.on("broadcast", { event: "ready" }, ({ payload }) => {
        setAppContext({
          type: "ready",
          value: payload,
        });
      });

      channel.on("broadcast", { event: "game" }, ({ payload }) => {
        if (payload?.currentLetter) {
          setAppContext({
            type: "currentLetter",
            value: payload.currentLetter,
          });
        }
        if (payload?.possibleAlphabet) {
          setAppContext({
            type: "possibleAlphabet",
            value: payload.possibleAlphabet,
          });
        }
      });

      channel.on("broadcast", { event: "join" }, ({ payload = {} }) => {
        const { round, userId, ...restOfPayload } = payload;

        if (userId === player?.userId) {
          setAppContext({
            type: "restore",
            value: {
              ...restOfPayload,
              round,
            },
          });

          send({ type: "updateMaxRounds", value: restOfPayload.maxRounds });

          if (round > 0) {
            send({ type: "setRound", value: payload.round });
            send({ type: "assignIsRestoringFlag" });
          }
        }
      });

      channel.subscribe((status) => {
        setIsSubscribed(status === "SUBSCRIBED");
        channel.track(player || {});
      });
    }

    return () => {
      if (channel) channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  useInterval(
    () => {
      if (hasLeaderExited) {
        const newLeader = getDeterministicLeader(players);

        if (newLeader?.userId === player?.userId) {
          setAppContext({ type: "assignAsLeader" });
        }
      }

      setHasLeaderExited(undefined);
    },
    hasLeaderExited ? 3000 : null
  );

  useEffect(() => {
    if (!player?.userId || players.length === 0) return;

    const hasLeader = players.some((p) => p.leader);
    if (!hasLeader) {
      const newLeader = getDeterministicLeader(players);
      if (newLeader?.userId === player.userId) {
        setAppContext({ type: "assignAsLeader" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, player?.userId, getDeterministicLeader]);

  useEffect(() => {
    if (channel && player) {
      channel.track(player);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, player?.leader, player?.restoredOn]);

  useInterval(
    () => {
      if (newPlayer) {
        if (channel && player?.leader) {
          const hasUserId = Boolean(sessionStorage.getItem("userId") || "");

          channel.send({
            type: "broadcast",
            event: "join",
            payload: {
              userId: newPlayer.userId,
              allScores: appContext.allScores,
              categories: appContext.categories,
              maxRounds: appContext.maxRounds,
              possibleAlphabet: appContext.possibleAlphabet,
              scoringPartners: appContext.scoringPartners,
              round: hasUserId ? context.round : undefined,
            },
          });
        }

        setNewPlayer(undefined);
      }
    },
    newPlayer ? 1500 : null
  );

  return {
    channel,
    isSubscribed,
    players,
  };
};
