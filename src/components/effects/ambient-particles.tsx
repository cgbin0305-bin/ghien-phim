"use client";

import * as React from "react";

export interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  angle: number;
  spin: number;
  opacity: number;
  type: "petal" | "firefly";
}

export interface AmbientParticlesProps {
  /** Dừng vòng lặp requestAnimationFrame khi bật Cinema Mode hoặc cuộn qua khỏi Hero Banner */
  isPaused?: boolean;
  className?: string;
}

function createParticle(width: number, height: number, randomY = true): Particle {
  const type: Particle["type"] = Math.random() < 0.65 ? "petal" : "firefly";
  const isPetal = type === "petal";

  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : isPetal ? -15 - Math.random() * 25 : height + 10,
    size: isPetal ? 5 + Math.random() * 5.5 : 2 + Math.random() * 2.5,
    speedX: isPetal ? 0.35 + Math.random() * 0.65 : (Math.random() - 0.5) * 0.45,
    speedY: isPetal ? 0.45 + Math.random() * 0.75 : -0.2 - Math.random() * 0.35,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.03,
    opacity: isPetal ? 0.35 + Math.random() * 0.5 : 0.4 + Math.random() * 0.55,
    type,
  };
}

/**
 * 1. <AmbientParticles /> (Canvas Hoa Đào & Đom Đóm Động):
 * - Dùng useRef<HTMLCanvasElement>(null) và vòng lặp requestAnimationFrame trong useEffect
 *   (cleanup cancelAnimationFrame khi unmount).
 * - Interface Particle (x, y, size, speedX, speedY, angle, spin, opacity, type: 'petal' | 'firefly').
 * - Vẽ cánh hoa đào rơi xoay lượn theo hàm Math.sin(angle) và đom đóm phát sáng (ctx.shadowBlur = 10)
 *   bay lơ lửng. Nhận prop isPaused: boolean để dừng vòng lặp khi bật Cinema Mode hoặc cuộn qua banner.
 */
export function AmbientParticles({ isPaused = false, className }: AmbientParticlesProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [inView, setInView] = React.useState(true);
  const [cinemaDimmed, setCinemaDimmed] = React.useState(false);

  // Theo dõi khi cuộn qua khỏi Hero Banner & khi bật Cinema Mode
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) {
            setInView(entry.isIntersecting);
          }
        },
        { threshold: 0.02 },
      );
      observer.observe(canvas);
    }

    const onCinemaMode = (event: Event) => {
      const custom = event as CustomEvent<{ lightsOff?: boolean }>;
      setCinemaDimmed(Boolean(custom.detail?.lightsOff));
    };

    window.addEventListener("gheienphim:cinema-mode", onCinemaMode);
    return () => {
      observer?.disconnect();
      window.removeEventListener("gheienphim:cinema-mode", onCinemaMode);
    };
  }, []);

  const effectivePaused = isPaused || !inView || cinemaDimmed;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || effectivePaused) return;

    // Bỏ qua trong môi trường test jsdom
    if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent || "")) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number | null = null;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(32, Math.max(16, Math.floor(width / 48)));
      if (particles.length === 0) {
        particles = Array.from({ length: count }, () => createParticle(width, height, true));
      }
    };

    resize();

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i]!;
        p.angle += p.spin || 0.02;

        if (p.type === "petal") {
          // Cánh hoa đào rơi xoay lượn theo hàm Math.sin(angle)
          p.x += p.speedX + Math.sin(p.angle) * 0.65;
          p.y += p.speedY;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.shadowBlur = 4;
          ctx.shadowColor = "rgba(244, 165, 188, 0.35)";
          ctx.fillStyle = `rgba(248, 187, 208, ${p.opacity})`;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.bezierCurveTo(
            p.size * 0.85,
            -p.size * 0.45,
            p.size * 0.78,
            p.size * 0.75,
            0,
            p.size,
          );
          ctx.bezierCurveTo(
            -p.size * 0.78,
            p.size * 0.75,
            -p.size * 0.85,
            -p.size * 0.45,
            0,
            -p.size,
          );
          ctx.fill();
          ctx.restore();
        } else {
          // Đom đóm phát sáng (ctx.shadowBlur = 10) bay lơ lửng
          p.x += p.speedX + Math.sin(p.angle * 1.5) * 0.35;
          p.y += p.speedY;
          const pulseOpacity = Math.max(
            0.18,
            Math.min(0.95, p.opacity + Math.sin(p.angle * 2) * 0.25),
          );

          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(212, 175, 55, 0.9)";
          ctx.fillStyle = `rgba(243, 229, 171, ${pulseOpacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Tái tạo hạt khi bay ra khỏi vùng Hero
        if (
          (p.type === "petal" && (p.y > height + 20 || p.x > width + 25)) ||
          (p.type === "firefly" && (p.y < -20 || p.x < -20 || p.x > width + 20))
        ) {
          particles[i] = createParticle(width, height, false);
        }
      }

      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);
    window.addEventListener("resize", resize, { passive: true });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("resize", resize);
    };
  }, [effectivePaused]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="ambient-particles-canvas"
      data-paused={effectivePaused ? "true" : "false"}
      className={
        className ?? "pointer-events-none absolute inset-0 z-10 size-full select-none"
      }
    />
  );
}
