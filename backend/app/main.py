from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

app = FastAPI(
    title="SQL Server Licensing Training API",
    description="API for SQL Server licensing training and cost calculation",
    version="1.0.0"
)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

topics_db = []
scenarios_db = []
quizzes_db = []
pricing_db = [
    {"id": "std-core", "edition": "Standard", "license_type": "PerCore", "price_per_unit": 3586},
    {"id": "ent-core", "edition": "Enterprise", "license_type": "PerCore", "price_per_unit": 14256},
    {"id": "std-cal", "edition": "Standard", "license_type": "ServerCAL", "server_price": 931, "cal_price": 209},
    {"id": "ent-cal", "edition": "Enterprise", "license_type": "ServerCAL", "server_price": 14256, "cal_price": 209}
]

class CostModelRequest(BaseModel):
    workload_type: str  # OnPrem, AzureVM, AzureSQLMI
    edition: str  # Standard, Enterprise
    license_model: str  # PerCore, ServerCAL
    core_count: int
    user_count: Optional[int] = None
    include_sa: bool = True
    term_years: int = 3

class CostModelResponse(BaseModel):
    total_cost: float
    annual_breakdown: List[float]
    cost_per_user: Optional[float]
    notes: str

class Topic(BaseModel):
    id: str
    title: str
    description: str
    content: str
    tags: List[str]
    difficulty: str
    estimated_time: int

class Scenario(BaseModel):
    id: str
    title: str
    description: str
    customer_profile: str
    requirements: List[str]
    recommended_solution: str

class QuizQuestion(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_answer: int
    explanation: str

class Quiz(BaseModel):
    id: str
    title: str
    topic_id: str
    questions: List[QuizQuestion]

class QuizSubmission(BaseModel):
    quiz_id: str
    answers: List[int]

class QuizResult(BaseModel):
    score: float
    correct_answers: int
    total_questions: int
    detailed_feedback: List[str]

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/api/v1/cost-model", response_model=CostModelResponse)
async def calculate_cost(request: CostModelRequest):
    try:
        pricing = None
        for p in pricing_db:
            if p["edition"] == request.edition and p["license_type"] == request.license_model:
                pricing = p
                break
        
        if not pricing:
            raise HTTPException(status_code=400, detail="Invalid edition or license model")
        
        total_cost = 0
        notes = []
        
        if request.license_model == "PerCore":
            min_cores = max(request.core_count, 4)  # Minimum 4 cores
            core_cost = min_cores * pricing["price_per_unit"]
            
            if request.include_sa:
                sa_cost = core_cost * 0.25  # 25% Software Assurance
                total_cost = core_cost + sa_cost
                notes.append(f"Software Assurance included (25% of license cost)")
            else:
                total_cost = core_cost
            
            notes.append(f"Minimum 4 cores enforced (requested: {request.core_count}, billed: {min_cores})")
            
        elif request.license_model == "ServerCAL":
            if not request.user_count:
                raise HTTPException(status_code=400, detail="User count required for Server+CAL licensing")
            
            server_cost = pricing["server_price"]
            cal_cost = request.user_count * pricing["cal_price"]
            total_cost = server_cost + cal_cost
            
            if request.include_sa:
                sa_cost = total_cost * 0.25
                total_cost += sa_cost
                notes.append(f"Software Assurance included (25% of total cost)")
            
            notes.append(f"Server license: ${server_cost:,.2f}, CAL licenses: {request.user_count} × ${pricing['cal_price']} = ${cal_cost:,.2f}")
        
        if request.workload_type == "AzureVM":
            notes.append("Consider Azure Hybrid Benefit for potential cost savings")
        elif request.workload_type == "AzureSQLMI":
            notes.append("Azure SQL Managed Instance uses vCore-based pricing")
        
        annual_cost = total_cost / request.term_years
        annual_breakdown = [annual_cost] * request.term_years
        
        cost_per_user = None
        if request.user_count and request.user_count > 0:
            cost_per_user = total_cost / request.user_count
        
        return CostModelResponse(
            total_cost=total_cost,
            annual_breakdown=annual_breakdown,
            cost_per_user=cost_per_user,
            notes="; ".join(notes)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/content/topics")
async def get_topics(search: Optional[str] = None, page: int = 1, page_size: int = 20):
    filtered_topics = topics_db
    if search:
        filtered_topics = [t for t in topics_db if search.lower() in t["title"].lower() or search.lower() in t["description"].lower()]
    
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    return {
        "topics": filtered_topics[start_idx:end_idx],
        "total": len(filtered_topics),
        "page": page,
        "page_size": page_size
    }

@app.get("/api/v1/content/topics/{topic_id}")
async def get_topic(topic_id: str):
    topic = next((t for t in topics_db if t["id"] == topic_id), None)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic

@app.get("/api/v1/scenarios")
async def get_scenarios():
    return {"scenarios": scenarios_db}

@app.get("/api/v1/scenarios/{scenario_id}")
async def get_scenario(scenario_id: str):
    scenario = next((s for s in scenarios_db if s["id"] == scenario_id), None)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario

@app.get("/api/v1/quiz/{quiz_id}")
async def get_quiz(quiz_id: str):
    quiz = next((q for q in quizzes_db if q["id"] == quiz_id), None)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

@app.post("/api/v1/quiz/submit", response_model=QuizResult)
async def submit_quiz(submission: QuizSubmission):
    quiz = next((q for q in quizzes_db if q["id"] == submission.quiz_id), None)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    if len(submission.answers) != len(quiz["questions"]):
        raise HTTPException(status_code=400, detail="Answer count doesn't match question count")
    
    correct_count = 0
    detailed_feedback = []
    
    for i, (answer, question) in enumerate(zip(submission.answers, quiz["questions"])):
        is_correct = answer == question["correct_answer"]
        if is_correct:
            correct_count += 1
        
        feedback = f"Question {i+1}: {'Correct' if is_correct else 'Incorrect'}. {question['explanation']}"
        detailed_feedback.append(feedback)
    
    score = (correct_count / len(quiz["questions"])) * 100
    
    return QuizResult(
        score=score,
        correct_answers=correct_count,
        total_questions=len(quiz["questions"]),
        detailed_feedback=detailed_feedback
    )

@app.post("/api/v1/telemetry")
async def log_telemetry(event_data: dict):
    print(f"Telemetry event: {event_data}")
    return {"status": "logged"}

def initialize_sample_data():
    global topics_db, scenarios_db, quizzes_db
    
    topics_db = [
        {
            "id": "licensing-basics",
            "title": "SQL Server Licensing Basics",
            "description": "Understanding the fundamentals of SQL Server licensing models",
            "content": "# SQL Server Licensing Basics\n\nSQL Server offers two main licensing models:\n\n## Per-Core Licensing\n- Based on the number of physical cores\n- Minimum 4 cores per processor\n- Suitable for high-user environments\n\n## Server + CAL Licensing\n- Server license + Client Access Licenses\n- Better for smaller user counts\n- Each user or device needs a CAL",
            "tags": ["basics", "licensing", "fundamentals"],
            "difficulty": "Beginner",
            "estimated_time": 15
        },
        {
            "id": "azure-licensing",
            "title": "SQL Server on Azure",
            "description": "Licensing considerations for SQL Server in Azure environments",
            "content": "# SQL Server on Azure\n\n## Azure SQL Database\n- DTU or vCore-based pricing\n- No traditional licensing required\n\n## Azure SQL Managed Instance\n- vCore-based pricing\n- Azure Hybrid Benefit available\n\n## SQL Server on Azure VMs\n- Traditional licensing applies\n- Pay-as-you-go or BYOL options",
            "tags": ["azure", "cloud", "hybrid"],
            "difficulty": "Intermediate",
            "estimated_time": 20
        }
    ]
    
    scenarios_db = [
        {
            "id": "small-business",
            "title": "Small Business Scenario",
            "description": "A small business with 25 users needs SQL Server",
            "customer_profile": "Manufacturing company with 25 employees, basic reporting needs",
            "requirements": ["25 concurrent users", "Standard edition features", "Cost-effective solution"],
            "recommended_solution": "SQL Server Standard with Server + CAL licensing (1 server license + 25 CALs)"
        },
        {
            "id": "enterprise-scenario",
            "title": "Enterprise Data Warehouse",
            "description": "Large enterprise needs high-performance data warehouse",
            "customer_profile": "Fortune 500 company, 24/7 operations, advanced analytics",
            "requirements": ["High availability", "Advanced analytics", "Unlimited virtualization"],
            "recommended_solution": "SQL Server Enterprise with Per-Core licensing for maximum performance and features"
        }
    ]
    
    quizzes_db = [
        {
            "id": "basics-quiz",
            "title": "Licensing Basics Quiz",
            "topic_id": "licensing-basics",
            "questions": [
                {
                    "id": "q1",
                    "question": "What is the minimum number of cores required for Per-Core licensing?",
                    "options": ["2 cores", "4 cores", "8 cores", "16 cores"],
                    "correct_answer": 1,
                    "explanation": "SQL Server Per-Core licensing requires a minimum of 4 cores per processor."
                },
                {
                    "id": "q2",
                    "question": "Which licensing model is typically better for environments with many users?",
                    "options": ["Server + CAL", "Per-Core", "Both are equal", "Depends on the day"],
                    "correct_answer": 1,
                    "explanation": "Per-Core licensing is typically more cost-effective for environments with many users since you don't need individual CALs."
                }
            ]
        }
    ]

initialize_sample_data()
