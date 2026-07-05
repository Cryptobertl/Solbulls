import * as THREE from "three";

/**
 * All textures are generated from tiny offscreen canvases with
 * NearestFilter so the 3D world keeps the pixel-art brand. Everything is
 * behind build functions so a WebGL context restore can regenerate them.
 */

function canvasTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeat?: [number, number],
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

/** scrolling 3-lane road */
export function roadTexture(): THREE.CanvasTexture {
  return canvasTexture(
    64,
    (ctx) => {
      ctx.fillStyle = "#101018";
      ctx.fillRect(0, 0, 64, 64);
      // lane dividers
      ctx.fillStyle = "#23233a";
      for (const x of [21, 42]) for (let y = 0; y < 64; y += 16) ctx.fillRect(x, y, 2, 9);
      // edges
      ctx.fillStyle = "#2e2e44";
      ctx.fillRect(0, 0, 3, 64);
      ctx.fillRect(61, 0, 3, 64);
    },
    [1, 8],
  );
}

export function trainTexture(bodyHex: string, windowHex: string): THREE.CanvasTexture {
  return canvasTexture(
    64,
    (ctx) => {
      ctx.fillStyle = bodyHex;
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = "#0a0a0e";
      ctx.fillRect(0, 44, 64, 6);
      ctx.fillStyle = windowHex;
      for (let x = 6; x < 64; x += 16) ctx.fillRect(x, 14, 9, 12);
    },
    [4, 1],
  );
}

export function barrierTexture(): THREE.CanvasTexture {
  return canvasTexture(64, (ctx) => {
    ctx.fillStyle = "#d0342c";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#f4f4fb";
    for (let x = -64; x < 64; x += 24) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate(-0.5);
      ctx.fillRect(0, -20, 10, 110);
      ctx.restore();
    }
  });
}

export function buildingTexture(bodyHex: string, w1: string, w2: string): THREE.CanvasTexture {
  return canvasTexture(
    32,
    (ctx) => {
      ctx.fillStyle = bodyHex;
      ctx.fillRect(0, 0, 32, 32);
      for (let y = 3; y < 30; y += 6)
        for (let x = 3; x < 30; x += 6) {
          if (((x * 7 + y * 13) % 11) < 5) continue;
          ctx.fillStyle = (x + y) % 12 < 6 ? w1 : w2;
          ctx.fillRect(x, y, 3, 4);
        }
    },
    [1, 2],
  );
}

export function blobShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  g.addColorStop(0, "rgba(0,0,0,0.45)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export function coinTexture(): THREE.CanvasTexture {
  return canvasTexture(32, (ctx) => {
    ctx.fillStyle = "#f5c542";
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = "#c99b2e";
    ctx.fillRect(4, 4, 24, 24);
    ctx.fillStyle = "#f5c542";
    ctx.fillRect(7, 7, 18, 18);
    // bull glyph
    ctx.fillStyle = "#a37d20";
    ctx.fillRect(10, 13, 12, 8);
    ctx.fillRect(8, 10, 4, 5);
    ctx.fillRect(20, 10, 4, 5);
    ctx.fillRect(12, 21, 8, 3);
  });
}

export function powerupTexture(kind: "magnet" | "mult" | "shield"): THREE.CanvasTexture {
  return canvasTexture(32, (ctx) => {
    ctx.fillStyle = "#0d0d13";
    ctx.fillRect(0, 0, 32, 32);
    if (kind === "magnet") {
      ctx.fillStyle = "#ff6ec7";
      ctx.fillRect(8, 8, 6, 16);
      ctx.fillRect(18, 8, 6, 16);
      ctx.fillRect(8, 20, 16, 4);
      ctx.fillStyle = "#f4f4fb";
      ctx.fillRect(8, 8, 6, 4);
      ctx.fillRect(18, 8, 6, 4);
    } else if (kind === "mult") {
      ctx.fillStyle = "#4dffb8";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("2x", 16, 17);
    } else {
      ctx.fillStyle = "#3ec6ff";
      ctx.fillRect(8, 6, 16, 14);
      ctx.beginPath();
      ctx.moveTo(8, 20);
      ctx.lineTo(16, 27);
      ctx.lineTo(24, 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#0d0d13";
      ctx.fillRect(14, 10, 4, 8);
    }
  });
}

export function starsTexture(): THREE.CanvasTexture {
  return canvasTexture(
    128,
    (ctx) => {
      ctx.clearRect(0, 0, 128, 128);
      let a = 12345;
      const rnd = () => {
        a = (a * 1103515245 + 12345) & 0x7fffffff;
        return a / 0x7fffffff;
      };
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = rnd() < 0.7 ? "#f4f4fb" : "#ffd23e";
        ctx.globalAlpha = 0.3 + rnd() * 0.7;
        ctx.fillRect(Math.floor(rnd() * 128), Math.floor(rnd() * 128), 1, 1);
      }
      ctx.globalAlpha = 1;
    },
    [4, 2],
  );
}
