import * as THREE from "three";

/** screen shake + floating text popups (near-miss, powerups) */

export class Shake {
  private amp = 0;
  trigger(a = 0.25) {
    this.amp = Math.max(this.amp, a);
  }
  /** returns offset to add to the camera */
  update(dt: number, out: THREE.Vector3): THREE.Vector3 {
    if (this.amp < 0.002) {
      out.set(0, 0, 0);
      return out;
    }
    out.set(
      (Math.random() - 0.5) * this.amp,
      (Math.random() - 0.5) * this.amp,
      0,
    );
    this.amp *= Math.exp(-dt * 5.8); // ~120ms half-life
    return out;
  }
}

interface Popup {
  sprite: THREE.Sprite;
  life: number;
}

export class Popups {
  root = new THREE.Group();
  private items: Popup[] = [];

  spawn(text: string, color: string, at: THREE.Vector3) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 48;
    const ctx = c.getContext("2d")!;
    ctx.font = "bold 30px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#050506";
    ctx.fillText(text, 66, 26);
    ctx.fillStyle = color;
    ctx.fillText(text, 64, 24);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
    );
    sprite.scale.set(1.6, 0.6, 1);
    sprite.position.copy(at);
    this.root.add(sprite);
    this.items.push({ sprite, life: 1 });
  }

  update(dt: number) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt * 1.2;
      p.sprite.position.y += dt * 1.1;
      (p.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, p.life);
      if (p.life <= 0) {
        this.root.remove(p.sprite);
        (p.sprite.material as THREE.SpriteMaterial).map?.dispose();
        p.sprite.material.dispose();
        this.items.splice(i, 1);
      }
    }
  }
}
