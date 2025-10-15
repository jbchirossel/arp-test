from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ... import crud, schemas, auth, models
from ...database import get_db
from ...config import settings
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter()


# Gantt data endpoint
@router.get("/data", response_model=schemas.GanttData)
async def get_gantt_data(
    year: Optional[int] = Query(None),
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupère toutes les données du Gantt pour une année donnée"""
    # Filtrer machines, ensembles et tâches par année
    if year:
        machines = db.query(models.Machine).filter(models.Machine.year == year).all()
        ensembles = db.query(models.Ensemble).filter(models.Ensemble.year == year).all()
        tasks = db.query(models.Task).filter(models.Task.year == year).all()
    else:
        machines = crud.get_machines(db)
        ensembles = crud.get_ensembles(db)
        tasks = crud.get_tasks(db)
    
    contacts = crud.get_contacts(db)
    
    # Mapper les tâches avec les bons noms de propriétés
    mapped_tasks = []
    for task in tasks:
        mapped_task = {
            "id": task.id,
            "type": task.type,
            "start_week": task.start_week,
            "end_week": task.end_week,
            "year": task.year,
            "comments": task.comments,
            "ensemble_id": task.ensemble_id,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
        }
        mapped_tasks.append(mapped_task)
    
    return schemas.GanttData(
        machines=machines,
        ensembles=ensembles,
        tasks=mapped_tasks,
        contacts=contacts
    )


# Machine endpoints
@router.post("/machines", response_model=schemas.Machine)
async def create_machine(
    machine: schemas.MachineCreate,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Crée une nouvelle machine"""
    # Vérifier si la machine existe déjà
    existing_machine = db.query(crud.models.Machine).filter(
        crud.models.Machine.name == machine.name
    ).first()
    if existing_machine:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une machine avec ce nom existe déjà"
        )
    
    return crud.create_machine(db=db, machine=machine)


@router.delete("/machines/{machine_id}")
async def delete_machine(
    machine_id: int,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Supprime une machine"""
    success = crud.delete_machine(db=db, machine_id=machine_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine non trouvée"
        )
    return {"message": "Machine supprimée avec succès"}


# Ensemble endpoints
@router.post("/ensembles", response_model=schemas.Ensemble)
async def create_ensemble(
    ensemble: schemas.EnsembleCreate,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Crée un nouvel ensemble"""
    # Vérifier si l'ensemble existe déjà pour cette machine
    existing_ensemble = db.query(crud.models.Ensemble).filter(
        crud.models.Ensemble.name == ensemble.name,
        crud.models.Ensemble.machine_id == ensemble.machine_id
    ).first()
    
    if existing_ensemble:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un ensemble avec ce nom existe déjà sur cette machine"
        )
    
    return crud.create_ensemble(db=db, ensemble=ensemble)


@router.get("/ensembles/{machine_id}", response_model=List[schemas.Ensemble])
async def get_ensembles_by_machine(
    machine_id: int,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupère tous les ensembles d'une machine"""
    return crud.get_ensembles_by_machine(db=db, machine_id=machine_id)


@router.put("/ensembles/{ensemble_id}", response_model=schemas.Ensemble)
async def update_ensemble(
    ensemble_id: int,
    update_data: dict,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Met à jour un ensemble (ex: ses commentaires)"""
    updated = crud.update_ensemble(db=db, ensemble_id=ensemble_id, update_data=update_data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ensemble non trouvé"
        )
    return updated


@router.delete("/ensembles/{ensemble_id}")
async def delete_ensemble(
    ensemble_id: int,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Supprime un ensemble"""
    success = crud.delete_ensemble(db=db, ensemble_id=ensemble_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ensemble non trouvé"
        )
    return {"message": "Ensemble supprimé avec succès"}


# Task endpoints
@router.post("/tasks", response_model=schemas.Task)
async def create_task(
    task: schemas.TaskCreate,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Crée une nouvelle tâche"""
    # Validation des semaines
    if task.start_week < 1 or task.start_week > 52:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Semaine de début invalide (doit être entre 1 et 52)"
        )
    if task.end_week < 1 or task.end_week > 52:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Semaine de fin invalide (doit être entre 1 et 52)"
        )
    if task.end_week < task.start_week:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La semaine de fin doit être après la semaine de début"
        )
    
    return crud.create_task(db=db, task=task)


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: int,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Supprime une tâche"""
    success = crud.delete_task(db=db, task_id=task_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tâche non trouvée"
        )
    return {"message": "Tâche supprimée avec succès"}


# Contact endpoints
@router.get("/contacts", response_model=List[schemas.Contact])
async def get_contacts(
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupère tous les contacts"""
    return crud.get_contacts(db=db)


@router.post("/contacts", response_model=schemas.Contact)
async def create_contact(
    contact: schemas.ContactCreate,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Crée un nouveau contact"""
    return crud.create_contact(db=db, contact=contact)


@router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: int,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Supprime un contact"""
    success = crud.delete_contact(db=db, contact_id=contact_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact non trouvé"
        )
    return {"message": "Contact supprimé avec succès"}


# ============================================
# NOUVEAUX Endpoints pour ChecklistItems
# ============================================

@router.get("/task/{task_id}/checklist", response_model=List[schemas.TaskChecklistItem])
async def get_task_checklist(
    task_id: int,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupère tous les checklist items d'une tâche"""
    return crud.get_checklist_items_by_task(db=db, task_id=task_id)


@router.post("/checklist", response_model=schemas.TaskChecklistItem)
async def create_checklist_item(
    item: schemas.TaskChecklistItemCreate,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Crée un nouvel item de checklist"""
    return crud.create_checklist_item(db=db, item=item)


@router.put("/checklist/{item_id}", response_model=schemas.TaskChecklistItem)
async def update_checklist_item(
    item_id: int,
    item_update: schemas.TaskChecklistItemUpdate,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Met à jour un item de checklist"""
    updated_item = crud.update_checklist_item(db=db, item_id=item_id, item_update=item_update)
    if not updated_item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    return updated_item


@router.delete("/checklist/{item_id}")
async def delete_checklist_item(
    item_id: int,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Supprime un item de checklist"""
    success = crud.delete_checklist_item(db=db, item_id=item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    return {"message": "Checklist item deleted successfully"}


# ============================================
# NOUVEAUX Endpoints pour Assignments
# ============================================

@router.get("/my-assignments", response_model=List[schemas.UserAssignment])
async def get_my_assignments(
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupère tous les assignments de l'utilisateur connecté"""
    return crud.get_assignments_by_user(db=db, user_id=current_user.id)


@router.post("/assignments", response_model=schemas.UserAssignment)
async def create_assignment(
    assignment: schemas.UserAssignmentCreate,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Crée un nouvel assignment"""
    return crud.create_assignment(db=db, assignment=assignment)


@router.put("/assignments/{assignment_id}", response_model=schemas.UserAssignment)
async def update_assignment(
    assignment_id: int,
    assignment_update: schemas.UserAssignmentUpdate,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Met à jour un assignment"""
    updated_assignment = crud.update_assignment(db=db, assignment_id=assignment_id, assignment_update=assignment_update)
    if not updated_assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return updated_assignment


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(
    assignment_id: int,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Supprime un assignment"""
    success = crud.delete_assignment(db=db, assignment_id=assignment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": "Assignment deleted successfully"}


# ============================================
# ANCIENS Todo endpoints (compatibilité)
# ============================================

@router.get("/task/{task_id}/todos", response_model=List[schemas.Todo])
async def get_todos_by_task(
    task_id: int,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupère tous les todos d'une tâche (ancien endpoint - utilise checklist maintenant)"""
    # Rediriger vers checklist items
    return crud.get_checklist_items_by_task(db=db, task_id=task_id)


@router.get("/todos/assigned", response_model=List[schemas.Todo])
async def get_assigned_todos(
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupère uniquement les todos assignées à l'utilisateur connecté"""
    return crud.get_todos_by_user(db=db, user_id=current_user.id)


@router.post("/todos", response_model=schemas.Todo)
async def create_todo(
    todo: schemas.TodoCreate,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Crée un nouveau todo"""
    return crud.create_todo(db=db, todo=todo)


@router.put("/todos/{todo_id}", response_model=schemas.Todo)
async def update_todo(
    todo_id: int,
    todo_update: dict,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Met à jour un todo"""
    updated_todo = crud.update_todo(db=db, todo_id=todo_id, todo_update=todo_update)
    if not updated_todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo non trouvé"
        )
    return updated_todo


@router.delete("/todos/{todo_id}")
async def delete_todo(
    todo_id: int,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Supprime un todo"""
    success = crud.delete_todo(db=db, todo_id=todo_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo non trouvé"
        )
    return {"message": "Todo supprimé avec succès"}


# Email endpoint
@router.post("/send-mail")
async def send_email(
    email_request: schemas.EmailRequest,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Envoie un email (simulation)"""
    # Ici vous pouvez implémenter l'envoi d'email réel
    # Pour l'instant, on simule juste l'envoi
    return {"message": "Email envoyé avec succès"}


# Todo assignment endpoint (NOUVEAU système)
@router.post("/assign-todo")
async def assign_todo(
    assignment: schemas.TodoAssignment,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Assigne une tâche à un utilisateur (crée un UserAssignment)"""
    # Créer un assignment pour l'utilisateur
    new_assignment = crud.models.UserAssignment(
        title=assignment.title,
        description=assignment.body,
        done=False,
        task_id=int(assignment.task_id),
        user_id=assignment.user_id
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    
    return {"message": "Assignment créé avec succès", "assignment_id": new_assignment.id}


# Users contacts endpoint
@router.get("/auth/users/contacts", response_model=List[schemas.User])
async def get_users_contacts(
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupère tous les utilisateurs pour les suggestions de contacts"""
    return crud.get_users(db=db) 