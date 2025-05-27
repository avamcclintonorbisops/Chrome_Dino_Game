import React, { useEffect, useRef, useState } from "react";
import '../styles/animations.css';

const GRAVITY = 0.6;
const INITIAL_JUMP_FORCE = -15; // Higher initial jump
const INITIAL_OBSTACLE_SPEED = 4; // Slower initial speed
const INITIAL_OBSTACLE_INTERVAL = 2000; // Longer initial interval
const GROUND_HEIGHT = 20;
const POWERUP_INTERVAL = 10000; // Spawn power-up every 10 seconds
const SPEED_INCREASE_THRESHOLD = 1000; // Increase speed every 1000 points
const SPEED_INCREASE_AMOUNT = 0.5; // How much to increase speed by
const INTERVAL_DECREASE_AMOUNT = 100; // How much to decrease spawn interval by
const JUMP_FORCE_DECREASE = 0.3; // How much to decrease jump force by per level

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

interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
}

interface ScoreAnimation {
  id: number;
  x: number;
  y: number;
}

interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

export default function DinoGame(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState<boolean>(false);
  const [showCover, setShowCover] = useState<boolean>(true);
  const dinoImageDataRef = useRef<ImageData | null>(null);
  const rockImagesRef = useRef<HTMLImageElement[]>([]);
  const currentRockIndexRef = useRef<number>(0);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);

  function startGame() {
    setShowCover(false);
    setScore(0);
    setGameOver(false);
    setShowLeaderboard(false);
    setPlayerName('');
    setIsRunning(false); // Don't start running immediately
  }

  // Add space bar start handler
  useEffect(() => {
    function handleSpaceStart(e: KeyboardEvent) {
      if (e.code === "Space" && !showCover && !isRunning && !gameOver) {
        e.preventDefault(); // Prevent page scroll
        setIsRunning(true);
      }
    }

    window.addEventListener("keydown", handleSpaceStart);
    return () => window.removeEventListener("keydown", handleSpaceStart);
  }, [showCover, isRunning, gameOver]);

  function toggleLeaderboard() {
    setShowLeaderboard(!showLeaderboard);
  }

  function handleSubmitScore() {
    if (playerName.trim() === '') return;

    const newEntry: LeaderboardEntry = {
      name: playerName,
      score: score,
      date: new Date().toLocaleDateString()
    };

    const updatedLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setLeaderboard(updatedLeaderboard);
    localStorage.setItem('submarineLeaderboard', JSON.stringify(updatedLeaderboard));
    setShowLeaderboard(true);
    setGameOver(false);
  }

  // Load leaderboard from localStorage on component mount
  useEffect(() => {
    const savedLeaderboard = localStorage.getItem('submarineLeaderboard');
    if (savedLeaderboard) {
      setLeaderboard(JSON.parse(savedLeaderboard));
    }
  }, []);

  useEffect(() => {
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
    let lastPowerUpTime = Date.now();
    let localScore = 0;
    let localPowerUps: PowerUp[] = [];

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

      // Calculate current speed and interval based on score
      const speedLevel = Math.floor(localScore / SPEED_INCREASE_THRESHOLD);
      const currentSpeed = INITIAL_OBSTACLE_SPEED + (speedLevel * SPEED_INCREASE_AMOUNT);
      const currentInterval = Math.max(
        INITIAL_OBSTACLE_INTERVAL - (speedLevel * INTERVAL_DECREASE_AMOUNT),
        1000 // Minimum interval of 1 second
      );

      if (now - lastObstacleTime > currentInterval) {
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

      obstacles.forEach(obs => (obs.x -= currentSpeed));
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

    function updatePowerUps() {
      if (!canvas) return;
      const now = Date.now();
      
      // Calculate current speed based on score
      const speedLevel = Math.floor(localScore / SPEED_INCREASE_THRESHOLD);
      const currentSpeed = INITIAL_OBSTACLE_SPEED + (speedLevel * SPEED_INCREASE_AMOUNT);
      
      // Spawn new power-up
      if (now - lastPowerUpTime > POWERUP_INTERVAL) {
        const maxHeight = canvas.height - GROUND_HEIGHT - dino.height - 50;
        const minHeight = canvas.height - GROUND_HEIGHT - dino.height;
        const randomHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        localPowerUps.push({
          x: canvas.width,
          y: randomHeight,
          width: 30,
          height: 30,
          collected: false
        });
        lastPowerUpTime = now;
        setPowerUps([...localPowerUps]);
      }

      // Update power-up positions with current speed
      localPowerUps.forEach(powerUp => {
        if (!powerUp.collected) {
          powerUp.x -= currentSpeed;
        }
      });

      // Remove off-screen power-ups
      localPowerUps = localPowerUps.filter(powerUp => powerUp.x + powerUp.width > 0);
      setPowerUps([...localPowerUps]);
    }

    function drawPowerUps() {
      if (!ctx || !canvas) return;
      
      localPowerUps.forEach(powerUp => {
        if (!powerUp.collected) {
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.arc(
            powerUp.x + powerUp.width/2,
            powerUp.y + powerUp.height/2,
            powerUp.width/2,
            0,
            Math.PI * 2
          );
          ctx.fill();
          
          // Draw star icon
          ctx.fillStyle = '#fff';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⭐', powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2);
        }
      });
    }

    function drawScore() {
      if (!ctx) return;
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Score: ${localScore}`, 30, 30);
      
      // Draw current speed level
      const speedLevel = Math.floor(localScore / SPEED_INCREASE_THRESHOLD);
      ctx.font = "16px Arial";
      ctx.fillText(`Speed Level: ${speedLevel}`, 30, 60);
      ctx.restore();
    }

    function showPointPopup() {
      const popup = document.createElement('span');
      popup.className = 'point-popup';
      popup.innerText = '+100';
      
      // Get the canvas element
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Get canvas position
      const canvasRect = canvas.getBoundingClientRect();
      
      // Position the popup relative to the canvas, even further to the right of the score
      // Score is at x: 30, y: 30 on the canvas
      popup.style.left = `${canvasRect.left + 190}px`;  // Moved slightly more to the right
      popup.style.top = `${canvasRect.top + 30}px`;     // Same y as score
      
      document.body.appendChild(popup);

      setTimeout(() => {
        popup.remove();
      }, 1200);
    }

    function checkPowerUpCollision(): boolean {
      if (!canvas) return false;
      
      for (const powerUp of localPowerUps) {
        if (powerUp.collected) continue;

        const dinoBox = {
          left: dino.x + dino.collisionBox.x,
          right: dino.x + dino.collisionBox.x + dino.collisionBox.width,
          top: dino.y + dino.collisionBox.y,
          bottom: dino.y + dino.collisionBox.y + dino.collisionBox.height
        };

        const powerUpBox = {
          left: powerUp.x,
          right: powerUp.x + powerUp.width,
          top: powerUp.y,
          bottom: powerUp.y + powerUp.height
        };

        if (
          dinoBox.left < powerUpBox.right &&
          dinoBox.right > powerUpBox.left &&
          dinoBox.top < powerUpBox.bottom &&
          dinoBox.bottom > powerUpBox.top
        ) {
          powerUp.collected = true;
          setPowerUps([...localPowerUps]);

          // Add 100 points and show popup
          const newScore = localScore + 100;
          localScore = newScore;
          setScore(newScore);
          showPointPopup();

          return true;
        }
      }
      return false;
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
      drawDino();
      drawScore();
      
      if (isRunning) {
        updateDino();
        updateObstacles();
        drawObstacles();
        updatePowerUps();
        drawPowerUps();
        
        // Check for power-up collection
        checkPowerUpCollision();

        // Check for collision
        if (checkCollision()) {
          setIsRunning(false);
          setGameOver(true);
          setScore(localScore);
          return;
        }

        localScore++;
      }
      
      animationRef.current = requestAnimationFrame(loop);
    }

    function handleJump(e: KeyboardEvent) {
      if ((e.code === "Space" || e.key === "ArrowUp") && !dino.isJumping && isRunning) {
        // Calculate current jump force based on speed level
        const speedLevel = Math.floor(localScore / SPEED_INCREASE_THRESHOLD);
        const currentJumpForce = INITIAL_JUMP_FORCE + (speedLevel * JUMP_FORCE_DECREASE);
        
        dino.dy = currentJumpForce;
        dino.isJumping = true;
      }
    }

    window.addEventListener("keydown", handleJump);
    loop();

    return () => {
      window.removeEventListener("keydown", handleJump);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRunning, showCover]);

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
              Go to Game
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
      {!showCover && !showLeaderboard && (
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

            {/* Space Bar Instruction */}
            {!isRunning && !gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-white text-2xl font-medium">
                  Press <span className="bg-white/20 px-3 py-1 rounded-lg mx-2 font-bold">SPACE</span> to start
                </p>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                <div className="text-white text-4xl mb-8">Game Over! Final Score: {score}</div>
                <div className="flex flex-col gap-4">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="px-4 py-2 text-xl rounded-lg bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={20}
                  />
                  <div className="flex gap-4">
                    <button
                      onClick={handleSubmitScore}
                      className="px-8 py-4 text-2xl font-bold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg 
                               shadow-lg hover:from-red-700 hover:to-red-800 transform hover:scale-105 transition-all duration-300
                               active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                    >
                      Submit Score
                    </button>
                    <button
                      onClick={startGame}
                      className="px-8 py-4 text-2xl font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg 
                               shadow-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-300
                               active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    >
                      Play Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div 
          id="leaderboard-modal"
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                   bg-[#0a0f2c] text-white rounded-[15px] shadow-2xl p-5 z-[9999] 
                   w-[400px] max-h-[500px] overflow-y-auto custom-scrollbar
                   transition-all duration-300 ease-out animate-modal-appear"
          style={{
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-blue-500/20">
            <h2 className="text-xl font-bold tracking-wider">LEADERBOARD</h2>
            <button
              onClick={() => {
                setShowLeaderboard(false);
                startGame();
              }}
              className="text-gray-400 hover:text-white transition-colors duration-200"
              style={{ fontSize: '18px' }}
            >
              ✖
            </button>
          </div>

          {/* Table */}
          <div className="overflow-y-auto max-h-[400px]">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-blue-500/20">
                  <th className="pb-3 text-sm font-bold text-blue-400">RANK</th>
                  <th className="pb-3 text-sm font-bold text-blue-400">NAME</th>
                  <th className="pb-3 text-sm font-bold text-blue-400 text-right">SCORE</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr 
                    key={index}
                    className={`border-b border-blue-500/10 ${
                      entry.score === score ? 'bg-blue-500/10' : ''
                    }`}
                  >
                    <td className="py-3 text-sm text-gray-300">
                      {index === 0 ? (
                        <span className="text-yellow-400">🥇</span>
                      ) : index === 1 ? (
                        <span className="text-gray-300">🥈</span>
                      ) : index === 2 ? (
                        <span className="text-amber-600">🥉</span>
                      ) : (
                        <span className="text-gray-400">{index + 1}</span>
                      )}
                    </td>
                    <td className="py-3 text-sm text-white font-medium">{entry.name}</td>
                    <td className="py-3 text-sm text-white text-right font-medium">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {showLeaderboard && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => {
            setShowLeaderboard(false);
            startGame();
          }}
        />
      )}
    </div>
  );
} 