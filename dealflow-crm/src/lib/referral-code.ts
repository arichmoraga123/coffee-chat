const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomReferralCode(length = 6): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)]!;
  }
  return s;
}
