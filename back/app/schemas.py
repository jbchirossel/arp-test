from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None


class User(UserBase):
    id: int
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# Gantt schemas
class MachineBase(BaseModel):
    name: str
    year: int = 2025


class MachineCreate(MachineBase):
    pass


class Machine(MachineBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class EnsembleBase(BaseModel):
    name: str
    machine_id: int
    year: int = 2025
    comments: Optional[str] = None


class EnsembleCreate(EnsembleBase):
    pass


class Ensemble(EnsembleBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TaskBase(BaseModel):
    type: str
    start_week: int
    end_week: int
    year: int = 2025
    comments: Optional[str] = None
    ensemble_id: int


class TaskCreate(TaskBase):
    pass


class Task(TaskBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ContactBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    category: str


class ContactCreate(ContactBase):
    pass


class Contact(ContactBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TodoBase(BaseModel):
    text: str
    done: bool = False
    task_id: int
    user_id: Optional[int] = None


class TodoCreate(TodoBase):
    pass


class Todo(TodoBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    task_title: Optional[str] = None
    task_ensemble_id: Optional[int] = None
    ensemble_name: Optional[str] = None
    machine_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# TaskChecklistItem schemas (nouveau modèle)
class TaskChecklistItemBase(BaseModel):
    text: str
    done: bool = False
    task_id: int


class TaskChecklistItemCreate(TaskChecklistItemBase):
    pass


class TaskChecklistItemUpdate(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None


class TaskChecklistItem(TaskChecklistItemBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# UserAssignment schemas (nouveau modèle)
class UserAssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    done: bool = False
    task_id: int
    user_id: int


class UserAssignmentCreate(UserAssignmentBase):
    pass


class UserAssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    done: Optional[bool] = None


class UserAssignment(UserAssignmentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Gantt data schemas
class GanttData(BaseModel):
    machines: List[Machine]
    ensembles: List[Ensemble]
    tasks: List[Task]
    contacts: List[Contact]


# Email schemas
class EmailRequest(BaseModel):
    to: List[str]
    subject: str
    body: str


# Todo assignment schemas (ancien - garder pour compatibilité)
class TodoAssignment(BaseModel):
    user_id: int
    title: str
    body: str
    task_id: str


# Coûts Salariaux schemas
class CoutsSalariauxFileBase(BaseModel):
    filename: str
    total_records: int = 0


class CoutsSalariauxFileCreate(CoutsSalariauxFileBase):
    processed_data: str


class CoutsSalariauxFileUpdate(BaseModel):
    processed_data: Optional[str] = None
    total_records: Optional[int] = None


class CoutsSalariauxFile(CoutsSalariauxFileBase):
    id: int
    uploaded_at: datetime
    updated_at: Optional[datetime] = None
    uploaded_by: Optional[int] = None
    
    class Config:
        from_attributes = True


class CoutsSalariauxFileResponse(BaseModel):
    success: bool
    data: Optional[List[dict]] = None
    file_info: Optional[dict] = None
    files: Optional[List[dict]] = None
    message: Optional[str] = None
    appended: Optional[bool] = None


class CoutsSalariauxUploadResponse(BaseModel):
    success: bool
    file_id: Optional[int] = None
    appended: Optional[bool] = None
    total_records: Optional[int] = None 


# FEC Analysis schemas
class FECCharge(BaseModel):
    CompteLib: str
    CompteNum: str
    montant: float
    mois_annee: str


class FECSegment(BaseModel):
    titre: str
    mois_annee: str
    total: float
    matieres_premieres: Optional[float] = None
    sous_traitance: Optional[float] = None


class CoutsSalariaux(BaseModel):
    mois_annee: str
    personnel_production: float
    charges_patronales_p: float
    personnel_adm: float
    charges_patronales_hp: float
    total_production: float
    total_adm: float
    supplements_p: float | None = None
    supplements_hp: float | None = None


class FECResults(BaseModel):
    production: FECSegment
    achats_consommes: FECSegment
    charges_directes: List[FECCharge]
    charges_indirectes: List[FECCharge]
    impots_et_taxes: List[FECCharge]
    personnel_adm_hors_pro: List[FECCharge]
    couts_salariaux: CoutsSalariaux
    tresorerie: Optional[FECSegment] = None


class FECAnalysisBase(BaseModel):
    filename: str
    results: FECResults


class FECAnalysisCreate(FECAnalysisBase):
    pass


class FECAnalysis(FECAnalysisBase):
    id: int
    upload_date: datetime
    user_id: int
    
    class Config:
        from_attributes = True


class FECUploadResponse(BaseModel):
    status: str
    filename: str
    data: FECResults 