"use client";

import { useEffect, useState } from "react";

type Appearance = {
  hairStyle: string;
  hairColor: string;
  skinTone: string;
  eyeColor: string;
  outfit: string;
};

const key = "awad-command:cixy-appearance:v1";
const defaults: Appearance = {
  hairStyle: "waves",
  hairColor: "#15121b",
  skinTone: "#d99a72",
  eyeColor: "#436f82",
  outfit: "executive",
};
const hairStyles = ["waves", "locs", "braids", "curls", "straight", "bob"];
const hairColors = [
  ["Midnight", "#15121b"],
  ["Espresso", "#38231d"],
  ["Auburn", "#7b2f22"],
  ["Copper red", "#ad452c"],
  ["Golden blonde", "#c79b52"],
  ["Platinum", "#ddd5c8"],
  ["Violet", "#5d3b83"],
];
const skinTones = [
  "#f3c9aa",
  "#dfad89",
  "#c9855f",
  "#a86243",
  "#75442f",
  "#472a22",
];
const eyeColors = ["#436f82", "#4d7a54", "#765233", "#6b5c94", "#27282c"];
const outfits = ["executive", "command", "evening", "casual"];

export function CixyCustomizer() {
  const [appearance, setAppearance] = useState<Appearance>(defaults);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem(key) ?? "null",
      ) as Appearance | null;
      if (value) setAppearance({ ...defaults, ...value });
    } catch {
      // Keep the safe default when device storage contains invalid data.
    }
  }, []);
  function update(field: keyof Appearance, value: string) {
    setSaved(false);
    setAppearance((current) => ({ ...current, [field]: value }));
  }
  function save() {
    localStorage.setItem(key, JSON.stringify(appearance));
    window.dispatchEvent(
      new CustomEvent("cixy-appearance-change", { detail: appearance }),
    );
    setSaved(true);
  }
  function reset() {
    setAppearance(defaults);
    localStorage.removeItem(key);
    window.dispatchEvent(
      new CustomEvent("cixy-appearance-change", { detail: defaults }),
    );
    setSaved(true);
  }
  return (
    <details className="cixy-customizer">
      <summary>Customize Cixy’s appearance</summary>
      <div className="cixy-studio">
        <CixyPortrait appearance={appearance} />
        <div className="cixy-style-controls">
          <label>
            Hair style
            <select
              value={appearance.hairStyle}
              onChange={(event) => update("hairStyle", event.target.value)}
            >
              {hairStyles.map((style) => (
                <option key={style} value={style}>
                  {style[0].toUpperCase() + style.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Hair color
            <select
              value={appearance.hairColor}
              onChange={(event) => update("hairColor", event.target.value)}
            >
              {hairColors.map(([name, value]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Skin tone</legend>
            {skinTones.map((tone) => (
              <button
                key={tone}
                type="button"
                aria-label={`Use skin tone ${tone}`}
                aria-pressed={appearance.skinTone === tone}
                style={{ background: tone }}
                onClick={() => update("skinTone", tone)}
              />
            ))}
          </fieldset>
          <fieldset>
            <legend>Eyes</legend>
            {eyeColors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use eye color ${color}`}
                aria-pressed={appearance.eyeColor === color}
                style={{ background: color }}
                onClick={() => update("eyeColor", color)}
              />
            ))}
          </fieldset>
          <label>
            Outfit
            <select
              value={appearance.outfit}
              onChange={(event) => update("outfit", event.target.value)}
            >
              {outfits.map((outfit) => (
                <option key={outfit}>
                  {outfit[0].toUpperCase() + outfit.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="cixy-style-actions">
        <button type="button" onClick={save}>
          Save appearance
        </button>
        <button type="button" onClick={reset}>
          Restore original
        </button>
        <span role="status">
          {saved ? "Saved on this device." : "Previewing changes."}
        </span>
      </div>
      <p className="cixy-render-note">
        Your live portrait uses these choices now. Cixy’s cinematic office loops
        keep their original rendered wardrobe.
      </p>
    </details>
  );
}

function CixyPortrait({ appearance }: { appearance: Appearance }) {
  return (
    <div
      className={`cixy-portrait hair-${appearance.hairStyle} outfit-${appearance.outfit}`}
      style={
        {
          "--hair": appearance.hairColor,
          "--skin": appearance.skinTone,
          "--eyes": appearance.eyeColor,
        } as React.CSSProperties
      }
      role="img"
      aria-label={`Cixy preview with ${appearance.hairStyle} hair`}
    >
      <div className="cixy-hair-back" />
      <div className="cixy-neck" />
      <div className="cixy-face">
        <div className="cixy-brow left" />
        <div className="cixy-brow right" />
        <div className="cixy-eye left" />
        <div className="cixy-eye right" />
        <div className="cixy-nose" />
        <div className="cixy-mouth" />
      </div>
      <div className="cixy-hair-front" />
      <div className="cixy-outfit">
        <i>Λ</i>
      </div>
    </div>
  );
}
