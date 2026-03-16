import { useEffect, useState } from "react";

export const MovingWatermark = () => {
  const [position, setPosition] = useState({ x: 10, y: 10 });
  const [direction, setDirection] = useState({ dx: 1, dy: 1 });

  useEffect(() => {
    const speed = 0.4;
    let animFrame: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      setPosition((prev) => {
        let newX = prev.x + direction.dx * speed * (delta / 16);
        let newY = prev.y + direction.dy * speed * (delta / 16);
        let newDx = direction.dx;
        let newDy = direction.dy;

        if (newX > 75 || newX < 0) {
          newDx = -newDx;
          newX = Math.max(0, Math.min(75, newX));
        }
        if (newY > 85 || newY < 0) {
          newDy = -newDy;
          newY = Math.max(0, Math.min(85, newY));
        }

        if (newDx !== direction.dx || newDy !== direction.dy) {
          setDirection({ dx: newDx, dy: newDy });
        }

        return { x: newX, y: newY };
      });

      animFrame = requestAnimationFrame(animate);
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [direction]);

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        zIndex: 20,
      }}
    >
      <span className="text-white/30 font-display text-lg md:text-2xl font-bold tracking-wider whitespace-nowrap rotate-[-20deg] inline-block">
        MEDIA MULE
      </span>
    </div>
  );
};
