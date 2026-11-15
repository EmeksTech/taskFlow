import "server-only";

import argon2, { type HashOptions } from "argon2";

const passwordHashOptions: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
};

export function hashPassword(password: string | Buffer) {
  return argon2.hash(password, passwordHashOptions);
}

export function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}
