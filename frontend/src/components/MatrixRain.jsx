import { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";

const CHARS =
  "アイウエオカキクケコサシスセソ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const FONT_SIZE = 16;
const FRAME_INTERVAL_MS = 60;

export default function MatrixRain() {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const canvasRef = useRef(null);
  const active = theme === "matrix" && settings?.matrixRainEnabled !== false;

  useEffect(() => {
    if (!active) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let columns = 0;
    let drops = [];

    const setup = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      columns = Math.ceil(width / FONT_SIZE);
      drops = new Array(columns).fill(0).map(() => Math.random() * -100);
    };

    setup();

    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(setup, 200);
    };

    window.addEventListener("resize", handleResize);

    let rafId = null;
    let lastFrame = 0;
    let running = true;

    const draw = (timestamp) => {
      if (!running) return;

      rafId = requestAnimationFrame(draw);

      if (timestamp - lastFrame < FRAME_INTERVAL_MS) return;
      lastFrame = timestamp;

      ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${FONT_SIZE}px monospace`;

      for (let i = 0; i < columns; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const y = drops[i] * FONT_SIZE;

        ctx.fillStyle = "#bbf7d0";
        ctx.fillText(char, i * FONT_SIZE, y);

        ctx.fillStyle = "#22c55e";
        ctx.fillText(
          CHARS[Math.floor(Math.random() * CHARS.length)],
          i * FONT_SIZE,
          y - FONT_SIZE,
        );

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        running = false;

        if (rafId) cancelAnimationFrame(rafId);
      } else if (!running) {
        running = true;
        lastFrame = 0;
        rafId = requestAnimationFrame(draw);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    rafId = requestAnimationFrame(draw);

    return () => {
      running = false;

      if (rafId) cancelAnimationFrame(rafId);

      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        opacity: 0.6,
      }}
    />
  );
}
