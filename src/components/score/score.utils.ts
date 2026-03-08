import { filter, indexBy, map, pipe, prop, toPairs } from "ramda";
import { Player } from "../../app.types";
import { getAvatarForUser } from "../../app.utils";

export const sortUserList =
  (scoringId: string) => (allResponses: [string, any][]) => {
    const index = allResponses.findIndex(([userId]) => userId === scoringId);

    if (index !== -1) {
      const allResponsesCopy = allResponses.slice();
      const first = allResponsesCopy.splice(index, 1)[0];
      allResponsesCopy.unshift(first);
      return allResponsesCopy;
    }

    return allResponses;
  };

type Response = {
  user?: Player;
  responses: any;
};

export const transformReponses = (
  allResponses: Record<string, any> = {},
  playerIdToScore: string,
  players: Player[]
) => {
  const playersIndexByUserId = indexBy(prop("userId"))(players);

  return pipe(
    toPairs,
    sortUserList(playerIdToScore),
    map(([userId, responses]) => ({
      user:
        playersIndexByUserId?.[userId] ||
        ({
          userId,
          name: userId,
          leader: false,
          emoji: getAvatarForUser(userId),
          restoredOn: 0,
        } as Player),
      responses,
    }) as Response),
    filter<Response>((response) => Boolean(response.responses))
  )(allResponses);
};
