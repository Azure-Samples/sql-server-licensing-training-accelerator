# 🎓 SQL Server Licensing Training and Support Accelerator
### *by Laura Robinson*

> 🚀 A comprehensive learning and support tool for Microsoft SQL Server licensing, featuring cost modeling calculators, interactive training modules, and Microsoft 365 integration.

## Overview

This solution accelerator provides:
- **Interactive Learning Modules**: Step-by-step SQL Server licensing training
- **Cost Calculator**: Advanced licensing cost modeling with multiple scenarios
- **Scenario-Based Training**: Real-world customer scenarios with branching logic
- **Admin Console**: Content management for licensing experts
- **Microsoft 365 Integration**: Teams app and Azure AD authentication
- **Analytics Dashboard**: Usage tracking and learning progress insights

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript + Fluent UI v9 + Vite
- **Backend**: FastAPI + Python 3.12 + Pydantic  
- **Database**: In-memory storage (demo purposes)
- **Authentication**: Azure AD / Microsoft Entra ID (ready for setup)
- **Deployment**: Azure Static Web Apps + Azure App Service
- **DevOps**: Azure Developer CLI (azd) + GitHub Actions

## Features

### 🎓 Learning Platform
- Structured licensing topics with progress tracking
- Interactive quizzes with instant feedback
- Downloadable cheat sheets and reference materials
- Search functionality across all content

### 💰 Cost Calculator
- Multi-scenario licensing cost modeling
- Support for On-Premises, Azure VM, and Azure SQL MI workloads
- Per-Core and Server+CAL licensing models
- Export results to CSV/PDF

### 🎯 Scenario Training
- Customer scenario simulations
- Branching decision trees
- Best practice recommendations
- Real-world case studies

### 👥 Admin Features
- Content management interface
- Pricing updates and maintenance
- User analytics and reporting
- Bulk content import/export

### 🔗 Integration
- Microsoft Teams personal tab
- Azure AD single sign-on
- Power BI analytics integration
- LMS compatibility (LTI/SCORM)

## Quick Start

### Prerequisites
- 📦 Node.js 18+ 
- 🐍 Python 3.12+
- ☁️ Azure Developer CLI (azd)
- 🔧 Poetry (Python dependency management)

### 🚀 Quick Start Options

#### Option 1: GitHub Codespaces (Recommended)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/Azure-Samples/sql-server-licensing-training-accelerator)

1. Click the badge above
2. Wait for the environment to load (2-3 minutes)  
3. Everything will be set up automatically! ✨

#### Option 2: Dev Container (VS Code)
[![Open in Dev Container](https://img.shields.io/static/v1?label=Dev%20Containers&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/Azure-Samples/sql-server-licensing-training-accelerator)

1. Install [VS Code](https://code.visualstudio.com/) and [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Clone this repository
3. Open in VS Code and click "Reopen in Container"
4. Everything will be set up automatically! ✨

#### Option 3: Deploy to Azure

```bash
# Clone the repository
git clone https://github.com/Azure-Samples/sql-server-licensing-training-accelerator
cd sql-server-licensing-training-accelerator

# Initialize and deploy
azd auth login
azd init
azd up
```

### 💻 Local Development

```bash
# Install dependencies
cd backend && pip install poetry && poetry install
cd ../frontend && npm install

# Start development servers (in separate terminals)
# Backend (FastAPI)
cd backend && poetry run fastapi dev app/main.py

# Frontend (React + Vite)  
cd frontend && npm run dev
```

**URLs:**
- 🌐 Frontend: http://localhost:3000
- 🔌 Backend API: http://localhost:8000
- 📚 API Documentation: http://localhost:8000/docs

## Project Structure

```
├── frontend/                 # React TypeScript application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── services/       # API client services
│   │   └── types/          # TypeScript definitions
├── backend/                 # FastAPI Python API
│   ├── app/               # Application code
│   │   └── main.py       # FastAPI application
│   ├── pyproject.toml    # Python dependencies
│   └── poetry.lock       # Dependency lock file
├── infra/                  # Bicep infrastructure templates
├── docs/                   # Documentation
└── scripts/               # Deployment and utility scripts
```

## Configuration

### Environment Variables

**Frontend (.env)**
```
VITE_API_BASE_URL=https://your-api.azurewebsites.net
VITE_AZURE_CLIENT_ID=your-client-id
```

**Backend (appsettings.json)**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "your-sql-connection-string"
  },
  "AzureAd": {
    "ClientId": "your-client-id",
    "TenantId": "your-tenant-id"
  }
}
```

## Contributing

This project welcomes contributions and suggestions. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Security

If you discover a security vulnerability, please see [SECURITY.md](SECURITY.md) for reporting instructions.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For questions and support, please see [SUPPORT.md](SUPPORT.md).

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Use of Microsoft trademarks or logos is subject to Microsoft's Trademark & Brand Guidelines.
