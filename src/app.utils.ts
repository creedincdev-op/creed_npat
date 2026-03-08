import { zipObj } from "ramda";
import { integer, nativeMath } from "random-js";
import { EMOJIS } from "./constants";

type GetRandomNumberFn = (input?: { min?: number; max?: number }) => number;
export const getRandomNumber: GetRandomNumberFn = ({
  min = 0,
  max = 99,
} = {}) => integer(min, max)(nativeMath);

export const getEmoji = (excludeList: any[] = []) => {
  const uniqueEmojiList = EMOJIS.filter(
    (emoji) => !excludeList.includes(emoji)
  );
  const randomIndex = getRandomNumber({ max: uniqueEmojiList.length - 1 });

  return uniqueEmojiList[randomIndex];
};

export const createPlayer = (name: string, leader: boolean = false) => {
  const userId = sessionStorage.getItem("userId") || integer(100000000, 999999999)(nativeMath).toString();

  return {
    userId,
    name,
    leader,
    emoji: getEmoji(),
  };
};


const doesAnyPairCollide = (list1: string[], list2: string[]) => {
  for (let i = 0; i <= list1.length - 1; i++) {
    if (list1[i] === list2[i]) {
      return true;
    }
  }

  return false;
};

export const generateScoringPartners = (users: string[]) => {
  if (users.length >= 2) {
    const userList1 = users.slice();
    const userList2 = userList1.slice();

    while (true) {
      userList1.sort(() => 0.5 - Math.random());
      userList2.sort(() => 0.5 - Math.random());

      const hasCollision = doesAnyPairCollide(userList1, userList2);

      if (!hasCollision) {
        break;
      }
    }

    return zipObj(userList1, userList2);
  }

  return {
    [users[0]]: users[0],
  };
};

export const generateDefaultResponses = (categories: string[]) =>
  categories.reduce(
    (categoryObj, category) => ({
      ...categoryObj,
      [category]: "",
    }),
    {}
  );
