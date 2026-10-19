"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

type Particle = {
  x: number; y: number; vx: number; vy: number;
  size: number; rot: number; vrot: number; color: string; shape: 0 | 1;
};

const COLORS = ["#25345a", "#10b981", "#f59e0b", "#0f172a", "#6f80a3", "#34d399"];

/**
 * Full-screen celebration: a spring-in check mark over a confetti burst.
 * Self-contained (canvas confetti, no external deps). Calls onDone after the
 * animation so the caller can move on / strip the URL flag.
 */
export function SuccessCelebration({
  title = "Du er logget ind!",
  subtitle = "Velkommen til NordInvest.",
  onDone,
  duration = 2600,
}: {
  title?: string;
  subtitle?: string;
  onDone?: () => void;
  duration?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;
    const parts: Particle[] = [];

    const burst = (cx: number, cy: number, count: number, power: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.4 + Math.random()) * power;
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - power * 0.6,
          size: 6 + Math.random() * 7,
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.4,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          shape: Math.random() > 0.5 ? 0 : 1,
        });
      }
    };

    // Main burst from the check mark, plus two side cannons.
    burst(W() / 2, H() * 0.42, 90, 11);
    setTimeout(() => burst(W() * 0.15, H() * 0.55, 40, 9), 220);
    setTimeout(() => burst(W() * 0.85, H() * 0.55, 40, 9), 360);

    let raf = 0;
    const gravity = 0.22;
    const friction = 0.992;
    const start = performance.now();

    const tick = (now: number) => {
      ctx.clearRect(0, 0, W(), H());
      const fade = Math.max(0, 1 - Math.max(0, now - start - (duration - 700)) / 700);
      for (const p of parts) {
        p.vx *= friction;
        p.vy = p.vy * friction + gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 0) {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (now - start < duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const done = setTimeout(() => onDone?.(), duration);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/70 backdrop-blur-md"
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative flex flex-col items-center px-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 340, damping: 16, delay: 0.05 }}
          className="relative flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500 shadow-2xl shadow-emerald-500/40"
        >
          {/* pulsing ring */}
          <motion.span
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 1, repeat: 1, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-emerald-400"
          />
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <motion.path
              d="M18 33 L28 43 L47 22"
              stroke="white"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.28, ease: "easeOut" }}
            />
          </svg>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-3xl font-bold tracking-tight text-slate-900"
        >
          {title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.62 }}
          className="mt-2 text-slate-500"
        >
          {subtitle}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
