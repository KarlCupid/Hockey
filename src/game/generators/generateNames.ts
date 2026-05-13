import { NATIONALITIES } from "../constants";
import { SeededRng } from "../rng";

export const FIRST_NAMES = [
  "Alden",
  "Bram",
  "Callum",
  "Darian",
  "Elias",
  "Finn",
  "Gavin",
  "Henrik",
  "Ivar",
  "Jonas",
  "Kellan",
  "Luca",
  "Marek",
  "Nico",
  "Oskar",
  "Pavel",
  "Quinn",
  "Rasmus",
  "Soren",
  "Tomas",
  "Ulrik",
  "Viktor",
  "Wesley",
  "Xander",
  "Yann",
  "Zane",
  "Arto",
  "Boden",
  "Cedric",
  "Dmitri",
  "Emil",
  "Frederik",
  "Gideon",
  "Hugo",
  "Isak",
  "Jalen",
  "Kaspar",
  "Leon",
  "Mathis",
  "Noel"
];

export const LAST_NAMES = [
  "Ashford",
  "Boreal",
  "Caldwell",
  "Dahlstrom",
  "Eklund",
  "Frost",
  "Granlund",
  "Havel",
  "Iverson",
  "Jurik",
  "Kestner",
  "Lindholm",
  "Marceau",
  "Novak",
  "Orlovic",
  "Petran",
  "Quarry",
  "Raskin",
  "Savoie",
  "Talvik",
  "Upton",
  "Vasko",
  "Westberg",
  "Yarrow",
  "Zelenka",
  "Arvidsen",
  "Bexley",
  "Crane",
  "Dumont",
  "Everhart",
  "Falk",
  "Graves",
  "Halonen",
  "Ingram",
  "Jensen",
  "Kovar",
  "Lehto",
  "Madsen",
  "Nystrom",
  "Olsen"
];

export function generateDisplayName(rng: SeededRng): { firstName: string; lastName: string; displayName: string } {
  const firstName = rng.pick(FIRST_NAMES);
  const lastName = rng.pick(LAST_NAMES);
  return { firstName, lastName, displayName: `${firstName} ${lastName}` };
}

export function generateNationality(rng: SeededRng): string {
  return rng.pick(NATIONALITIES);
}
