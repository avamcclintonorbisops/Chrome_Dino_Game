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
  collisionBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  collisionBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageIndex: number;
}

export default function DinoGame(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [imagesLoaded, setImagesLoaded] = useState<boolean>(false);
  const [showHitboxes, setShowHitboxes] = useState<boolean>(true); // Debug mode for hitboxes
  const dinoImageDataRef = useRef<ImageData | null>(null);
  const rockImagesRef = useRef<HTMLImageElement[]>([]);
  const currentRockIndexRef = useRef<number>(0);

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
    const rock1Img = new Image();
    const rock2Img = new Image();
    const rock3Img = new Image();
    
    let imagesToLoad = 4;
    let loadedImages = 0;

    function handleImageLoad() {
      loadedImages++;
      if (loadedImages === imagesToLoad) {
        rockImagesRef.current = [rock1Img, rock2Img, rock3Img];
        setImagesLoaded(true);
      }
    }

    dinoImg.onload = handleImageLoad;
    dinoImg.onerror = () => console.error('Error loading sub.png');
    dinoImg.src = '/sub.png';

    rock1Img.onload = handleImageLoad;
    rock1Img.onerror = () => console.error('Error loading rock1.png');
    rock1Img.src = '/rock1.png';

    rock2Img.onload = handleImageLoad;
    rock2Img.onerror = () => console.error('Error loading rock2.png');
    rock2Img.src = '/rock2.png';

    rock3Img.onload = handleImageLoad;
    rock3Img.onerror = () => console.error('Error loading rock3.png');
    rock3Img.src = '/rock3.png';

    let dino: Dino = {
      x: 50,
      y: canvas.height - GROUND_HEIGHT - 80,
      width: 80,
      height: 80,
      dy: 0,
      isJumping: false,
      collisionBox: {
        x: 15,  // Offset from left to account for transparent margin
        y: 10,  // Offset from top to account for transparent margin
        width: 50,  // Reduced width to match visible area
        height: 60, // Reduced height to match visible area
      }
    };

    let obstacles: Obstacle[] = [];
    let lastObstacleTime = Date.now();
    let localScore = 0;

    function drawGround() {
      if (!ctx || !canvas) return;
      
      // Create gradient for the sand
      const gradient = ctx.createLinearGradient(0, canvas.height - GROUND_HEIGHT, 0, canvas.height);
      gradient.addColorStop(0, "#e6c88e");  // Lighter sand at top
      gradient.addColorStop(1, "#d4b483");  // Darker sand at bottom
      
      // Draw the base gradient
      ctx.fillStyle = gradient;
      ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
      
      // Add subtle sand texture
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      for (let i = 0; i < canvas.width; i += 4) {
        for (let j = canvas.height - GROUND_HEIGHT; j < canvas.height; j += 4) {
          if (Math.random() > 0.5) {
            ctx.fillRect(i, j, 2, 2);
          }
        }
      }
      
      // Add a subtle highlight at the top of the sand
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, 2);
    }

    function drawHitbox(ctx: CanvasRenderingContext2D, x: number, y: number, box: { x: number, y: number, width: number, height: number }) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + box.x, y + box.y, box.width, box.height);
    }

    function drawDino() {
      if (!ctx) return;
      if (dinoImg.complete) {
        ctx.drawImage(dinoImg, dino.x, dino.y, dino.width, dino.height);
        if (showHitboxes) {
          drawHitbox(ctx, dino.x, dino.y, dino.collisionBox);
        }
      }
    }

    function drawObstacles() {
      if (!ctx || !canvas) return;
      const rockImages = rockImagesRef.current;
      if (rockImages.length === 0) return;

      obstacles.forEach(obs => {
        const drawY = canvas.height - GROUND_HEIGHT - obs.height;
        const rockImg = rockImages[obs.imageIndex];
        if (rockImg.complete) {
          ctx.drawImage(rockImg, obs.x, drawY, obs.width, obs.height);
          if (showHitboxes) {
            drawHitbox(ctx, obs.x, drawY, obs.collisionBox);
          }
        }
      });
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
          collisionBox: {
            x: 5,
            y: 5,
            width: 50,
            height: 50,
          },
          imageIndex: currentRockIndexRef.current
        });
        
        // Update the rock index for the next obstacle
        currentRockIndexRef.current = (currentRockIndexRef.current + 1) % 3;
        
        lastObstacleTime = now;
      }

      obstacles.forEach(obs => (obs.x -= OBSTACLE_SPEED));
      obstacles = obstacles.filter(obs => obs.x + obs.width > 0);
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

    function checkCollision(): boolean {
      if (!canvas) return false;
      
      for (const obs of obstacles) {
        const dinoBox = {
          left: dino.x + dino.collisionBox.x,
          right: dino.x + dino.collisionBox.x + dino.collisionBox.width,
          top: dino.y + dino.collisionBox.y,
          bottom: dino.y + dino.collisionBox.y + dino.collisionBox.height
        };

        const obsBox = {
          left: obs.x + obs.collisionBox.x,
          right: obs.x + obs.collisionBox.x + obs.collisionBox.width,
          top: canvas.height - GROUND_HEIGHT - obs.height + obs.collisionBox.y,
          bottom: canvas.height - GROUND_HEIGHT - obs.height + obs.collisionBox.y + obs.collisionBox.height
        };

        if (
          dinoBox.left < obsBox.right &&
          dinoBox.right > obsBox.left &&
          dinoBox.top < obsBox.bottom &&
          dinoBox.bottom > obsBox.top
        ) {
          return true;
        }
      }
      return false;
    }

    function loop() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Add ocean blue background
      ctx.fillStyle = "#1a4b84";  // Deep ocean blue color
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    <div className="relative flex flex-col justify-center items-center min-h-screen">
      {/* Ocean Background */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/ocean.png)' }}
      />

      {!isRunning && !gameOver && (
        <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0">
            {/* Light rays */}
            <div className="absolute inset-0 opacity-20">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute h-full w-1 bg-white transform rotate-45"
                  style={{
                    left: `${20 + i * 15}%`,
                    animation: `lightRay ${3 + i * 0.5}s infinite ease-in-out`,
                    opacity: 0.3,
                  }}
                />
              ))}
            </div>
            
            {/* Bubbles */}
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white opacity-20"
                style={{
                  width: `${Math.random() * 10 + 5}px`,
                  height: `${Math.random() * 10 + 5}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `bubble ${Math.random() * 3 + 2}s infinite ease-in-out`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          {/* Title */}
          <h1 className="text-6xl font-bold text-white mb-8 relative z-10">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-blue-400">
              Submarine Adventure
            </span>
            <div className="absolute -inset-1 bg-blue-400/20 blur-xl -z-10" />
          </h1>

          {/* Start Button */}
          <button
            onClick={startGame}
            className="relative px-12 py-4 text-xl font-semibold text-white rounded-lg overflow-hidden group"
          >
            {/* Button background with gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-90 group-hover:opacity-100 transition-opacity" />
            
            {/* Glassy overlay */}
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
            
            {/* Button content */}
            <span className="relative z-10">Start Game</span>
            
            {/* Shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </button>

          {/* Fish silhouettes */}
          <div className="absolute bottom-20 left-0 w-full">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute text-white opacity-10"
                style={{
                  fontSize: '2rem',
                  left: `${i * 30}%`,
                  animation: `swim ${5 + i * 2}s infinite linear`,
                  animationDelay: `${i * 2}s`,
                }}
              >
                🐠
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Canvas */}
      <canvas 
        ref={canvasRef} 
        className={`border border-white ${!isRunning && !gameOver ? 'hidden' : ''}`} 
      />

      {/* Game Controls */}
      <div className="mt-4 flex gap-4">
        {!isRunning && gameOver && (
          <button
            onClick={startGame}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Restart
          </button>
        )}
        {isRunning && (
          <button
            onClick={() => setShowHitboxes(!showHitboxes)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {showHitboxes ? "Hide Hitboxes" : "Show Hitboxes"}
          </button>
        )}
      </div>
      {gameOver && (
        <div className="text-white mt-2">Game Over! Final Score: {score}</div>
      )}

      {/* Add keyframe animations */}
      <style>
        {`
          @keyframes lightRay {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.5; }
          }
          @keyframes bubble {
            0% { transform: translateY(0); opacity: 0; }
            50% { opacity: 0.2; }
            100% { transform: translateY(-100vh); opacity: 0; }
          }
          @keyframes swim {
            0% { transform: translateX(-100%) rotate(0deg); }
            50% { transform: translateX(50%) rotate(5deg); }
            100% { transform: translateX(200%) rotate(0deg); }
          }
        `}
      </style>
    </div>
  );
} 