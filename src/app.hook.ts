import { useCallback, useEffect, useMemo, useState } from "react";
import { useInterval } from "react-use";
import { useAppContext } from "./app.context";
import { Player, StateComponentProps } from "./app.types";
import { getAvatarForUser } from "./app.utils";
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

  const presenceSessionKey = useMemo(() => {
    if (!player?.userId) return undefined;
    if (typeof window === "undefined") return player.userId;

    const storageKey = `presence-key-${normalizedRoomCode}`;
    const cachedKey = sessionStorage.getItem(storageKey);
    if (cachedKey) return cachedKey;

    const freshKey = `${player.userId}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(storageKey, freshKey);
    return freshKey;
  }, [normalizedRoomCode, player?.userId]);

  const channel = useMemo(() => {
    if (normalizedRoomCode && presenceSessionKey) {
      return getChannel(normalizedRoomCode, presenceSessionKey);
    }
  }, [getChannel, normalizedRoomCode, presenceSessionKey]);

  const updatePlayers = useCallback((newPlayers: Player[]) => {
    setPlayers(newPlayers);
  }, []);

  const toPlayer = useCallback((raw: any): Player | null => {
    if (!raw) return null;
    const candidate =
      raw.userId
        ? raw
        : raw.payload?.userId
          ? raw.payload
          : raw.user?.userId
            ? raw.user
            : null;

    if (!candidate || typeof candidate.userId !== "string") return null;

    return {
      userId: candidate.userId,
      name: candidate.name || "Player",
      leader: Boolean(candidate.leader),
      emoji: candidate.emoji || "",
      restoredOn: Number(candidate.restoredOn || 0),
    };
  }, []);

  const extractPlayersFromPresenceState = useCallback((presenceState: Record<string, any>) => {
    const parsedPlayers: Player[] = [];

    Object.values(presenceState || {}).forEach((entry: any) => {
      const metas = Array.isArray(entry)
        ? entry
        : Array.isArray(entry?.metas)
          ? entry.metas
          : [];

      metas.forEach((meta: any) => {
        const parsedPlayer = toPlayer(meta);
        if (!parsedPlayer) return;
        parsedPlayers.push({
          ...parsedPlayer,
          emoji: parsedPlayer.emoji || getAvatarForUser(parsedPlayer.userId),
        });
      });
    });

    return parsedPlayers;
  }, [toPlayer]);

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
        const syncedPlayers = extractPlayersFromPresenceState(presenceState as Record<string, any>);
        updatePlayers(syncedPlayers);
      });

      channel.on("presence", { event: "join" }, (presence) => {
        const joinedPresence = presence.newPresences?.[0];
        const newPlayer = toPlayer(joinedPresence);
        if (!newPlayer) return;
        updatePlayers(
          extractPlayersFromPresenceState(
            channel.presenceState() as Record<string, any>
          )
        );

        if (newPlayer.leader) {
          setHasLeaderExited(undefined);
        } else {
          setNewPlayer(newPlayer);
        }
      });

      channel.on("presence", { event: "leave" }, (presence) => {
        const leftPresence = presence.leftPresences?.[0];
        const exitedPlayer = toPlayer(leftPresence);
        if (!exitedPlayer) return;
        updatePlayers(
          extractPlayersFromPresenceState(
            channel.presenceState() as Record<string, any>
          )
        );

        if (exitedPlayer.leader) {
          setHasLeaderExited(true);
        }
      });

      channel.on("broadcast", { event: "start" }, ({ payload }) => {
        if (Array.isArray(payload?.categories)) {
          setAppContext({
            type: "categories",
            value: payload.categories,
          });
        }

        if (typeof payload?.maxRounds === "number") {
          send({ type: "updateMaxRounds", value: payload.maxRounds });
        }

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
        if (status === "SUBSCRIBED") {
          channel.track(player || {});
        }
      });
    }

    return () => {
      if (channel) channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, extractPlayersFromPresenceState, toPlayer, updatePlayers]);

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
