import React, { useEffect, useRef, useState } from "react";

const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const OBSTACLE_SPEED = 6;
const OBSTACLE_INTERVAL = 1500;
const GROUND_HEIGHT = 20;

interface Dino {
  x: number;
  y: number;
  width: number;
  height: number;
  dy: number;
  isJumping: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function DinoGame(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [imagesLoaded, setImagesLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (!isRunning) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 200;

    // Load images
    const dinoImg = new Image();
    const rockImg = new Image();
    
    let imagesToLoad = 2;
    let loadedImages = 0;

    function handleImageLoad() {
      loadedImages++;
      if (loadedImages === imagesToLoad) {
        setImagesLoaded(true);
      }
    }

    dinoImg.onload = handleImageLoad;
    dinoImg.onerror = () => console.error('Error loading sub.png');
    dinoImg.src = '/sub.png';

    rockImg.onload = handleImageLoad;
    rockImg.onerror = () => console.error('Error loading rock1.png');
    rockImg.src = '/rock1.png';

    let dino: Dino = {
      x: 50,
      y: canvas.height - GROUND_HEIGHT - 80,
      width: 80,
      height: 80,
      dy: 0,
      isJumping: false,
    };

    let obstacles: Obstacle[] = [];
    let lastObstacleTime = Date.now();
    let localScore = 0;

    function drawGround() {
      if (!ctx || !canvas) return;
      ctx.fillStyle = "#444";
      ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    }

    function drawDino() {
      if (!ctx) return;
      if (dinoImg.complete) {
        ctx.drawImage(dinoImg, dino.x, dino.y, dino.width, dino.height);
      }
    }

    function drawObstacles() {
      if (!ctx) return;
      if (rockImg.complete) {
        obstacles.forEach(obs => {
          ctx.drawImage(rockImg, obs.x, obs.y, obs.width, obs.height);
        });
      }
    }

    function updateObstacles() {
      if (!canvas) return;
      const now = Date.now();
      if (now - lastObstacleTime > OBSTACLE_INTERVAL) {
        obstacles.push({
          x: canvas.width,
          y: canvas.height - GROUND_HEIGHT - 60,
          width: 60,
          height: 60,
        });
        lastObstacleTime = now;
      }

      obstacles.forEach(obs => (obs.x -= OBSTACLE_SPEED));
      obstacles = obstacles.filter(obs => obs.x + obs.width > 0);
    }

    function checkCollision(): boolean {
      for (const obs of obstacles) {
        if (
          dino.x < obs.x + obs.width &&
          dino.x + dino.width > obs.x &&
          dino.y < obs.y + obs.height &&
          dino.y + dino.height > obs.y
        ) {
          return true;
        }
      }
      return false;
    }

    function updateDino() {
      if (!canvas) return;
      if (dino.isJumping) {
        dino.dy += GRAVITY;
        dino.y += dino.dy;
        if (dino.y >= canvas.height - GROUND_HEIGHT - dino.height) {
          dino.y = canvas.height - GROUND_HEIGHT - dino.height;
          dino.isJumping = false;
          dino.dy = 0;
        }
      }
    }

    function drawScore() {
      if (!ctx) return;
      ctx.fillStyle = "#fff";
      ctx.font = "20px Arial";
      ctx.fillText(`Score: ${localScore}`, 10, 30);
    }

    function loop() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGround();
      updateDino();
      drawDino();
      updateObstacles();
      drawObstacles();
      drawScore();
      if (checkCollision()) {
        setIsRunning(false);
        setGameOver(true);
        setScore(localScore);
        return;
      }
      localScore++;
      animationRef.current = requestAnimationFrame(loop);
    }

    function handleJump(e: KeyboardEvent) {
      if ((e.code === "Space" || e.key === "ArrowUp") && !dino.isJumping) {
        dino.dy = JUMP_FORCE;
        dino.isJumping = true;
      }
    }

    window.addEventListener("keydown", handleJump);
    loop();

    return () => {
      window.removeEventListener("keydown", handleJump);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRunning]);

  function startGame() {
    setScore(0);
    setGameOver(false);
    setIsRunning(true);
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-900">
      <canvas ref={canvasRef} className="border border-white" />
      {!isRunning && (
        <button
          onClick={startGame}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
        >
          {gameOver ? "Restart" : "Start"}
        </button>
      )}
      {gameOver && (
        <div className="text-white mt-2">Game Over! Final Score: {score}</div>
      )}
    </div>
  );
} 