import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInterval } from "react-use";
import { useAppContext } from "./app.context";
import { Player, StateComponentProps } from "./app.types";
import { getAvatarForUser } from "./app.utils";
import { useChannel } from "./hooks/channel.hook";

type HeartbeatEntry = {
  player: Player;
  seenAt: number;
};

const HEARTBEAT_EVENT = "playerPing";
const HEARTBEAT_INTERVAL_MS = 1800;
const HEARTBEAT_TIMEOUT_MS = 7000;

export const useAppChannel = ({ context, send }: StateComponentProps) => {
  const getChannel = useChannel();
  const [isSubscribed, setIsSubscribed] = useState<boolean>();
  const [presencePlayers, setPresencePlayers] = useState<Player[]>([]);
  const [heartbeatPlayers, setHeartbeatPlayers] = useState<Record<string, HeartbeatEntry>>({});
  const [hasLeaderExited, setHasLeaderExited] = useState<boolean>();
  const [newPlayer, setNewPlayer] = useState<Player>();
  const [appContext, setAppContext] = useAppContext();
  const roundRef = useRef(context.round);

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
      emoji: candidate.emoji || getAvatarForUser(candidate.userId),
      restoredOn: Number(candidate.restoredOn || 0),
    };
  }, []);

  const updatePresencePlayers = useCallback((newPlayers: Player[]) => {
    setPresencePlayers(newPlayers);
  }, []);

  const upsertHeartbeatPlayer = useCallback((nextPlayer: Player) => {
    setHeartbeatPlayers((prev) => ({
      ...prev,
      [nextPlayer.userId]: {
        player: nextPlayer,
        seenAt: Date.now(),
      },
    }));
  }, []);

  const extractPlayersFromPresenceState = useCallback(
    (presenceState: Record<string, any>) => {
      const parsedPlayers = new Map<string, Player>();

      Object.values(presenceState || {}).forEach((entry: any) => {
        const metas = Array.isArray(entry)
          ? entry
          : Array.isArray(entry?.metas)
            ? entry.metas
            : [];

        metas.forEach((meta: any) => {
          const parsedPlayer = toPlayer(meta);
          if (!parsedPlayer) return;
          parsedPlayers.set(parsedPlayer.userId, parsedPlayer);
        });
      });

      return Array.from(parsedPlayers.values());
    },
    [toPlayer]
  );

  const emitHeartbeat = useCallback(() => {
    if (!channel || !isSubscribed || !player) return;

    const payload = {
      userId: player.userId,
      name: player.name,
      leader: player.leader,
      emoji: player.emoji || getAvatarForUser(player.userId),
      restoredOn: player.restoredOn,
    };

    channel.send({
      type: "broadcast",
      event: HEARTBEAT_EVENT,
      payload,
    });

    upsertHeartbeatPlayer(payload as Player);
  }, [channel, isSubscribed, player, upsertHeartbeatPlayer]);

  const players = useMemo(() => {
    const now = Date.now();
    const activeHeartbeatPlayers = Object.values(heartbeatPlayers)
      .filter((entry) => now - entry.seenAt < HEARTBEAT_TIMEOUT_MS)
      .map((entry) => entry.player);

    const merged = new Map<string, Player>();

    presencePlayers.forEach((p) => merged.set(p.userId, p));
    activeHeartbeatPlayers.forEach((p) => {
      merged.set(p.userId, {
        ...p,
        emoji: p.emoji || getAvatarForUser(p.userId),
      });
    });

    if (player?.userId && !merged.has(player.userId)) {
      merged.set(player.userId, {
        ...player,
        emoji: player.emoji || getAvatarForUser(player.userId),
      });
    }

    return Array.from(merged.values());
  }, [heartbeatPlayers, player, presencePlayers]);

  const getDeterministicLeader = useCallback((activePlayers: Player[]) => {
    return activePlayers
      .slice()
      .sort((a, b) => a.userId.localeCompare(b.userId))[0];
  }, []);

  useEffect(() => {
    roundRef.current = context.round;
  }, [context.round]);

  useEffect(() => {
    if (player) {
      sessionStorage.setItem("userId", player.userId);
    }
  }, [player]);

  useEffect(() => {
    if (!channel) return;

    channel.on("presence", { event: "sync" }, () => {
      const presenceState = channel.presenceState();
      const syncedPlayers = extractPlayersFromPresenceState(
        presenceState as Record<string, any>
      );
      updatePresencePlayers(syncedPlayers);
      syncedPlayers.forEach(upsertHeartbeatPlayer);
    });

    channel.on("presence", { event: "join" }, (presence) => {
      const joinedPresence = presence.newPresences?.[0];
      const parsed = toPlayer(joinedPresence);
      if (parsed) {
        upsertHeartbeatPlayer(parsed);

        if (parsed.leader) {
          setHasLeaderExited(undefined);
        } else {
          setNewPlayer(parsed);
        }
      }

      const syncedPlayers = extractPlayersFromPresenceState(
        channel.presenceState() as Record<string, any>
      );
      updatePresencePlayers(syncedPlayers);
      syncedPlayers.forEach(upsertHeartbeatPlayer);
    });

    channel.on("presence", { event: "leave" }, (presence) => {
      const leftPresence = presence.leftPresences?.[0];
      const exitedPlayer = toPlayer(leftPresence);
      if (exitedPlayer?.leader) {
        setHasLeaderExited(true);
      }

      const syncedPlayers = extractPlayersFromPresenceState(
        channel.presenceState() as Record<string, any>
      );
      updatePresencePlayers(syncedPlayers);
      syncedPlayers.forEach(upsertHeartbeatPlayer);
    });

    channel.on("broadcast", { event: HEARTBEAT_EVENT }, ({ payload }) => {
      const parsed = toPlayer(payload);
      if (!parsed) return;
      upsertHeartbeatPlayer(parsed);
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

      const payloadRound = Number(payload?.round || 0);
      if (payloadRound > roundRef.current) {
        send({ type: "setRound", value: Math.max(payloadRound - 1, 0) });
      }

      send({ type: "start" });
    });

    channel.on("broadcast", { event: "syncState" }, ({ payload }) => {
      if (Array.isArray(payload?.categories)) {
        setAppContext({
          type: "categories",
          value: payload.categories,
        });
      }

      if (typeof payload?.maxRounds === "number") {
        send({ type: "updateMaxRounds", value: payload.maxRounds });
      }

      if (payload?.currentLetter) {
        setAppContext({
          type: "currentLetter",
          value: payload.currentLetter,
        });
      }

      if (Array.isArray(payload?.possibleAlphabet)) {
        setAppContext({
          type: "possibleAlphabet",
          value: payload.possibleAlphabet,
        });
      }

      const payloadRound = Number(payload?.round || 0);
      if (payloadRound > roundRef.current) {
        send({ type: "setRound", value: Math.max(payloadRound - 1, 0) });
        send({ type: "start" });
      }
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
          send({ type: "setRound", value: Math.max(round - 1, 0) });
          send({ type: "start" });
        }
      }
    });

    channel.subscribe((status) => {
      const subscribed = status === "SUBSCRIBED";
      setIsSubscribed(subscribed);
      if (subscribed) {
        channel.track(player || {});
      }
    });

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, extractPlayersFromPresenceState, player?.userId, send, toPlayer, updatePresencePlayers, upsertHeartbeatPlayer]);

  useInterval(() => {
    emitHeartbeat();
  }, channel && isSubscribed ? HEARTBEAT_INTERVAL_MS : null);

  useInterval(() => {
    if (!channel || !isSubscribed || !player?.leader || context.round < 1) return;

    channel.send({
      type: "broadcast",
      event: "syncState",
      payload: {
        categories: appContext.categories,
        currentLetter: appContext.currentLetter,
        maxRounds: appContext.maxRounds,
        possibleAlphabet: appContext.possibleAlphabet,
        round: context.round,
      },
    });
  }, channel && isSubscribed ? 2000 : null);

  useInterval(() => {
    setHeartbeatPlayers((prev) => {
      const now = Date.now();
      const filtered = Object.fromEntries(
        Object.entries(prev).filter(([, entry]) => now - entry.seenAt < HEARTBEAT_TIMEOUT_MS)
      );

      return Object.keys(filtered).length === Object.keys(prev).length ? prev : filtered;
    });
  }, 2500);

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
    emitHeartbeat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, isSubscribed, player?.leader, player?.restoredOn]);

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
