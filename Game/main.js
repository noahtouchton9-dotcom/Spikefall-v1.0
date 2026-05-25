let paused = false;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.font = '30px Press Start 2P';
ctx.fillStyle = 'blue';

const FPS = 60;
const FRAME_TIME = 1000 / FPS;

let lastFrameTime = 0;
let accumulator = 0;

const wall = {
    right: -4710,
    left: -450
};
const PLAYER_SPEED = 600;
const JUMP_DURATION = 0.6;
const JUMP_HEIGHT = 200;
const keys = {};

const player = {
    x: 452,
    y: 0,
    width: 96,
    height: 192,
    currentDirection: "forward",
    isJumping: false,
    jumpTime: 0,
    jumpStartY: 0,
    groundY: 384,
    hit: false
};

let background = {
    x: -800,
    y: 0
};

/*
===========================================
tile & image loading
==============================================
*/

const TILE_SIZE = 64;
let gameMap = [];
let mapLoaded = false;

let imagesLoaded = 0;
const TOTAL_IMAGES = 12; 

const playerSprites = {
    forward: new Image(),
    left: new Image(),
    right: new Image(),
    back: new Image(),
    walkingLeft: new Image(),
    walkingRight: new Image(),
};

const tileSprites = {
    0: new Image(), // grass
    1: new Image(), // wall
    2: new Image(), // dirt
    3: new Image(), // floorboard
    4: new Image(), // sky
    5: new Image()  // spike
};

function checkGameReady() {
    if (imagesLoaded >= TOTAL_IMAGES && mapLoaded) {
        lastFrameTime = performance.now();
        requestAnimationFrame(loop);
    }
}

function imageLoaded() {
    imagesLoaded++;
    checkGameReady();
}

let spikePos = [];
let tilePos = [];

function rectsOverlap(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function drawMap() {
    for (let row = 0; row < gameMap.length; row++) {
        if (!gameMap[row]) continue;
        for (let col = 0; col < gameMap[row].length; col++) {
            const tileType = gameMap[row][col];

            const tileX = background.x + col * TILE_SIZE;
            const tileY = background.y + row * TILE_SIZE;

            if (tileSprites[tileType]) {
                ctx.drawImage(
                    tileSprites[tileType],
                    Math.round(tileX),
                    Math.round(tileY),
                    TILE_SIZE,
                    TILE_SIZE
                );
            }
        }
    }
}

/*
===========================================
random shit
==============================================
*/

const pauseButton = document.getElementById("pauseButton");
const pauseMenu = document.getElementById("pauseMenu");
const resumeButton = document.getElementById("resumeButton");
const restartButton = document.getElementById("restartButton");

if (resumeButton) {
    resumeButton.addEventListener("click", () => {
        paused = false;
        pauseMenu.style.display = "none";
    });
}

if (pauseButton) {
    pauseButton.addEventListener("click", () => {
        if (paused) {
            paused = false;
            pauseMenu.style.display = "none";
        } else {
            paused = true;
            pauseMenu.style.display = "flex";
        }
    });
}

let gravity = 1200;
let isGrounded = false;

//hitbox
const playerHitbox = {
    x: player.x + 20,
    y: player.y + 20,
    width: player.width - 40,
    height: player.height - 20
};

function playerDie() {
    player.x = 452;
    player.y = 200;
    player.isJumping = false;
    player.jumpTime = 0;
    background.x = -800;
    background.y = 0;
}

const cheatIndicator = document.getElementById("cheatIndicator");

// dev cmds
const dev = {

    kill: function() {
        playerDie();
        console.log("Player killed");
    },

    noclip: function(status) {
        if (status === "on") {
            playerHitbox.width = 0;
            playerHitbox.height = 0;
            console.log("Noclip enabled");
        } else if (status === "off") {
            playerHitbox.width = player.width - 40;
            playerHitbox.height = player.height - 20;
            console.log("Noclip disabled");
        } else {
            console.log("usage: dev.noclip('on') or dev.noclip('off')");
        }
    },

    rawTp: function(x, y) {
        player.x = x;
        player.y = y;
        console.log(`Teleported to (${x}, ${y})`);
    },

    tp: function(x) {
        background.x = background.x + x;
        console.log(`Teleported by (${x})`);
    }

    
};

/*
===================================
preload sprites and thingies
=====================================
*/

playerSprites.forward.onload = imageLoaded; playerSprites.forward.onerror = imageLoaded;
playerSprites.left.onload = imageLoaded; playerSprites.left.onerror = imageLoaded;
playerSprites.right.onload = imageLoaded; playerSprites.right.onerror = imageLoaded;
playerSprites.back.onload = imageLoaded; playerSprites.back.onerror = imageLoaded;
playerSprites.walkingLeft.onload = imageLoaded; playerSprites.walkingLeft.onerror = imageLoaded;
playerSprites.walkingRight.onload = imageLoaded; playerSprites.walkingRight.onerror = imageLoaded;

tileSprites[0].onload = imageLoaded;
tileSprites[1].onload = imageLoaded;
tileSprites[2].onload = imageLoaded;
tileSprites[3].onload = imageLoaded;
tileSprites[4].onload = imageLoaded;
tileSprites[5].onload = imageLoaded;

playerSprites.forward.src = "img/player/playerForward.png";
playerSprites.left.src = "img/player/playerLeft.png";
playerSprites.right.src = "img/player/playerRight.png";
playerSprites.back.src = "img/player/playerBackward.png";
playerSprites.walkingLeft.src = "img/player/playerWalkLeft.png";
playerSprites.walkingRight.src = "img/player/playerWalkRight.gif";  

tileSprites[0].src = "img/tiles/grass.png";
tileSprites[1].src = "img/tiles/bricks.png";
tileSprites[2].src = "img/tiles/dirt.png";
tileSprites[3].src = "img/tiles/floorboard.png";
tileSprites[4].src = "img/tiles/sky.png";
tileSprites[5].src = "img/tiles/spike.png";

async function loadMapFile(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();

        const lines = text.trim().split("\n");

        gameMap = lines.map(line => {
            return line.trim().split(" ").map(Number);
        });

        mapLoaded = true;
        checkGameReady();
    } catch (error) {
        console.error("Error loading the map text file:", error);
        mapLoaded = true;
        checkGameReady();
    }

    console.log("level loaded");
}

loadMapFile("maps/level1.txt");

window.addEventListener("keydown", (e) => {
    if (e.key === "w" || e.key === " ") {
        if (isGrounded && !player.isJumping) {
            player.isJumping = true;
            player.jumpTime = 0;
            player.jumpStartY = player.y;
            isGrounded = false;
        }
    }
    keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

/*
=========================
gameloop functions
==========================
*/

function update(dt) {
    if (paused) return;

    spikePos.length = 0;
    tilePos.length = 0;
    for (let row = 0; row < gameMap.length; row++) {
        for (let col = 0; col < gameMap[row].length; col++) {
            const tileType = gameMap[row][col];
            const tX = background.x + col * TILE_SIZE;
            const tY = background.y + row * TILE_SIZE;

            if (tileType === 5) {
                spikePos.push({ x: tX, y: tY, width: TILE_SIZE, height: TILE_SIZE });
            } else if (tileType === 0 || tileType === 1 || tileType === 2 || tileType === 3) {
                tilePos.push({ x: tX, y: tY, width: TILE_SIZE, height: TILE_SIZE });
            }
        }
    }

    let oldBgX = background.x;

    if (keys["a"]) {
        player.currentDirection = "left";
        if (background.x < wall.left) {
            background.x += PLAYER_SPEED * dt;
            if (background.x > wall.left) background.x = wall.left;
        }
    }

    if (keys["d"]) {
        player.currentDirection = "right";
        if (background.x > wall.right) {
            background.x -= PLAYER_SPEED * dt;
            if (background.x < wall.right) background.x = wall.right;
        }
    }

    playerHitbox.x = player.x + 20;

    for (const tile of tilePos) {
        if (rectsOverlap(playerHitbox, tile)) {
            background.x = oldBgX;
            playerHitbox.x = player.x + 20;
            break;
        }
    }

    let oldY = player.y;

    if (player.isJumping) {
        player.jumpTime += dt;
        if (player.jumpTime >= JUMP_DURATION) {
            player.isJumping = false;
            player.jumpTime = 0;
        } else {
            const p = player.jumpTime / JUMP_DURATION;
            const offset = 4 * JUMP_HEIGHT * p * (1 - p);
            player.y = player.jumpStartY - offset;
        }
    } else {
        player.y += gravity * dt;
    }

    playerHitbox.y = player.y + 20;
    isGrounded = false;

    for (const tile of tilePos) {
        if (rectsOverlap(playerHitbox, tile)) {
            if (oldY + 20 + playerHitbox.height <= tile.y + 4) {
                player.y = tile.y - playerHitbox.height - 20;
                player.isJumping = false;
                player.jumpTime = 0;
                isGrounded = true;
            } else if (oldY + 20 >= tile.y + tile.height - 4) {
                player.y = tile.y + tile.height - 20;
                player.isJumping = false;
            }
            playerHitbox.y = player.y + 20;
        }
    }

    for (const spike of spikePos) {
        if (rectsOverlap(playerHitbox, spike)) {
            playerDie();
            break;
        }
    }

    if (background.x <= -4680) {
        loadMapFile("maps/level2.txt");
        playerDie();
        console.log("Level completed");
    }
}

function draw() {
    ctx.fillStyle = "rgba(14, 182, 233, 1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    drawMap();

    const activePlayerSprite = playerSprites[player.currentDirection];
    if (activePlayerSprite && activePlayerSprite.complete) {
        ctx.drawImage(
            activePlayerSprite,
            Math.round(player.x),
            Math.round(player.y),
            player.width,
            player.height
        );
    }
}

function loop(timestamp) {
    requestAnimationFrame(loop);

    let delta = timestamp - lastFrameTime;
    delta = Math.min(delta, 250);

    accumulator += delta;

    while (accumulator >= FRAME_TIME) {
        update(FRAME_TIME / 1000);
        accumulator -= FRAME_TIME;
    }

    draw();

    lastFrameTime = timestamp;
}