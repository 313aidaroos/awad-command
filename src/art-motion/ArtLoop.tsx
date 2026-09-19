"use client";
import { useEffect, useRef, useState } from "react";
import "./art-loop.css";
export function ArtLoop({
  src,
  paused = false,
  tile,
}: {
  src: string;
  paused?: boolean;
  tile?: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const container = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      if (paused || media.matches || !visible || document.hidden) video.pause();
      else void video.play().catch(() => {});
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(container.current ?? video);
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      video.pause();
    };
  }, [paused, src]);

  return (
    <span
      ref={container}
      className={`art-loop ${tile === undefined ? "art-loop-full" : `art-loop-tile ${tile === 7 && src.includes("more-offices") ? "art-loop-exterior" : ""}`}`}
      aria-hidden="true"
    >
      <video
        ref={ref}
        key={src}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(src)}
        onLoadedData={() => setFailed(null)}
        style={
          failed === src
            ? { display: "none" }
            : tile === undefined
              ? undefined
              : {
                  width: "400%",
                  height: "200%",
                  left: `-${(tile % 4) * 100}%`,
                  top: `-${Math.floor(tile / 4) * 100}%`,
                }
        }
      />
    </span>
  );
}
