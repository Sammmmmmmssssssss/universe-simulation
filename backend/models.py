from sqlalchemy import Column, String, Float, Integer, Boolean, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database", "universe.db")
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)
Base = declarative_base()
Session = sessionmaker(bind=engine)

class UniverseState(Base):
    __tablename__ = "universe_state"
    id = Column(Integer, primary_key=True, autoincrement=True)
    cosmic_age = Column(Float, default=0)
    speed_mult = Column(Float, default=1)
    paused = Column(Boolean, default=False)
    big_bang_done = Column(Boolean, default=False)

class UnlockedElements(Base):
    __tablename__ = "unlocked_elements"
    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(10), unique=True, nullable=False)
    unlocked_at_age = Column(Float, default=0)

class DiscoveryLog(Base):
    __tablename__ = "discovery_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    message = Column(Text)
    age = Column(Float, default=0)

def init_db():
    Base.metadata.create_all(engine)
    sess = Session()
    if sess.query(UniverseState).count() == 0:
        sess.add(UniverseState(cosmic_age=0, speed_mult=1, paused=False, big_bang_done=False))
        for sym in ["H","He","Li","Be","B"]:
            sess.add(UnlockedElements(symbol=sym, unlocked_at_age=0))
        sess.commit()
    sess.close()

init_db()
