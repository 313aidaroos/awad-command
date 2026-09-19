import { describe, it, expect } from "vitest";
import { preferredBritishVoice, emotionForMessage } from "./cixyCharacter";
describe("Cixy British voice", () => {
  it("chooses a British female voice over US and male defaults", () => {
    expect(
      preferredBritishVoice([
        { name: "Samantha", lang: "en-US" },
        { name: "Daniel", lang: "en-GB" },
        { name: "Serena", lang: "en-GB" },
      ])?.name,
    ).toBe("Serena");
  });
  it("does not silently switch to an American or male voice", () => {
    expect(
      preferredBritishVoice([
        { name: "Daniel", lang: "en-GB" },
        { name: "Samantha", lang: "en-US" },
      ]),
    ).toBeUndefined();
  });
  it("supports installed macOS British voices",()=>{expect(preferredBritishVoice([{name:"Daniel",lang:"en-GB"},{name:"Flo (English (United Kingdom))",lang:"en-GB"}])?.name).toContain("Flo");});
  it("supports Google UK English Female", () => {
    expect(
      preferredBritishVoice([
        { name: "Google UK English Female", lang: "en-GB" },
      ])?.name,
    ).toContain("Female");
  });
});
describe("Cixy expression", () => {
  it("reacts to affection without treating distress as flirtation", () => {
    expect(emotionForMessage("I love you")).toBe("blushing");
    expect(emotionForMessage("I am sad, sweetheart")).toBe("concerned");
    expect(emotionForMessage("good news, we won")).toBe("happy");
  });
});
