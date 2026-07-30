import Matter from 'matter-js';
import { globalEvents } from './events.js';

export class MatterPhysicsEngine {
    constructor(engineConfig = {}) {
        this.engine = Matter.Engine.create({
            gravity: { x: 0, y: 0, scale: 0 },
            ...engineConfig
        });
        
        this.engine.enableSleeping = false;

        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            pairs.forEach((pair) => {
                const entityA = pair.bodyA.plugin?.entity;
                const entityB = pair.bodyB.plugin?.entity;
                if (entityA && entityB) {
                    globalEvents.emit('onCollision', {
                        entityA,
                        entityB,
                        pair
                    });
                }
            });
        });
    }

    addEntity(entity) {
        if (entity.matterBody) return;
        const radius = entity.radius || 1;
        const mass = entity.mass || 1;
        
        const body = Matter.Bodies.circle(entity.x, entity.y, radius, {
            mass: mass,
            frictionAir: 0,
            friction: 0,
            restitution: 0.5,
            plugin: { entity }
        });
        
        Matter.Body.setVelocity(body, { x: entity.vx || 0, y: entity.vy || 0 });
        
        entity.matterBody = body;
        Matter.World.add(this.engine.world, body);
        globalEvents.emit('onBirth', { entity });
    }

    removeEntity(entity) {
        if (entity.matterBody) {
            Matter.World.remove(this.engine.world, entity.matterBody);
            entity.matterBody = null;
            globalEvents.emit('onDeath', { entity });
        }
    }

    applyGravity(G = 6.674e-5) {
        const bodies = Matter.Composite.allBodies(this.engine.world);
        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                const b1 = bodies[i];
                const b2 = bodies[j];
                const dx = b2.position.x - b1.position.x;
                const dy = b2.position.y - b1.position.y;
                const distSq = dx * dx + dy * dy;
                
                if (distSq < 100) continue; 
                
                const dist = Math.sqrt(distSq);
                const forceMag = (G * b1.mass * b2.mass) / distSq;
                
                const fx = forceMag * (dx / dist);
                const fy = forceMag * (dy / dist);
                
                Matter.Body.applyForce(b1, b1.position, { x: fx, y: fy });
                Matter.Body.applyForce(b2, b2.position, { x: -fx, y: -fy });
            }
        }
    }

    step(dt) {
        if (!dt || !Number.isFinite(dt)) return;
        this.applyGravity();
        
        Matter.Engine.update(this.engine, dt * 1000);

        const bodies = Matter.Composite.allBodies(this.engine.world);
        bodies.forEach(b => {
            if (b.plugin && b.plugin.entity) {
                const entity = b.plugin.entity;
                entity.x = b.position.x;
                entity.y = b.position.y;
                entity.vx = b.velocity.x;
                entity.vy = b.velocity.y;
            }
        });
    }
}
