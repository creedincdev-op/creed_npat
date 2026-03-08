import { adjectives, animals, uniqueNamesGenerator } from "unique-names-generator";
import { getRandomNumber } from "../../app.utils";

export const generateRoomName = () => {
  const uniqueRoomName = uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: "-",
  });

  return `${uniqueRoomName}-${getRandomNumber()}`;
};

export const getLetterFromAlphabet = (alphabet: string[]) => {
  const alphabetCopy = alphabet.slice();

  alphabetCopy.sort(() => 0.5 - Math.random())

  const randIdx = getRandomNumber({ max: alphabet.length - 1 });

  const letter = alphabetCopy[randIdx];

  alphabetCopy.splice(randIdx, 1);

  return {
    currentLetter: letter,
    possibleAlphabet: alphabetCopy,
  };
};
