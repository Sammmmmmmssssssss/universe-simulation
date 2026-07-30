export const CosmicTimeline = {
  events: [],
  addEvent(type, sourceName, description, cosmicAge, color = '#ffffff') {
    const event = {
      id: Date.now() + Math.random(),
      type,
      source: sourceName,
      description,
      age: cosmicAge,
      color,
      realTime: new Date().toLocaleTimeString()
    };
    this.events.push(event);
    if (this.events.length > 500) this.events.shift(); // Keep history bounded
    
    // Dispatch to UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('timeline-event', { detail: event }));
    }
  },
  getHistory() {
    return this.events;
  },
  clear() {
    this.events = [];
  }
};
