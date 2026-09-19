export type CixyEmotion = "warm" | "happy" | "blushing" | "concerned";
export function emotionForMessage(text: string): CixyEmotion {
  if (
    /\b(sad|upset|anxious|worried|hurt|grieving|lonely|lost someone|bad news)\b/i.test(
      text,
    )
  )
    return "concerned";
  if (
    /\b(love you|love u|marry me|kiss|flirt|beautiful|gorgeous|cute|pretty|darling|sweetheart)\b/i.test(
      text,
    )
  )
    return "blushing";
  if (
    /\b(thank you|thanks|we won|good news|great news|success|celebrate|amazing)\b/i.test(
      text,
    )
  )
    return "happy";
  return "warm";
}
export function preferredBritishVoice<T extends { lang: string; name: string }>(
  voices: T[],
): T | undefined {
  const british = voices.filter((v) => /^en[-_]GB$/i.test(v.lang));
  return british.find(
    (v) =>
      /serena|kate|martha|hazel|sonia|libby|female|susan|amy|emma|flo|shelley|sandy|grandma/i.test(
        v.name,
      ) && !/(^|[^a-z])male([^a-z]|$)/i.test(v.name),
  );
}
