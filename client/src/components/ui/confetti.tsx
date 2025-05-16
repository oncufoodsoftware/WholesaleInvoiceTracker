import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
  duration?: number;
  particleCount?: number;
  spread?: number;
  onComplete?: () => void;
}

export function Confetti({ 
  duration = 3000, 
  particleCount = 100, 
  spread = 70,
  onComplete
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<any[]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match parent
    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create confetti particles
    const colors = [
      '#f94144', '#f3722c', '#f8961e', 
      '#f9c74f', '#90be6d', '#43aa8b', 
      '#4d908e', '#577590', '#277da1',
      '#ff99c8', '#fcf6bd', '#d0f4de'
    ];

    particles.current = [];
    for (let i = 0; i < particleCount; i++) {
      particles.current.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        size: Math.random() * 10 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: Math.random() * Math.PI * 2,
        velocity: Math.random() * 6 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 10 - 5,
        opacity: 1,
        shape: Math.random() > 0.5 ? 'circle' : 'rect'
      });
    }

    // Animation function
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.current.forEach(particle => {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation * Math.PI) / 180);
        
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = particle.color;
        
        if (particle.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        }
        
        ctx.restore();
        
        // Update position
        particle.x += Math.cos(particle.angle) * particle.velocity;
        particle.y += Math.sin(particle.angle) * particle.velocity + 0.5; // gravity
        
        // Update rotation
        particle.rotation += particle.rotationSpeed;
        
        // Slow down
        particle.velocity *= 0.99;
        
        // Fade out based on elapsed time
        particle.opacity = Math.max(0, 1 - elapsed / duration);
      });
      
      // Continue animation if time remains
      if (elapsed < duration) {
        animationRef.current = requestAnimationFrame(animate);
      } else if (onComplete) {
        onComplete();
      }
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [duration, particleCount, spread, onComplete]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-10"
    />
  );
}