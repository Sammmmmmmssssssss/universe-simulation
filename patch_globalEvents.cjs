const fs = require('fs');
let code = fs.readFileSync('src/engine.js', 'utf8');

const eventBlock = `globalEvents.on('onCollision', ({ entityA, entityB }) => {
    if (entityA.active && entityB.active) {
        const spd = Math.hypot(entityA.vx - entityB.vx, entityA.vy - entityB.vy);
        if (entityA instanceof Body || entityB instanceof Body || spd < 35) {
            doMerge(entityA, entityB);
        }
    }
});`;

code = code.replace(eventBlock, '');
code = code + "\n" + eventBlock + "\n";

fs.writeFileSync('src/engine.js', code);
