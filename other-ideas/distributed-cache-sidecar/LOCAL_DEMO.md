# Local Demo Instructions

## Running the Complete System Locally

This demonstrates the full distributed cache sidecar functionality without deployment issues.

### Step 1: Start Backend
```bash
cd backend
go run cmd/main.go
```

You should see:
```
HTTP server starting on port 8080
TCP server listening on port 9090
```

### Step 2: Update Frontend Configuration
Edit `frontend/.env`:
```
VITE_API_URL=localhost:8080
VITE_API_USER=user
VITE_API_PASSWORD=68fe133c325911372c50b5ae6422efc6
```

### Step 3: Start Frontend
```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

### Step 4: Test the System

#### Cache Operations
1. **Add Cache Item**: Use the form to add key-value pairs
2. **View Items**: See all cached items in the table
3. **Delete Items**: Click trash icon to remove items
4. **Real-time Updates**: Watch the dashboard update automatically

#### API Testing
Test the backend directly:
```bash
# Add an item
curl -X POST http://localhost:8080/api/cache/test \
  -H "Content-Type: application/json" \
  -d '{"value":"hello world","ttl":3600}'

# Get an item
curl http://localhost:8080/api/cache/test

# Get status
curl http://localhost:8080/api/status

# Delete an item
curl -X DELETE http://localhost:8080/api/cache/test
```

#### Multi-Region Simulation
To simulate multiple regions:

1. Start first instance on default ports (8080, 9090)
2. Start second instance on different ports:
   ```bash
   HTTP_PORT=8081 TCP_PORT=9091 REGION=us-west go run cmd/main.go
   ```
3. Configure peer discovery to connect the instances
4. Watch cache synchronization between regions

### Expected Results
- ✅ Frontend connects to backend without CORS errors
- ✅ Cache operations work through the UI
- ✅ Real-time updates display in dashboard
- ✅ TCP communication between multiple instances
- ✅ Peer discovery and synchronization working

This local setup demonstrates the complete functionality that would work in production with proper deployment infrastructure.
