'use client';

import React, { useRef, useEffect } from 'react';

const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouse = { x: -1000, y: -1000, radius: 150 };
    const numParticles = 12;
    const particles: Particle[] = [];
    
    const iconTypes = ['capsule', 'pill', 'dna'];

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      type: string;
      rotation: number;
      rotationSpeed: number;

      constructor(type: string) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.radius = Math.random() * 15 + 25;
        this.type = type;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.005;
      }

      draw() {
        ctx!.save();
        ctx!.translate(this.x, this.y);
        ctx!.rotate(this.rotation);

        ctx!.globalAlpha = 0.03;
        ctx!.fillStyle = 'hsl(var(--primary))';
        ctx!.strokeStyle = 'hsl(var(--primary))';
        ctx!.lineWidth = 1.5;

        switch (this.type) {
          case 'capsule':
            this.drawCapsule();
            break;
          case 'pill':
            this.drawPill();
            break;
          case 'dna':
            this.drawDna();
            break;
        }
        ctx!.restore();
      }
      
      drawCapsule() {
        const capsuleWidth = this.radius * 1.5;
        const capsuleHeight = this.radius;
        
        ctx!.beginPath();
        ctx!.moveTo(-capsuleWidth / 4, -capsuleHeight / 2);
        ctx!.lineTo(capsuleWidth / 4, -capsuleHeight / 2);
        ctx!.arc(capsuleWidth / 4, 0, capsuleHeight / 2, -Math.PI / 2, Math.PI / 2);
        ctx!.lineTo(-capsuleWidth / 4, capsuleHeight / 2);
        ctx!.arc(-capsuleWidth / 4, 0, capsuleHeight / 2, Math.PI / 2, -Math.PI / 2);
        ctx!.closePath();
        ctx!.fill();
        
        ctx!.beginPath();
        ctx!.moveTo(0, -capsuleHeight / 2);
        ctx!.lineTo(0, capsuleHeight / 2);
        ctx!.stroke();
      }

      drawPill() {
        ctx!.beginPath();
        ctx!.arc(0, 0, this.radius / 1.5, 0, Math.PI * 2);
        ctx!.fill();
      }
      
      drawDna() {
        const len = this.radius * 1.5;
        const halfWidth = this.radius / 4;
        const freq = 0.2;

        ctx!.beginPath();
        for (let i = -len; i <= len; i++) {
            const x1 = Math.sin(i * freq) * halfWidth;
            const y = i;
            if (i === -len) ctx!.moveTo(x1, y);
            else ctx!.lineTo(x1, y);
        }
        ctx!.stroke();

        ctx!.beginPath();
        for (let i = -len; i <= len; i++) {
            const x1 = Math.sin(i * freq + Math.PI) * halfWidth;
            const y = i;
            if (i === -len) ctx!.moveTo(x1, y);
            else ctx!.lineTo(x1, y);
        }
        ctx!.stroke();

        for (let i = -len; i <= len; i += 10) {
             const x1 = Math.sin(i * freq) * halfWidth;
             const x2 = Math.sin(i * freq + Math.PI) * halfWidth;
             ctx!.beginPath();
             ctx!.moveTo(x1, i);
             ctx!.lineTo(x2, i);
             ctx!.stroke();
        }
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        
        if (this.x < this.radius || this.x > width - this.radius) {
          this.vx *= -1;
          this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
        }
        if (this.y < this.radius || this.y > height - this.radius) {
          this.vy *= -1;
          this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));
        }

        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < mouse.radius) {
          const forceDirectionX = dx / dist;
          const forceDirectionY = dy / dist;
          const force = (mouse.radius - dist) / mouse.radius;
          const directionX = forceDirectionX * force * 1.5;
          const directionY = forceDirectionY * force * 1.5;
          this.vx += directionX;
          this.vy += directionY;
        }

        this.vx *= 0.98;
        this.vy *= 0.98;

        const maxV = 1.0;
        this.vx = Math.max(-maxV, Math.min(maxV, this.vx));
        this.vy = Math.max(-maxV, Math.min(maxV, this.vy));
      }
    }

    function init() {
        particles.length = 0;
        for (let i = 0; i < numParticles; i++) {
            particles.push(new Particle(iconTypes[i % iconTypes.length]));
        }
    }

    function animate() {
      if(!ctx) return;
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
            mouse.x = e.touches[0].clientX;
            mouse.y = e.touches[0].clientY;
        }
        e.preventDefault();
    }
    
    const handleMouseLeave = () => {
        mouse.x = -1000;
        mouse.y = -1000;
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      init();
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleMouseLeave);
    document.addEventListener('mouseleave', handleMouseLeave);

    init();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseLeave);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full"
      style={{ pointerEvents: 'none', zIndex: 0 }}
    />
  );
};

export default InteractiveBackground;
