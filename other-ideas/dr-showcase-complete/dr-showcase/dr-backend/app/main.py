from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import random
import time

app = FastAPI(title="Disaster Recovery Management API", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class DRSite:
    def __init__(self, name: str, location: str, status: str = "healthy"):
        self.name = name
        self.location = location
        self.status = status
        self.last_backup = datetime.now() - timedelta(hours=random.randint(1, 24))
        self.rpo_minutes = random.randint(15, 60)
        self.rto_minutes = random.randint(30, 120)

class BackupJob:
    def __init__(self, job_id: str, site: str, status: str = "completed"):
        self.job_id = job_id
        self.site = site
        self.status = status
        self.start_time = datetime.now() - timedelta(minutes=random.randint(5, 180))
        self.size_gb = random.randint(50, 500)

dr_sites = {
    "primary": DRSite("Primary Data Center", "New York, NY"),
    "secondary": DRSite("Secondary Data Center", "Chicago, IL"),
    "cloud": DRSite("Cloud DR Site", "AWS US-West-2")
}

backup_jobs = [
    BackupJob("backup_001", "primary"),
    BackupJob("backup_002", "secondary"),
    BackupJob("backup_003", "cloud", "running"),
    BackupJob("backup_004", "primary", "failed")
]

failover_history = []

class SiteStatus(BaseModel):
    name: str
    location: str
    status: str
    last_backup: datetime
    rpo_minutes: int
    rto_minutes: int

class BackupJobResponse(BaseModel):
    job_id: str
    site: str
    status: str
    start_time: datetime
    size_gb: int

class FailoverRequest(BaseModel):
    from_site: str
    to_site: str
    reason: str

class FailoverResponse(BaseModel):
    success: bool
    message: str
    failover_time: datetime
    estimated_downtime_minutes: int

@app.get("/")
def read_root():
    return {
        "message": "Disaster Recovery Management API",
        "version": "1.0.0",
        "endpoints": [
            "/sites/status",
            "/backups/jobs",
            "/failover/initiate",
            "/failover/history",
            "/health/check"
        ]
    }

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/sites/status", response_model=List[SiteStatus])
def get_sites_status():
    """Get status of all DR sites"""
    return [
        SiteStatus(
            name=site.name,
            location=site.location,
            status=site.status,
            last_backup=site.last_backup,
            rpo_minutes=site.rpo_minutes,
            rto_minutes=site.rto_minutes
        )
        for site in dr_sites.values()
    ]

@app.get("/backups/jobs", response_model=List[BackupJobResponse])
def get_backup_jobs():
    """Get all backup jobs"""
    return [
        BackupJobResponse(
            job_id=job.job_id,
            site=job.site,
            status=job.status,
            start_time=job.start_time,
            size_gb=job.size_gb
        )
        for job in backup_jobs
    ]

@app.post("/failover/initiate", response_model=FailoverResponse)
def initiate_failover(request: FailoverRequest):
    """Initiate failover between sites"""
    if request.from_site not in dr_sites or request.to_site not in dr_sites:
        raise HTTPException(status_code=400, detail="Invalid site specified")
    
    if dr_sites[request.from_site].status == "failed":
        estimated_downtime = dr_sites[request.to_site].rto_minutes
    else:
        estimated_downtime = random.randint(5, 15)
    
    time.sleep(1)  # Simulate processing time
    
    dr_sites[request.from_site].status = "failed"
    dr_sites[request.to_site].status = "active"
    
    failover_event = {
        "from_site": request.from_site,
        "to_site": request.to_site,
        "reason": request.reason,
        "timestamp": datetime.now(),
        "downtime_minutes": estimated_downtime
    }
    failover_history.append(failover_event)
    
    return FailoverResponse(
        success=True,
        message=f"Failover from {request.from_site} to {request.to_site} completed successfully",
        failover_time=datetime.now(),
        estimated_downtime_minutes=estimated_downtime
    )

@app.get("/failover/history")
def get_failover_history():
    """Get failover history"""
    return {"history": failover_history}

@app.get("/health/check")
def health_check():
    """Health check endpoint"""
    healthy_sites = sum(1 for site in dr_sites.values() if site.status in ["healthy", "active"])
    total_sites = len(dr_sites)
    
    return {
        "status": "healthy" if healthy_sites > 0 else "critical",
        "timestamp": datetime.now(),
        "sites_healthy": healthy_sites,
        "sites_total": total_sites,
        "uptime_percentage": (healthy_sites / total_sites) * 100
    }

@app.post("/sites/{site_id}/restore")
def restore_site(site_id: str):
    """Restore a failed site"""
    if site_id not in dr_sites:
        raise HTTPException(status_code=404, detail="Site not found")
    
    dr_sites[site_id].status = "healthy"
    dr_sites[site_id].last_backup = datetime.now()
    
    return {
        "success": True,
        "message": f"Site {site_id} restored successfully",
        "timestamp": datetime.now()
    }
