import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Particle {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  dx: number;
  dy: number;
}

interface VictoryFireworksProps {
  active: boolean;
  type?: 'burst' | 'victory';
}

const COLORS = [
  '#FF3366', // Hot pink
  '#33FFCC', // Cyan
  '#FFCC00', // Yellow gold
  '#9933FF', // Neon Purple
  '#FF6633', // Neon Orange
  '#33FF55', // Electric Green
  '#FF00FF', // Magenta
];

export function VictoryFireworks({ active, type = 'burst' }: VictoryFireworksProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    // Determine configuration based on action type
    const count = type === 'victory' ? 80 : 35;
    const centers = type === 'victory' 
      ? [
          { x: window.innerWidth * 0.2, y: window.innerHeight * 0.6 },
          { x: window.innerWidth * 0.5, y: window.innerHeight * 0.4 },
          { x: window.innerWidth * 0.8, y: window.innerHeight * 0.6 }
        ]
      : [{ x: window.innerWidth / 2, y: window.innerHeight / 2 }];

    const newParticles: Particle[] = [];

    centers.forEach((center) => {
      const pCount = Math.floor(count / centers.length);
      for (let i = 0; i < pCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 250 + 100; // Speed magnitude
        const distance = Math.random() * 20;

        newParticles.push({
          id: `${center.x}-${i}-${Math.random()}`,
          // Initial offsets around the center
          x: center.x + Math.cos(angle) * distance,
          y: center.y + Math.sin(angle) * distance,
          size: Math.random() * 10 + 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed - 50, // Slight upward bias
        });
      }
    });

    setParticles(newParticles);

    // Auto cleanup particles after 1.5 seconds
    const timer = setTimeout(() => {
      setParticles([]);
    }, 1500);

    return () => clearTimeout(timer);
  }, [active, type]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ 
              x: p.x, 
              y: p.y, 
              scale: 0,
              opacity: 1,
              rotate: 0 
            }}
            animate={{ 
              x: p.x + p.dx, 
              y: p.y + p.dy + 150, // simulated gravity pulling them down
              scale: [0, 1.2, 0.5, 0],
              opacity: [1, 1, 0.4, 0],
              rotate: Math.random() * 360 + 180
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.2, 
              ease: "easeOut" 
            }}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 10px ${p.color}aa`,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
