from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import random
import uuid

app = FastAPI(title="Productivity Monitoring System", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

monitoring_data = []
alerts = []
self_service_prompts = []

class MonitoringMetric(BaseModel):
    user_id: str
    metric_type: str
    value: float
    timestamp: datetime
    metadata: Optional[Dict] = {}

class Alert(BaseModel):
    id: str
    user_id: str
    alert_type: str
    severity: str
    message: str
    timestamp: datetime
    is_resolved: bool = False
    suggested_actions: List[str] = []

class SelfServicePrompt(BaseModel):
    id: str
    user_id: str
    prompt_type: str
    title: str
    description: str
    actions: List[Dict[str, str]]
    priority: str
    timestamp: datetime

def initialize_sample_data():
    global monitoring_data, alerts, self_service_prompts
    
    users = ["alice", "bob", "charlie", "diana", "eve"]
    current_time = datetime.now()
    
    for i in range(100):
        user = random.choice(users)
        metric_types = [
            "cpu_usage", "memory_usage", "disk_usage", "network_latency",
            "application_response_time", "error_rate", "active_sessions",
            "task_completion_rate", "focus_time", "meeting_duration"
        ]
        
        monitoring_data.append({
            "user_id": user,
            "metric_type": random.choice(metric_types),
            "value": random.uniform(0, 100),
            "timestamp": current_time - timedelta(hours=random.randint(0, 72)),
            "metadata": {"source": "system_monitor", "environment": "production"}
        })
    
    alert_scenarios = [
        {
            "alert_type": "performance_degradation",
            "severity": "high",
            "message": "CPU usage has been consistently above 85% for the past 30 minutes",
            "suggested_actions": [
                "Close unnecessary applications",
                "Restart your computer",
                "Check for background processes consuming resources"
            ]
        },
        {
            "alert_type": "low_productivity",
            "severity": "medium",
            "message": "Focus time has decreased by 40% compared to last week",
            "suggested_actions": [
                "Schedule focused work blocks",
                "Use productivity techniques like Pomodoro",
                "Minimize distractions during work hours"
            ]
        },
        {
            "alert_type": "system_health",
            "severity": "low",
            "message": "Disk usage is approaching 80% capacity",
            "suggested_actions": [
                "Clean up temporary files",
                "Archive old documents",
                "Consider upgrading storage"
            ]
        }
    ]
    
    for user in users:
        for scenario in alert_scenarios[:2]:  # Create 2 alerts per user
            alerts.append({
                "id": str(uuid.uuid4()),
                "user_id": user,
                "alert_type": scenario["alert_type"],
                "severity": scenario["severity"],
                "message": scenario["message"],
                "timestamp": current_time - timedelta(hours=random.randint(0, 24)),
                "is_resolved": random.choice([True, False]),
                "suggested_actions": scenario["suggested_actions"]
            })
    
    prompt_scenarios = [
        {
            "prompt_type": "productivity_tip",
            "title": "Optimize Your Morning Routine",
            "description": "Based on your activity patterns, you're most productive in the morning. Here are some tips to maximize this time.",
            "actions": [
                {"type": "schedule", "label": "Block morning focus time"},
                {"type": "reminder", "label": "Set daily planning reminder"},
                {"type": "dismiss", "label": "Not interested"}
            ],
            "priority": "medium"
        },
        {
            "prompt_type": "system_optimization",
            "title": "System Performance Boost",
            "description": "We've detected some performance issues. Would you like us to help optimize your system?",
            "actions": [
                {"type": "optimize", "label": "Run optimization"},
                {"type": "schedule", "label": "Schedule for later"},
                {"type": "learn_more", "label": "Learn more"}
            ],
            "priority": "high"
        },
        {
            "prompt_type": "wellness_check",
            "title": "Take a Break Reminder",
            "description": "You've been working for 3 hours straight. Consider taking a short break to maintain productivity.",
            "actions": [
                {"type": "break", "label": "Take 5-minute break"},
                {"type": "snooze", "label": "Remind me in 30 min"},
                {"type": "dismiss", "label": "I'm in the zone"}
            ],
            "priority": "low"
        }
    ]
    
    for user in users:
        for scenario in prompt_scenarios:
            self_service_prompts.append({
                "id": str(uuid.uuid4()),
                "user_id": user,
                "prompt_type": scenario["prompt_type"],
                "title": scenario["title"],
                "description": scenario["description"],
                "actions": scenario["actions"],
                "priority": scenario["priority"],
                "timestamp": current_time - timedelta(hours=random.randint(0, 12))
            })

initialize_sample_data()

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/api/monitoring/metrics")
async def get_monitoring_metrics(user_id: Optional[str] = None, metric_type: Optional[str] = None):
    """Get monitoring metrics, optionally filtered by user_id and metric_type"""
    filtered_data = monitoring_data
    
    if user_id:
        filtered_data = [m for m in filtered_data if m["user_id"] == user_id]
    
    if metric_type:
        filtered_data = [m for m in filtered_data if m["metric_type"] == metric_type]
    
    return {
        "metrics": filtered_data,
        "total_count": len(filtered_data),
        "users": list(set([m["user_id"] for m in monitoring_data])),
        "metric_types": list(set([m["metric_type"] for m in monitoring_data]))
    }

@app.get("/api/alerts")
async def get_alerts(user_id: Optional[str] = None, severity: Optional[str] = None, resolved: Optional[bool] = None):
    """Get alerts, optionally filtered by user_id, severity, and resolution status"""
    filtered_alerts = alerts
    
    if user_id:
        filtered_alerts = [a for a in filtered_alerts if a["user_id"] == user_id]
    
    if severity:
        filtered_alerts = [a for a in filtered_alerts if a["severity"] == severity]
    
    if resolved is not None:
        filtered_alerts = [a for a in filtered_alerts if a["is_resolved"] == resolved]
    
    filtered_alerts.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return {
        "alerts": filtered_alerts,
        "total_count": len(filtered_alerts),
        "summary": {
            "high_severity": len([a for a in filtered_alerts if a["severity"] == "high"]),
            "medium_severity": len([a for a in filtered_alerts if a["severity"] == "medium"]),
            "low_severity": len([a for a in filtered_alerts if a["severity"] == "low"]),
            "unresolved": len([a for a in filtered_alerts if not a["is_resolved"]])
        }
    }

@app.get("/api/self-service-prompts")
async def get_self_service_prompts(user_id: Optional[str] = None, priority: Optional[str] = None):
    """Get self-service prompts, optionally filtered by user_id and priority"""
    filtered_prompts = self_service_prompts
    
    if user_id:
        filtered_prompts = [p for p in filtered_prompts if p["user_id"] == user_id]
    
    if priority:
        filtered_prompts = [p for p in filtered_prompts if p["priority"] == priority]
    
    priority_order = {"high": 3, "medium": 2, "low": 1}
    filtered_prompts.sort(key=lambda x: (priority_order.get(x["priority"], 0), x["timestamp"]), reverse=True)
    
    return {
        "prompts": filtered_prompts,
        "total_count": len(filtered_prompts),
        "summary": {
            "high_priority": len([p for p in filtered_prompts if p["priority"] == "high"]),
            "medium_priority": len([p for p in filtered_prompts if p["priority"] == "medium"]),
            "low_priority": len([p for p in filtered_prompts if p["priority"] == "low"])
        }
    }

@app.post("/api/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    """Mark an alert as resolved"""
    for alert in alerts:
        if alert["id"] == alert_id:
            alert["is_resolved"] = True
            return {"message": "Alert resolved successfully", "alert": alert}
    
    return {"error": "Alert not found"}, 404

@app.post("/api/self-service-prompts/{prompt_id}/action")
async def handle_prompt_action(prompt_id: str, action_type: str):
    """Handle action taken on a self-service prompt"""
    for prompt in self_service_prompts:
        if prompt["id"] == prompt_id:
            return {
                "message": f"Action '{action_type}' processed successfully",
                "prompt_id": prompt_id,
                "action_type": action_type,
                "timestamp": datetime.now()
            }
    
    return {"error": "Prompt not found"}, 404

@app.get("/api/dashboard/summary")
async def get_dashboard_summary():
    """Get summary data for the dashboard"""
    current_time = datetime.now()
    recent_threshold = current_time - timedelta(hours=24)
    
    recent_metrics = [m for m in monitoring_data if m["timestamp"] > recent_threshold]
    unresolved_alerts = [a for a in alerts if not a["is_resolved"]]
    high_priority_prompts = [p for p in self_service_prompts if p["priority"] == "high"]
    
    avg_cpu = sum([m["value"] for m in recent_metrics if m["metric_type"] == "cpu_usage"]) / max(len([m for m in recent_metrics if m["metric_type"] == "cpu_usage"]), 1)
    avg_memory = sum([m["value"] for m in recent_metrics if m["metric_type"] == "memory_usage"]) / max(len([m for m in recent_metrics if m["metric_type"] == "memory_usage"]), 1)
    health_score = max(0, 100 - (avg_cpu + avg_memory) / 2)
    
    return {
        "system_health_score": round(health_score, 1),
        "total_users": len(set([m["user_id"] for m in monitoring_data])),
        "active_alerts": len(unresolved_alerts),
        "high_priority_prompts": len(high_priority_prompts),
        "recent_metrics_count": len(recent_metrics),
        "productivity_trends": {
            "focus_time_avg": round(sum([m["value"] for m in recent_metrics if m["metric_type"] == "focus_time"]) / max(len([m for m in recent_metrics if m["metric_type"] == "focus_time"]), 1), 1),
            "task_completion_rate": round(sum([m["value"] for m in recent_metrics if m["metric_type"] == "task_completion_rate"]) / max(len([m for m in recent_metrics if m["metric_type"] == "task_completion_rate"]), 1), 1)
        }
    }
