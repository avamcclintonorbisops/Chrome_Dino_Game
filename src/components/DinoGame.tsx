import React, { useEffect, useRef, useState } from "react";
import '../styles/animations.css';

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
  const [showCover, setShowCover] = useState<boolean>(true);
  const dinoImageDataRef = useRef<ImageData | null>(null);
  const rockImagesRef = useRef<HTMLImageElement[]>([]);
  const currentRockIndexRef = useRef<number>(0);

  function startGame() {
    setShowCover(false);
    setScore(0);
    setGameOver(false);
    setIsRunning(true);
  }

  function restartGame() {
    setGameOver(false);
    setScore(0);
    setIsRunning(true);
  }

  useEffect(() => {
    if (!isRunning) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 400;

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
      y: canvas.height - GROUND_HEIGHT - 120,
      width: 100,
      height: 100,
      dy: 0,
      isJumping: false,
      collisionBox: {
        x: 20,
        y: 15,
        width: 60,
        height: 70,
      }
    };

    let obstacles: Obstacle[] = [];
    let lastObstacleTime = Date.now();
    let localScore = 0;

    function drawGround() {
      if (!ctx || !canvas) return;
      
      const gradient = ctx.createLinearGradient(0, canvas.height - GROUND_HEIGHT, 0, canvas.height);
      gradient.addColorStop(0, "#e6c88e");
      gradient.addColorStop(1, "#d4b483");
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      for (let i = 0; i < canvas.width; i += 4) {
        for (let j = canvas.height - GROUND_HEIGHT; j < canvas.height; j += 4) {
          if (Math.random() > 0.5) {
            ctx.fillRect(i, j, 2, 2);
          }
        }
      }
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, 2);
    }

    function drawDino() {
      if (!ctx) return;
      if (dinoImg.complete) {
        ctx.drawImage(dinoImg, dino.x, dino.y, dino.width, dino.height);
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
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.font = "20px Arial";
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Score: ${localScore}`, 30, 30);
      ctx.restore();
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
      ctx.fillStyle = "#1a4b84";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawGround();
      updateDino();
      drawDino();
      updateObstacles();
      drawObstacles();
      drawScore();
      
      // Check for collision
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

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Cover Screen */}
      {showCover && (
        <div className="fixed inset-0 w-screen h-screen">
          {/* Title */}
          <div className="w-full text-center pt-20 relative z-[9999]">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white inline-block">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse">
                Submarine Adventure
              </span>
            </h1>
          </div>

          {/* Animated Background */}
          <div className="fixed inset-0 w-screen h-screen overflow-hidden">
            <img 
              src="/ocean.gif" 
              alt="Ocean Background" 
              className="w-[300%] h-[300%] object-cover"
              style={{
                maxWidth: '300vw',
                maxHeight: '300vh',
                objectPosition: 'center',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) scale(3)'
              }}
            />
            <div className="fixed inset-0 bg-black/50" />
          </div>

          {/* Buttons Container */}
          <div className="fixed bottom-10 left-1/2 z-[9999] transform -translate-x-1/2 flex flex-col items-center gap-4">
            {/* Start Button */}
            <button
              onClick={startGame}
              className="px-16 py-6 text-3xl font-bold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg 
                       shadow-lg hover:from-red-700 hover:to-red-800 transform hover:scale-105 transition-all duration-300
                       active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              Start Game
            </button>
          </div>

          {/* Animated Elements */}
          <div className="fixed inset-0 pointer-events-none">
            {/* Light Rays */}
            <div className="absolute inset-0 opacity-20">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-full bg-white transform rotate-45 animate-light-ray"
                  style={{
                    left: `${20 + i * 15}%`,
                    animationDelay: `${i * 0.5}s`
                  }}
                />
              ))}
            </div>

            {/* Bubbles */}
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-6 h-6 rounded-full bg-white/20 animate-bubble"
                style={{
                  left: `${Math.random() * 100}%`,
                  bottom: `-${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Game Container */}
      <div 
        id="game-container" 
        className="flex justify-center items-center h-screen w-screen bg-gray-900"
        style={{
          margin: 0,
          padding: 0,
          height: '100vh',
          width: '100vw',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <div className="relative">
          <canvas 
            ref={canvasRef} 
            className="bg-blue-900 shadow-lg" 
            style={{ 
              width: '1200px', 
              height: '600px',
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)'
            }}
          />

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
              <div className="text-white text-4xl mb-8">Game Over! Final Score: {score}</div>
              <button
                onClick={restartGame}
                className="px-8 py-4 text-2xl font-bold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg 
                         shadow-lg hover:from-red-700 hover:to-red-800 transform hover:scale-105 transition-all duration-300
                         active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 