package main

import (
	"context"
	"distributed-cache-sidecar/internal/cache"
	"distributed-cache-sidecar/internal/config"
	"distributed-cache-sidecar/internal/network"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/rs/cors"
)

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	cacheManager := cache.NewManager(cfg.Region, cfg.NodeID)
	
	tcpServer := network.NewTCPServer(cfg.TCPPort, cacheManager)
	go func() {
		if err := tcpServer.Start(); err != nil {
			log.Printf("TCP server error: %v", err)
		}
	}()

	peerManager := network.NewPeerManager(cfg, cacheManager)
	go peerManager.Start()

	router := mux.NewRouter()
	
	router.HandleFunc("/cors-proxy", func(w http.ResponseWriter, r *http.Request) {
		handleCorsProxy(w, r)
	}).Methods("OPTIONS")
	
	router.HandleFunc("/proxy", func(w http.ResponseWriter, r *http.Request) {
		handleProxy(w, r, cacheManager, peerManager)
	}).Methods("GET", "POST", "DELETE")
	
	router.HandleFunc("/jsonp", func(w http.ResponseWriter, r *http.Request) {
		handleJSONP(w, r, cacheManager, peerManager)
	}).Methods("GET")
	
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/cache/{key}", func(w http.ResponseWriter, r *http.Request) {
		handleGetCache(w, r, cacheManager)
	}).Methods("GET")
	api.HandleFunc("/cache/{key}", func(w http.ResponseWriter, r *http.Request) {
		handleSetCache(w, r, cacheManager)
	}).Methods("POST")
	api.HandleFunc("/cache/{key}", func(w http.ResponseWriter, r *http.Request) {
		handleDeleteCache(w, r, cacheManager)
	}).Methods("DELETE")
	api.HandleFunc("/cache/{key}", func(w http.ResponseWriter, r *http.Request) {
		handleOptions(w, r)
	}).Methods("OPTIONS")
	api.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		handleStatus(w, r, cacheManager, peerManager)
	}).Methods("GET")
	api.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		handleOptions(w, r)
	}).Methods("OPTIONS")
	api.HandleFunc("/peers", func(w http.ResponseWriter, r *http.Request) {
		handlePeers(w, r, peerManager)
	}).Methods("GET")
	api.HandleFunc("/peers", func(w http.ResponseWriter, r *http.Request) {
		handleOptions(w, r)
	}).Methods("OPTIONS")
	api.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(w, r, cacheManager, peerManager)
	}).Methods("GET")

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
		AllowCredentials: false,
	})

	handler := c.Handler(router)
	
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.HTTPPort),
		Handler: handler,
	}

	go func() {
		log.Printf("HTTP server starting on port %d", cfg.HTTPPort)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down servers...")
	
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("HTTP server shutdown error: %v", err)
	}
	
	tcpServer.Stop()
	peerManager.Stop()
	
	log.Println("Servers stopped")
}

func handleGetCache(w http.ResponseWriter, r *http.Request, cacheManager *cache.Manager) {
	vars := mux.Vars(r)
	key := vars["key"]

	item, exists := cacheManager.Get(key)
	if !exists {
		http.Error(w, "Key not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

func handleSetCache(w http.ResponseWriter, r *http.Request, cacheManager *cache.Manager) {
	vars := mux.Vars(r)
	key := vars["key"]

	var request struct {
		Value string `json:"value"`
		TTL   int64  `json:"ttl"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	cacheManager.Set(key, request.Value, request.TTL)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func handleDeleteCache(w http.ResponseWriter, r *http.Request, cacheManager *cache.Manager) {
	vars := mux.Vars(r)
	key := vars["key"]

	deleted := cacheManager.Delete(key)
	if !deleted {
		http.Error(w, "Key not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

func handleStatus(w http.ResponseWriter, r *http.Request, cacheManager *cache.Manager, peerManager *network.PeerManager) {
	stats := cacheManager.GetStats()
	peers := peerManager.GetPeers()

	response := map[string]interface{}{
		"stats": stats,
		"peers": peers,
		"items": cacheManager.GetAllItems(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handlePeers(w http.ResponseWriter, r *http.Request, peerManager *network.PeerManager) {
	peers := peerManager.GetPeers()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(peers)
}

func handleCorsProxy(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Max-Age", "86400")
	w.WriteHeader(http.StatusNoContent)
}

func handleOptions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Max-Age", "86400")
	w.WriteHeader(http.StatusNoContent)
}

func handleProxy(w http.ResponseWriter, r *http.Request, cacheManager *cache.Manager, peerManager *network.PeerManager) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Content-Type", "application/json")

	path := r.URL.Query().Get("path")
	method := r.URL.Query().Get("method")
	
	if path == "" {
		http.Error(w, "Missing path parameter", http.StatusBadRequest)
		return
	}
	
	if method == "" {
		method = "GET"
	}

	switch {
	case path == "/api/status" && method == "GET":
		stats := cacheManager.GetStats()
		peers := peerManager.GetPeers()
		response := map[string]interface{}{
			"stats": stats,
			"peers": peers,
			"items": cacheManager.GetAllItems(),
		}
		json.NewEncoder(w).Encode(response)
		
	case path == "/api/peers" && method == "GET":
		peers := peerManager.GetPeers()
		json.NewEncoder(w).Encode(peers)
		
	case strings.HasPrefix(path, "/api/cache/") && method == "GET":
		key := strings.TrimPrefix(path, "/api/cache/")
		item, exists := cacheManager.Get(key)
		if !exists {
			http.Error(w, "Key not found", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(item)
		
	case strings.HasPrefix(path, "/api/cache/") && method == "POST":
		key := strings.TrimPrefix(path, "/api/cache/")
		
		var request struct {
			Value string `json:"value"`
			TTL   int64  `json:"ttl"`
		}
		
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read body", http.StatusBadRequest)
			return
		}
		
		if err := json.Unmarshal(body, &request); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}
		
		cacheManager.Set(key, request.Value, request.TTL)
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
		
	case strings.HasPrefix(path, "/api/cache/") && method == "DELETE":
		key := strings.TrimPrefix(path, "/api/cache/")
		deleted := cacheManager.Delete(key)
		if !deleted {
			http.Error(w, "Key not found", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
		
	default:
		http.Error(w, "Unsupported path or method", http.StatusNotFound)
	}
}

func handleJSONP(w http.ResponseWriter, r *http.Request, cacheManager *cache.Manager, peerManager *network.PeerManager) {
	callback := r.URL.Query().Get("callback")
	if callback == "" {
		callback = "callback"
	}
	
	w.Header().Set("Content-Type", "application/javascript")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	
	stats := cacheManager.GetStats()
	peers := peerManager.GetPeers()
	
	response := map[string]interface{}{
		"stats": stats,
		"peers": peers,
		"items": cacheManager.GetAllItems(),
	}
	
	jsonData, err := json.Marshal(response)
	if err != nil {
		http.Error(w, "Failed to marshal JSON", http.StatusInternalServerError)
		return
	}
	
	fmt.Fprintf(w, "%s(%s);", callback, string(jsonData))
}

func handleWebSocket(w http.ResponseWriter, r *http.Request, cacheManager *cache.Manager, peerManager *network.PeerManager) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			stats := cacheManager.GetStats()
			peers := peerManager.GetPeers()
			
			update := map[string]interface{}{
				"type":  "status_update",
				"stats": stats,
				"peers": peers,
				"items": cacheManager.GetAllItems(),
			}

			if err := conn.WriteJSON(update); err != nil {
				return
			}
		}
	}
}
