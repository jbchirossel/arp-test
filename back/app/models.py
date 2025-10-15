from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Machine(Base):
    __tablename__ = "machines"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    year = Column(Integer, nullable=False, server_default="2025")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    ensembles = relationship("Ensemble", back_populates="machine", cascade="all, delete-orphan")


class Ensemble(Base):
    __tablename__ = "ensembles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    year = Column(Integer, nullable=False, server_default="2025")
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    machine = relationship("Machine", back_populates="ensembles")
    tasks = relationship("Task", back_populates="ensemble", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # ETUDE, DEVELOPPEMENT, TEST, DEPLOIEMENT, MAINTENANCE
    start_week = Column(Integer, nullable=False)
    end_week = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False, server_default="2025")
    comments = Column(Text, nullable=True)
    ensemble_id = Column(Integer, ForeignKey("ensembles.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    ensemble = relationship("Ensemble", back_populates="tasks")
    checklist_items = relationship("TaskChecklistItem", back_populates="task", cascade="all, delete-orphan")
    assignments = relationship("UserAssignment", back_populates="task", cascade="all, delete-orphan")


class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    category = Column(String, nullable=False)  # ETUDE, DEVELOPPEMENT, TEST, DEPLOIEMENT, MAINTENANCE
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# Checklist items pour les tâches Gantt
class TaskChecklistItem(Base):
    __tablename__ = "task_checklist_items"
    
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    done = Column(Boolean, default=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    task = relationship("Task", back_populates="checklist_items")


# Assignments personnels pour les utilisateurs
class UserAssignment(Base):
    __tablename__ = "user_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    done = Column(Boolean, default=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    task = relationship("Task", back_populates="assignments")
    user = relationship("User")


# ANCIEN modèle Todo (on le garde pour compatibilité pendant la migration)
class Todo(Base):
    __tablename__ = "todos"
    
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    done = Column(Boolean, default=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    # task = relationship("Task", back_populates="todos")  # Désactivé car relation supprimée de Task
    user = relationship("User")


class CoutsSalariauxFile(Base):
    __tablename__ = "couts_salariaux_files"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    processed_data = Column(Text, nullable=False)  # JSON string des données traitées
    total_records = Column(Integer, default=0)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relations
    user = relationship("User") 


class FECAnalysis(Base):
    __tablename__ = "fec_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    results = Column(Text, nullable=False)  # JSON string des résultats d'analyse
    
    # Relations
    user = relationship("User")
    segments = relationship("FECSegment", back_populates="analysis", cascade="all, delete-orphan")


class FECSegment(Base):
    __tablename__ = "fec_segments"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("fec_analyses.id"), nullable=False)
    segment_type = Column(String, nullable=False)  # production, achats_consommes, charges_directes, etc.
    data = Column(Text, nullable=False)  # JSON string des données du segment
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    analysis = relationship("FECAnalysis", back_populates="segments") 