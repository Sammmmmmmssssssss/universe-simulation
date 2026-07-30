import { CosmicTimeline } from './timeline.js';

export const Civilizations = {
  list: [],
  add(planet, name) {
    const civ = {
      id: Date.now() + Math.random(),
      planetId: planet.id,
      name: name + " Empire",
      techLevel: 0,
      energy: 0,
      colonies: [planet.id],
      ships: [],
      aggressiveness: Math.random(),
      expansionism: Math.random(),
      color: `hsl(${Math.floor(Math.random()*360)}, 100%, 70%)`
    };
    this.list.push(civ);
    return civ;
  },
  update(ageDt, bodies, particles) {
    // Evolves tech level and spawns ships
    for(const civ of this.list) {
      civ.techLevel += ageDt * 0.05 * (1 + civ.expansionism);
      
      const homePlanet = bodies.find(b => b.id === civ.planetId);
      if(!homePlanet || !homePlanet.active) {
         // Home world destroyed
         continue; 
      }
      
      // Megastructure construction (Dyson Sphere logic)
      if (civ.techLevel > 100 && !civ.hasDysonSphere) {
         // Find nearest star
         let nearestStar = null, minDist = Infinity;
         for(const s of bodies) {
            if (s.isStar() && s.active) {
              const d = Math.hypot(s.x - homePlanet.x, s.y - homePlanet.y);
              if (d < minDist) { minDist = d; nearestStar = s; }
            }
         }
         if (nearestStar && minDist < 600) {
            civ.hasDysonSphere = true;
            nearestStar.name += " (Dyson Sphere)";
            nearestStar.luminosity *= 0.5; // Dimmed by sphere
            CosmicTimeline.addEvent('MEGASTRUCTURE', civ.name, `Constructed a Dyson Sphere around ${nearestStar.name} to harness its energy.`, 0, civ.color);
         }
      }
      
      // Launch colonization ship
      if (civ.techLevel > 150 && Math.random() < 0.005 * civ.expansionism) {
         CosmicTimeline.addEvent('EXPLORATION', civ.name, 'Launched an interstellar generation ship.', 0, civ.color);
         
         // In engine.js, we would need to push a ship object.
         // Since we can't easily import bodies/particles directly here if they are let bindings,
         // we'll pass a callback or dispatch an event that engine.js listens to.
         if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('civ-launch-ship', { detail: { civ, homePlanet } }));
         }
      }
    }
  }
};
