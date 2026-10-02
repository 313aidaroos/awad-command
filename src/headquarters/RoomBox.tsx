"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Settings2 } from "lucide-react";

/**
 * Per-box shape/size customization for the Headquarters dashboard.
 *
 * Preferences persist in localStorage under BOX_LAYOUT_KEY, keyed by the
 * box's stable `id`. Boxes without an id are not customizable.
 *
 * CIXY EXCLUSION (owner's rule): #hq-cixy (the CeoConsole column) is
 * intentionally NOT a customizable Box. She gets no controls and always
 * stays square. See also the #hq-cixy guard rules in headquarters.css.
 */
export const BOX_LAYOUT_KEY = "hq-box-layout";
export const CIXY_BOX_ID = "hq-cixy";

export type BoxShape = "square" | "rect";
export type BoxSize = "s" | "m" | "l";
export type BoxLayout = { shape: BoxShape; size: BoxSize };

const DEFAULTS: BoxLayout = { shape: "rect", size: "m" };

function readAll(): Record<string, BoxLayout> {
  try {
    const raw = localStorage.getItem(BOX_LAYOUT_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, BoxLayout>)
      : {};
  } catch {
    return {};
  }
}

/** Current shape/size for a box id, persisted to localStorage. */
export function useBoxLayout(id: string | undefined) {
  const [layout, setLayoutState] = useState<BoxLayout>(DEFAULTS);
  useEffect(() => {
    if (!id) return;
    const saved = readAll()[id];
    if (saved) setLayoutState({ ...DEFAULTS, ...saved });
  }, [id]);
  const setLayout = useCallback(
    (patch: Partial<BoxLayout>) => {
      if (!id) return;
      setLayoutState((prev) => {
        const next = { ...prev, ...patch };
        try {
          const all = readAll();
          all[id] = next;
          localStorage.setItem(BOX_LAYOUT_KEY, JSON.stringify(all));
        } catch {
          /* storage unavailable — layout still applies for this session */
        }
        return next;
      });
    },
    [id],
  );
  return [layout, setLayout] as const;
}

/** True while the "Customize" edit mode toggle in the HQ header is on. */
export const BoxCustomizeContext = createContext(false);

const SHAPES: { value: BoxShape; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "rect", label: "Rectangle" },
];
const SIZES: { value: BoxSize; label: string }[] = [
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
];

export function Box({
  title,
  icon,
  children,
  action,
  id,
  className = "",
  customizable = true,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
  /** Cixy's box and id-less boxes never get customization controls. */
  customizable?: boolean;
}) {
  const customizing = useContext(BoxCustomizeContext);
  const [layout, setLayout] = useBoxLayout(
    customizable && id !== CIXY_BOX_ID ? id : undefined,
  );
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open ]);

  // Editing chrome (gear button + popover) renders ONLY in customize mode.
  const showControls =
    customizing && customizable && !!id && id !== CIXY_BOX_ID;

  return (
    <section
      id={id}
      data-customizable={showControls || (customizable && !!id)}
      className={`room-box room-box--${layout.shape} room-box--size-${layout.size} ${className}`}
    >
      <header>
        <h2>
          {icon}
          {title}
        </h2>
        <div className="room-box-head-actions">
          {action}
          {showControls && (
            <div className="room-box-settings-wrap" ref={popRef}>
              <button
                type="button"
                className="room-box-settings-btn"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-label={`Customize ${title} box`}
                title="Box shape and size"
              >
                <Settings2 size={14} />
              </button>
              {open && (
                <div
                  className="room-box-settings"
                  role="dialog"
                  aria-label={`${title} display settings`}
                >
                  <div className="room-box-settings-row">
                    <span>Shape</span>
                    {SHAPES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        aria-pressed={layout.shape === s.value}
                        onClick={() => setLayout({ shape: s.value })}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="room-box-settings-row">
                    <span>Size</span>
                    {SIZES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        aria-pressed={layout.size === s.value}
                        onClick={() => setLayout({ size: s.value })}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      <div className="room-box-body">{children}</div>
    </section>
  );
}
