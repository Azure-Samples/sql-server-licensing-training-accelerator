# Distributed Cache Sidecar - Deployment Guide

## Overview
This is a complete distributed cache sidecar service with multi-region TCP communication and a React frontend dashboard.

## Architecture
- **Backend**: Golang service with REST API, TCP communication, and WebSocket support
- **Frontend**: React TypeScript dashboard with real-time monitoring
- **Communication**: TCP sockets for inter-region cache synchronization
- **Authentication**: Basic Auth for API security

## Quick Start

### Backend Setup
```bash
cd backend
go mod download
go run cmd/main.go
```

The backend will start on:
- HTTP API: `http://localhost:8080`
- TCP Server: `localhost:9090`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173`

### Environment Configuration
Create `frontend/.env`:
```
VITE_API_URL=localhost:8080
VITE_API_USER=user
VITE_API_PASSWORD=your-password-here
```

## API Endpoints

### Cache Operations
- `GET /api/cache/{key}` - Get cache item
- `POST /api/cache/{key}` - Set cache item
- `DELETE /api/cache/{key}` - Delete cache item

### Status & Monitoring
- `GET /api/status` - Get cache stats and items
- `GET /api/peers` - Get connected peers
- `GET /ws` - WebSocket for real-time updates

### CORS-Free Endpoints
- `GET /jsonp?callback=func` - JSONP endpoint for cross-origin requests
- `GET /proxy?path=/api/status&method=GET` - Server-side proxy

## Features

### Backend Features
- ✅ Distributed cache with TTL support
- ✅ Multi-region TCP peer communication
- ✅ Automatic peer discovery and synchronization
- ✅ REST API with proper CORS configuration
- ✅ WebSocket real-time updates
- ✅ Graceful shutdown handling
- ✅ Environment-based configuration

### Frontend Features
- ✅ Real-time cache monitoring dashboard
- ✅ Add/delete cache operations
- ✅ Connected peers display
- ✅ Cache statistics visualization
- ✅ Responsive design with Tailwind CSS
- ✅ Connection status indicators

## Docker Deployment

### Backend
```bash
cd backend
docker build -t distributed-cache-backend .
docker run -p 8080:8080 -p 9090:9090 distributed-cache-backend
```

### Frontend
```bash
cd frontend
npm run build
# Serve dist/ folder with any static file server
```

## Multi-Region Setup

1. Deploy backend instances in different regions
2. Configure peer addresses in environment variables
3. Each instance will automatically discover and sync with peers
4. Cache data is distributed across all connected regions

## Authentication
- Username: `user`
- Password: `68fe133c325911372c50b5ae6422efc6`
- Uses HTTP Basic Authentication for API access

## Troubleshooting

### CORS Issues
The backend includes multiple approaches to handle CORS:
1. Standard CORS headers with rs/cors library
2. Server-side proxy endpoint (`/proxy`)
3. JSONP endpoint (`/jsonp`) for legacy browser support

### Connection Issues
- Verify backend is running on correct port
- Check firewall settings for TCP port 9090
- Ensure authentication credentials are correct
- Use browser developer tools to debug API calls

## Production Considerations
- Use environment variables for sensitive configuration
- Set up proper SSL/TLS certificates
- Configure load balancing for high availability
- Monitor TCP connections and cache hit rates
- Set appropriate TTL values for cache items
