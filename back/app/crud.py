from sqlalchemy.orm import Session
from . import models, schemas
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# User CRUD operations
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
        return True
    return False


# Authentication
def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)


def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


# Machine CRUD operations
def get_machine(db: Session, machine_id: int):
    return db.query(models.Machine).filter(models.Machine.id == machine_id).first()


def get_machines(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Machine).offset(skip).limit(limit).all()


def create_machine(db: Session, machine: schemas.MachineCreate):
    db_machine = models.Machine(**machine.dict())
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine


def delete_machine(db: Session, machine_id: int):
    db_machine = get_machine(db, machine_id)
    if db_machine:
        db.delete(db_machine)
        db.commit()
        return True
    return False


# Ensemble CRUD operations
def get_ensemble(db: Session, ensemble_id: int):
    return db.query(models.Ensemble).filter(models.Ensemble.id == ensemble_id).first()


def get_ensembles_by_machine(db: Session, machine_id: int):
    return db.query(models.Ensemble).filter(models.Ensemble.machine_id == machine_id).all()


def get_ensembles(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Ensemble).offset(skip).limit(limit).all()


def create_ensemble(db: Session, ensemble: schemas.EnsembleCreate):
    db_ensemble = models.Ensemble(**ensemble.dict())
    db.add(db_ensemble)
    db.commit()
    db.refresh(db_ensemble)
    return db_ensemble


def update_ensemble(db: Session, ensemble_id: int, update_data: dict):
    db_ensemble = get_ensemble(db, ensemble_id)
    if not db_ensemble:
        return None
    for field, value in update_data.items():
        setattr(db_ensemble, field, value)
    db.commit()
    db.refresh(db_ensemble)
    return db_ensemble


def delete_ensemble(db: Session, ensemble_id: int):
    db_ensemble = get_ensemble(db, ensemble_id)
    if db_ensemble:
        db.delete(db_ensemble)
        db.commit()
        return True
    return False


# Task CRUD operations
def get_task(db: Session, task_id: int):
    return db.query(models.Task).filter(models.Task.id == task_id).first()


def get_tasks(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Task).offset(skip).limit(limit).all()


def create_task(db: Session, task: schemas.TaskCreate):
    db_task = models.Task(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def delete_task(db: Session, task_id: int):
    db_task = get_task(db, task_id)
    if db_task:
        db.delete(db_task)
        db.commit()
        return True
    return False


# Contact CRUD operations
def get_contact(db: Session, contact_id: int):
    return db.query(models.Contact).filter(models.Contact.id == contact_id).first()


def get_contacts(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Contact).offset(skip).limit(limit).all()


def create_contact(db: Session, contact: schemas.ContactCreate):
    db_contact = models.Contact(**contact.dict())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact


def delete_contact(db: Session, contact_id: int):
    db_contact = get_contact(db, contact_id)
    if db_contact:
        db.delete(db_contact)
        db.commit()
        return True
    return False


# Todo CRUD operations
def get_todo(db: Session, todo_id: int):
    return db.query(models.Todo).filter(models.Todo.id == todo_id).first()


def get_todos_by_task(db: Session, task_id: int):
    return db.query(models.Todo).filter(models.Todo.task_id == task_id).all()


def get_todos_by_user(db: Session, user_id: int):
    """Récupère tous les todos assignés à un utilisateur spécifique avec les informations de la tâche associée"""
    todos = db.query(models.Todo).filter(models.Todo.user_id == user_id).all()
    
    # Pour chaque todo, récupérer les informations de la tâche associée
    for todo in todos:
        if todo.task_id:
            task = db.query(models.Task).filter(models.Task.id == todo.task_id).first()
            if task:
                # Ajouter les informations de la tâche à la todo
                todo.task_title = task.type
                todo.task_ensemble_id = task.ensemble_id
                # Récupérer aussi l'ensemble
                ensemble = db.query(models.Ensemble).filter(models.Ensemble.id == task.ensemble_id).first()
                if ensemble:
                    todo.ensemble_name = ensemble.name
                    # Récupérer aussi la machine
                    machine = db.query(models.Machine).filter(models.Machine.id == ensemble.machine_id).first()
                    if machine:
                        todo.machine_name = machine.name
    
    return todos


def get_todos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Todo).offset(skip).limit(limit).all()


def create_todo(db: Session, todo: schemas.TodoCreate):
    db_todo = models.Todo(**todo.dict())
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo


def update_todo(db: Session, todo_id: int, todo_update: dict):
    db_todo = get_todo(db, todo_id)
    if not db_todo:
        return None
    
    for field, value in todo_update.items():
        setattr(db_todo, field, value)
    
    db.commit()
    db.refresh(db_todo)
    return db_todo


# ============================================
# TaskChecklistItem CRUD operations (nouveau)
# ============================================

def get_checklist_items_by_task(db: Session, task_id: int):
    """Récupère tous les checklist items d'une tâche"""
    return db.query(models.TaskChecklistItem).filter(models.TaskChecklistItem.task_id == task_id).all()


def create_checklist_item(db: Session, item: schemas.TaskChecklistItemCreate):
    """Crée un nouvel item de checklist"""
    db_item = models.TaskChecklistItem(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def update_checklist_item(db: Session, item_id: int, item_update: schemas.TaskChecklistItemUpdate):
    """Met à jour un item de checklist"""
    db_item = db.query(models.TaskChecklistItem).filter(models.TaskChecklistItem.id == item_id).first()
    if not db_item:
        return None
    
    update_data = item_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item


def delete_checklist_item(db: Session, item_id: int):
    """Supprime un item de checklist"""
    db_item = db.query(models.TaskChecklistItem).filter(models.TaskChecklistItem.id == item_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
        return True
    return False


# ============================================
# UserAssignment CRUD operations (nouveau)
# ============================================

def get_assignments_by_user(db: Session, user_id: int):
    """Récupère tous les assignments d'un utilisateur"""
    return db.query(models.UserAssignment).filter(models.UserAssignment.user_id == user_id).all()


def create_assignment(db: Session, assignment: schemas.UserAssignmentCreate):
    """Crée un nouvel assignment"""
    db_assignment = models.UserAssignment(**assignment.dict())
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment


def update_assignment(db: Session, assignment_id: int, assignment_update: schemas.UserAssignmentUpdate):
    """Met à jour un assignment"""
    db_assignment = db.query(models.UserAssignment).filter(models.UserAssignment.id == assignment_id).first()
    if not db_assignment:
        return None
    
    update_data = assignment_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_assignment, field, value)
    
    db.commit()
    db.refresh(db_assignment)
    return db_assignment


def delete_assignment(db: Session, assignment_id: int):
    """Supprime un assignment"""
    db_assignment = db.query(models.UserAssignment).filter(models.UserAssignment.id == assignment_id).first()
    if db_assignment:
        db.delete(db_assignment)
        db.commit()
        return True
    return False


# ============================================
# Anciens CRUD Todo (compatibilité)
# ============================================

def delete_todo(db: Session, todo_id: int):
    db_todo = get_todo(db, todo_id)
    if db_todo:
        db.delete(db_todo)
        db.commit()
        return True
    return False


# Coûts Salariaux CRUD operations
def get_couts_salariaux_file(db: Session, file_id: int):
    return db.query(models.CoutsSalariauxFile).filter(models.CoutsSalariauxFile.id == file_id).first()


def get_couts_salariaux_files(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.CoutsSalariauxFile).order_by(models.CoutsSalariauxFile.uploaded_at.desc()).offset(skip).limit(limit).all()


def create_couts_salariaux_file(db: Session, file_data: schemas.CoutsSalariauxFileCreate, user_id: int = None):
    db_file = models.CoutsSalariauxFile(
        filename=file_data.filename,
        processed_data=file_data.processed_data,
        total_records=file_data.total_records,
        uploaded_by=user_id
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


def update_couts_salariaux_file(db: Session, file_id: int, file_update: schemas.CoutsSalariauxFileUpdate):
    db_file = get_couts_salariaux_file(db, file_id)
    if not db_file:
        return None
    
    update_data = file_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_file, field, value)
    
    db.commit()
    db.refresh(db_file)
    return db_file


def delete_couts_salariaux_file(db: Session, file_id: int):
    db_file = get_couts_salariaux_file(db, file_id)
    if db_file:
        db.delete(db_file)
        db.commit()
        return True
    return False 