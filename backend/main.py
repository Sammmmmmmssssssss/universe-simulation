import asyncio
import json
import math
import os
import random
import sys
import time
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

from config import *
from elements import elem_color
from models import *
from physics import Particle, Body, physics_step
from physics import UNLOCKED_ELEMENTS_GLOBAL, MILESTONES_GLOBAL
from life import advance_bio, DISCOVERED_MOLECULES

_executor = ThreadPoolExecutor(max_workers=1)

_persist_counter = 0
_broadcast_counter = 0

def _persist_sync(final=False):
    sess=Session()
    try:
        u=sess.query(UniverseState).first()
        if u:
            u.cosmic_age=cosmic_age; u.speed_mult=speed_mult; u.paused=paused; u.big_bang_done=big_bang_done
        for e in events_buffer:
            sess.add(DiscoveryLog(message=str(e), age=cosmic_age))
        sess.commit()
        if final: events_buffer.clear()
    except: sess.rollback()
    finally: sess.close()
    if not final: events_buffer.clear()

async def persist_state():
    global _persist_counter
    _persist_counter += 1
    if _persist_counter < 30: return
    _persist_counter = 0
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(_executor, _persist_sync, False)

def _final_persist():
    _persist_sync(final=True)

@asynccontextmanager
async def lifespan(app):
    await startup()
    yield
    _final_persist()

app = FastAPI(lifespan=lifespan)

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
INDEX_HTML = os.path.join(FRONTEND_DIR, "index.html")

@app.get("/")
async def get_index():
    return FileResponse(INDEX_HTML) if os.path.isfile(INDEX_HTML) else {"error": "frontend not found"} 

if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="frontend")

particles = []
bodies = []
cosmic_age = 0.0
paused = False
speed_mult = 1
big_bang_done = False
supernova_flashes = []
connected_clients = set()
name_idx = 0
events_buffer = []

def add_event(msg):
    events_buffer.append(msg)

async def send_initial_state(ws):
    msg = build_state_msg()
    await ws.send_text(json.dumps(msg, default=str))

# ── WebSocket ──
@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    connected_clients.add(ws)
    await send_initial_state(ws)
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            await handle_message(ws, msg)
    except WebSocketDisconnect:
        connected_clients.discard(ws)

async def handle_message(ws, msg):
    global big_bang_done, paused, speed_mult, cosmic_age
    t = msg.get("type")
    if t == "big_bang":
        if big_bang_done: return
        big_bang_done = True
        wx, wy = msg.get("x", 0), msg.get("y", 0)
        supernova_flashes.append({"x":wx,"y":wy,"r":60,"t":0,"mt":100})
        bbn = ["H","H","H","H","H","He","He","He","Li","Be"]
        n_particles = 120
        for _ in range(n_particles):
            a=random.random()*math.pi*2; sp=0.01+random.random()*0.3
            r=random.random()*10
            el=random.choice(bbn)
            particles.append(Particle(wx+math.cos(a)*r,wy+math.sin(a)*r,el,math.cos(a)*sp,math.sin(a)*sp))
        add_event("🌌 The Big Bang! BBN Elements unlocked!")
        sess=Session()
        s=sess.query(UniverseState).first()
        if s: s.big_bang_done=True; sess.commit()
        sess.close()
        await broadcast_state()
    elif t == "spawn":
        if not big_bang_done: return
        if len(particles)+len(bodies)>=MAX_PARTICLES: return
        wx, wy, el = msg["x"], msg["y"], msg["elem"]
        vx, vy = msg.get("vx",0), msg.get("vy",0)
        if el not in UNLOCKED_ELEMENTS_GLOBAL: return
        particles.append(Particle(wx,wy,el,vx,vy))
    elif t == "spawn_nebula":
        if not big_bang_done: return
        wx, wy = msg["x"], msg["y"]
        el = msg["elem"]
        if el not in UNLOCKED_ELEMENTS_GLOBAL: return
        bs=msg.get("size",60); spin=msg.get("spin",0.5); cnt=msg.get("count",30)
        tot=len(particles)+len(bodies)
        can=min(cnt, MAX_PARTICLES-tot)
        for i in range(can):
            a=random.random()*math.pi*2; r=random.random()*bs
            px=wx+math.cos(a)*r; py=wy+math.sin(a)*r
            tx=-math.sin(a)*spin*r*0.02; ty=math.cos(a)*spin*r*0.02
            particles.append(Particle(px,py,el,tx+(random.random()-0.5)*0.3,ty+(random.random()-0.5)*0.3))
    elif t == "set_speed":
        speed_mult = msg.get("mult",1)
    elif t == "toggle_pause":
        paused = not paused
    elif t == "delete":
        wx, wy = msg["x"], msg["y"]
        nd=30; nb=None
        for b in bodies:
            if not b.active: continue
            d=math.hypot(b.x-wx,b.y-wy)
            if d<nd: nd=d; nb=b
        for p in particles:
            if not p.active: continue
            d=math.hypot(p.x-wx,p.y-wy)
            if d<nd: nd=d; nb=p
        if nb: nb.active=False
    elif t == "request_detail":
        bid=msg.get("id","")
        for b in bodies:
            if b.id==bid and b.active:
                await ws.send_text(json.dumps({"type":"detail","body":body_to_detail(b)}))
                break
    elif t == "enter_biosphere":
        bid=msg.get("id","")
        for b in bodies:
            if b.id==bid and b.active and b.is_planet():
                await ws.send_text(json.dumps({"type":"biosphere_state","body":body_to_biosphere(b)}))
                break

def body_to_detail(b):
    top=sorted(b.composition.items(), key=lambda x:-x[1])[:5]
    return {
        "id":b.id,"name":b.name,"type":b.type,"mass":b.mass,"temp":round(b.temp),
        "composition":{k:round(v,4) for k,v in top},
        "molecules":list(b.molecules.keys()),
        "habitability":round(b.habitability,1),
        "life_detected":b.life_detected,
        "bio_stage":b.bio_stage,
        "is_planet":b.is_planet(),
        "is_star":b.is_star(),
    }

def body_to_biosphere(b):
    bio=b.biochemistry
    return {
        "id":b.id,"name":b.name,"temp":round(b.temp),
        "habitability":round(b.habitability,1),
        "life_detected":b.life_detected,
        "bio_stage":b.bio_stage,
        "biochemistry":bio,
        "bio_events":b.bio_events[-10:] if b.bio_events else [],
        "molecules":list(b.molecules.keys()),
        "composition":{k:round(v,3) for k,v in sorted(b.composition.items(),key=lambda x:-x[1])[:8]},
    }

# ── Simulation Loop ──
async def simulation_loop():
    global cosmic_age, speed_mult, paused
    while True:
        if big_bang_done and not paused:
            total = min(DT_BASE * speed_mult, 2.0)
            steps = max(1, int(total / MAX_DT_CAP))
            step_dt = total / steps
            age_dt = total * YEAR_SCALE
            for _ in range(steps):
                physics_step(particles, bodies, step_dt, age_dt / steps, total / steps, events_buffer)
            cosmic_age += age_dt
            for b in bodies:
                if b.active and b.is_planet() and b.life_detected:
                    advance_bio(b, events_buffer, UNLOCKED_ELEMENTS_GLOBAL)
            if len(connected_clients) > 0:
                await broadcast_state()
            await persist_state()
        await asyncio.sleep(0.016)

def build_state_msg():
    pdata=[]
    for p in particles:
        if not p.active: continue
        pdata.append({"id":p.id,"x":round(p.x,1),"y":round(p.y,1),"elem":p.elem,"mass":round(p.mass,0),"color":elem_color(p.elem)})
    bdata=[]
    for b in bodies:
        if not b.active: continue
        bdata.append({"id":b.id,"x":round(b.x,1),"y":round(b.y,1),"name":b.name,"type":b.type,"mass":round(b.mass,2),"temp":round(b.temp),"radius":round(b.radius,1),"luminosity":round(b.luminosity,4),"life":b.life_detected,"is_star":b.is_star(),"is_planet":b.is_planet()})
    flashes=[f for f in supernova_flashes if f["t"]<f["mt"]]
    evts = list(events_buffer)
    return {
        "type":"state",
        "cosmic_age":cosmic_age,
        "paused":paused,
        "speed_mult":speed_mult,
        "particles":pdata,
        "bodies":bdata,
        "supernova_flashes":flashes,
        "unlocked":list(UNLOCKED_ELEMENTS_GLOBAL),
        "discovered_molecules":list(DISCOVERED_MOLECULES),
        "milestones":dict(MILESTONES_GLOBAL),
        "star_count":len([b for b in bodies if b.active and b.is_star()]),
        "planet_count":len([b for b in bodies if b.active and b.is_planet()]),
        "particle_count":len([p for p in particles if p.active]),
        "body_count":len([b for b in bodies if b.active]),
        "events":evts,
    }

async def broadcast_state():
    global connected_clients, _broadcast_counter
    _broadcast_counter += 1
    if _broadcast_counter % 3 != 0: return
    clients = connected_clients.copy()
    if not clients: return
    msg = build_state_msg()
    msg_json = json.dumps(msg, default=str)
    dead = set()
    for ws in clients:
        try:
            await ws.send_text(msg_json)
        except:
            dead.add(ws)
    if dead:
        connected_clients -= dead

# ── Startup ──
async def startup():
    global big_bang_done, cosmic_age, speed_mult, paused
    sess=Session()
    u=sess.query(UniverseState).first()
    if u:
        big_bang_done=u.big_bang_done; cosmic_age=u.cosmic_age
        speed_mult=u.speed_mult; paused=u.paused
    for el in sess.query(UnlockedElements).all():
        UNLOCKED_ELEMENTS_GLOBAL.add(el.symbol)
    sess.close()
    asyncio.create_task(simulation_loop())

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
