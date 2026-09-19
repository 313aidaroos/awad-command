"use client";
import { useEffect, useState } from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  MapPin,
  BookOpen,
  History,
  Moon,
} from "lucide-react";
import { moonPhase, wordForDate } from "./almanac";
import "./daily-desk.css";
type Place = { name: string; lat: number; lon: number; timezone: string };
type Weather = {
  current: { temperature_2m: number; weather_code: number; is_day: number };
  timezone: string;
  checkedAt: string;
};
type Event = { year: number; text: string; url: string };
async function read(query: string, signal?: AbortSignal) {
  const r = await fetch(`/api/headquarters/almanac?${query}`, {
    signal,
    cache: "no-store",
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Unavailable");
  return d;
}
export function DailyDesk() {
  const [now, setNow] = useState<Date | null>(null),
    [place, setPlace] = useState<Place | null>(null),
    [city, setCity] = useState(""),
    [choices, setChoices] = useState<Place[]>([]),
    [weather, setWeather] = useState<Weather | null>(null),
    [events, setEvents] = useState<Event[]>([]),
    [index, setIndex] = useState(0),
    [notice, setNotice] = useState("Choose your city for local conditions."),
    [historyError, setHistoryError] = useState("Loading historical events…"),
    [editing, setEditing] = useState(false),
    [fahrenheit, setFahrenheit] = useState(false);
  useEffect(() => {
    setNow(new Date());
    try {
      const p = JSON.parse(localStorage.getItem("awad-hq-location") ?? "null");
      if (
        p &&
        typeof p.name === "string" &&
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lon) &&
        typeof p.timezone === "string"
      ) {
        new Intl.DateTimeFormat("en", { timeZone: p.timezone });
        setPlace(p);
      }
    } catch {}
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const zone = place?.timezone;
  const date = now
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now)
    : "";
  useEffect(() => {
    if (!date) return;
    const c = new AbortController();
    setEvents([]);
    setIndex(0);
    setHistoryError("Loading historical events…");
    read(`date=${date}`, c.signal)
      .then((d) => {
        setEvents(d.events);
        setHistoryError(
          d.events.length ? "" : "No events available for this date.",
        );
      })
      .catch(() => {
        if (!c.signal.aborted)
          setHistoryError("History source unavailable. Try again later.");
      });
    return () => c.abort();
  }, [date]);
  useEffect(() => {
    if (!place) return;
    const c = new AbortController();
    setWeather(null);
    async function load() {
      try {
        const d = await read(`lat=${place!.lat}&lon=${place!.lon}`, c.signal);
        setWeather(d);
        setNotice("");
      } catch {
        if (!c.signal.aborted)
          setNotice("Weather unavailable. Last reading may be out of date.");
      }
    }
    void load();
    const t = setInterval(load, 900000);
    return () => {
      c.abort();
      clearInterval(t);
    };
  }, [place]);
  function choose(p: Place) {
    setPlace(p);
    setChoices([]);
    setEditing(false);
    try {
      localStorage.setItem("awad-hq-location", JSON.stringify(p));
    } catch {}
  }
  async function search() {
    setNotice("Finding cities…");
    try {
      const d = await read(`city=${encodeURIComponent(city)}`);
      setChoices(d.results);
      setNotice(
        d.results.length
          ? "Choose a location below."
          : "No matching city found.",
      );
    } catch {
      setNotice("City search unavailable. Please try again.");
    }
  }
  function locate() {
    if (!navigator.geolocation) {
      setNotice("Location unavailable in this browser. Search for a city.");
      return;
    }
    setNotice("Waiting for location permission…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        choose({
          name: "Your location",
          lat: Math.round(p.coords.latitude * 100) / 100,
          lon: Math.round(p.coords.longitude * 100) / 100,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      },
      () => setNotice("Location was not shared. You can search for a city."),
      { timeout: 15000, maximumAge: 600000 },
    );
  }
  const word = date ? wordForDate(date) : null,
    moon = now ? moonPhase(now) : null,
    event = events[index];
  const code = weather?.current.weather_code ?? -1;
  const Icon =
    code >= 95
      ? CloudLightning
      : code >= 71 && code <= 77
        ? CloudSnow
        : code >= 51
          ? CloudRain
          : code > 0
            ? Cloud
            : weather?.current.is_day === 0
              ? Moon
              : Sun;
  const description =
    code === 0
      ? "Clear skies"
      : code <= 3
        ? "Cloud cover"
        : code <= 48
          ? "Fog"
          : code <= 67
            ? "Rain"
            : code <= 77
              ? "Snow"
              : code <= 82
                ? "Rain showers"
                : code <= 86
                  ? "Snow showers"
                  : "Thunderstorms";
  return (
    <section className="daily-desk" aria-label="Your daily almanac">
      <article className="daily-card word-card">
        <header>
          <BookOpen size={16} /> WORD OF THE DAY <span>{date}</span>
        </header>
        <div className="daily-inner">
          <h2>{word?.[0] ?? "Your daily word"}</h2>
          <p>{word?.[1]}</p>
          <blockquote>{word?.[2]}</blockquote>
          <small>AWAD vocabulary · changes daily · 31-word collection</small>
        </div>
      </article>
      <article className="daily-card history-card">
        <header>
          <History size={16} /> ON THIS DAY{" "}
          <span>
            {now?.toLocaleDateString(undefined, {
              timeZone: zone,
              month: "short",
              day: "numeric",
            })}
          </span>
        </header>
        <div className="daily-inner">
          {event ? (
            <>
              <h2>
                {event.year < 0 ? `${Math.abs(event.year)} BCE` : event.year}
              </h2>
              <p>{event.text}</p>
              <div className="daily-actions">
                <a href={event.url} target="_blank" rel="noreferrer">
                  Read source ↗
                </a>
                <button onClick={() => setIndex((index + 1) % events.length)}>
                  Next event {index + 1}/{events.length}
                </button>
              </div>
            </>
          ) : (
            <p role="status">{historyError}</p>
          )}
          <small>
            Wikipedia · history, conflict &amp; diplomacy · CC BY-SA
          </small>
        </div>
      </article>
      <article className="daily-card weather-card">
        <header>
          <MapPin size={16} /> LOCAL OBSERVATORY{" "}
          <button onClick={() => setEditing(!editing)}>Change city</button>
        </header>
        <div className="daily-inner">
          <div className="location-watermark">
            {place?.name ?? "SET YOUR LOCATION"}
          </div>
          <time className="retro-clock" suppressHydrationWarning>
            {now?.toLocaleTimeString("en-GB", { timeZone: zone }) ?? "--:--:--"}
          </time>
          <small>{zone ?? "Device local time"}</small>
          <div className="weather-reading">
            <Icon className="weather-motion" size={44} />
            <div>
              <strong>
                {weather
                  ? `${Math.round(fahrenheit ? (weather.current.temperature_2m * 9) / 5 + 32 : weather.current.temperature_2m)}°${fahrenheit ? "F" : "C"}`
                  : "—"}
              </strong>
              <p>{weather ? description : "Awaiting weather"}</p>
            </div>
            <button
              aria-label="Toggle temperature unit"
              onClick={() => setFahrenheit(!fahrenheit)}
            >
              °C / °F
            </button>
          </div>
          <div className="moon-reading">
            <svg
              viewBox="0 0 40 40"
              role="img"
              aria-label={moon?.name ?? "Moon"}
            >
              <circle cx="20" cy="20" r="17" fill="#172332" />
              <path
                d={
                  moon
                    ? `M20 3 A17 17 0 0 ${moon.age < 14.765 ? 1 : 0} 20 37 A${Math.max(0.1, Math.abs(Math.cos((moon.age / 29.530588853) * Math.PI * 2)) * 17)} 17 0 0 ${Math.cos((moon.age / 29.530588853) * Math.PI * 2) > 0 ? (moon.age < 14.765 ? 0 : 1) : moon.age < 14.765 ? 1 : 0} 20 3`
                    : ""
                }
                fill="#e6cf99"
              />
            </svg>
            <span>
              {moon?.name}
              <small>{moon?.illumination}% illuminated · approximate</small>
            </span>
          </div>
          {notice && <p role="status">{notice}</p>}
          {(!place || editing) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void search();
              }}
            >
              <label>
                City
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Search any city"
                  minLength={2}
                  required
                  maxLength={100}
                />
              </label>
              <div className="daily-actions">
                <button type="submit">Find city</button>
                <button type="button" onClick={locate}>
                  Use my location
                </button>
              </div>
              {choices.map((p) => (
                <button
                  className="city-choice"
                  type="button"
                  key={`${p.lat}:${p.lon}`}
                  onClick={() => choose(p)}
                >
                  {p.name}
                </button>
              ))}
              <small>
                Weather requests share the selected coordinates with Open-Meteo.
              </small>
            </form>
          )}
          <small>
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Weather by Open-Meteo
            </a>
            {weather
              ? ` · refreshed ${new Date(weather.checkedAt).toLocaleTimeString(undefined, { timeZone: zone, hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </small>
        </div>
      </article>
    </section>
  );
}
