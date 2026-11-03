import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, COST);
}

// Hash of a random string, compared against when the email is unknown so a
// failed login takes the same time whether or not the account exists.
let dummyHash: Promise<string> | undefined;

export async function verifyPassword(password: string, hash: string | null) {
  if (hash === null) {
    dummyHash ??= bcrypt.hash(crypto.randomUUID(), COST);
    await bcrypt.compare(password, await dummyHash);
    return false;
  }
  return bcrypt.compare(password, hash);
}
