/** NDC y: +1 is the top of the frame, −1 is the bottom. */
export const FOLLOW_NDC_TARGET = 0.1;
export const FOLLOW_NDC_TOP = 0.34;
export const FOLLOW_NDC_BOT = -0.26;

export const FOLLOW_BACK = 7.2;
export const FOLLOW_SIDE = 2.15;
export const FOLLOW_LIFT = 1.28;

export function followCorrections(ndcY: number, ndcX: number) {
  let lookLift = 0;
  let camDrop = 0;
  let pullBack = 0;

  if (ndcY > FOLLOW_NDC_TOP) {
    lookLift = (ndcY - FOLLOW_NDC_TARGET) * 2.8;
    camDrop = Math.min(2.1, (ndcY - FOLLOW_NDC_TOP) * 3.4);
    if (ndcY > 0.52) pullBack = 3.1;
  } else if (ndcY < FOLLOW_NDC_BOT) {
    lookLift = (ndcY - FOLLOW_NDC_TARGET) * 1.45;
  }

  if (Math.abs(ndcX) > 0.56) pullBack += 1.7;

  return { lookLift, camDrop, pullBack };
}
