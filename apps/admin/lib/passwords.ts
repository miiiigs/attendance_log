import { randomInt } from "node:crypto";

const PASSWORD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TEMPORARY_PASSWORD_LENGTH = 16;

export function isTemporaryPassword(value: string) {
  return value.length === TEMPORARY_PASSWORD_LENGTH && [...value].every((character) => PASSWORD_ALPHABET.includes(character));
}

export function generateTemporaryPassword() {
  let password = "";

  for (let index = 0; index < TEMPORARY_PASSWORD_LENGTH; index += 1) {
    password += PASSWORD_ALPHABET[randomInt(0, PASSWORD_ALPHABET.length)];
  }

  return password;
}
