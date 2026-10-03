import { describe, expect, it } from "vitest";
import { AI_CREDITS_MESSAGE, aiOutOfCredits, friendlyAiError } from "./aiError";

describe("friendlyAiError", () => {
  it("recognizes the Anthropic out-of-credits error", () => {
    const err = new Error('400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."}}');
    expect(aiOutOfCredits(err)).toBe(true);
    expect(friendlyAiError(err, "fallback")).toBe(AI_CREDITS_MESSAGE);
  });
  it("keeps the fallback for other failures", () => {
    expect(friendlyAiError(new Error("timeout"), "fallback")).toBe("fallback");
    expect(aiOutOfCredits(null)).toBe(false);
  });
});
