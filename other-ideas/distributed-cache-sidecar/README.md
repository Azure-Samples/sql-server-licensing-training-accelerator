# Distributed Cache Sidecar

A Golang sidecar service that provides distributed caching across multiple regions using TCP socket connections.

## Architecture

- **Backend**: Golang TCP server with distributed cache
- **Frontend**: React dashboard for monitoring cache status
- **Deployment**: Multi-region Azure Container Apps

## Features

- TCP-based inter-region communication
- Distributed cache with region-aware routing
- Real-time monitoring dashboard
- Auto-discovery of peer nodes
- Health checks and failover

## Quick Start

### Backend
```bash
cd backend
go run cmd/main.go
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Deployment

Deploy to Azure Container Apps across multiple regions:
```bash
# Deploy to multiple regions
./deploy.sh
```
