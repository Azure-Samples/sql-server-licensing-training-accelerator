package main

import (
	"distributed-cache-sidecar/internal/cache"
	"distributed-cache-sidecar/internal/network"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var (
	cacheManager *cache.Manager
	peerManager  *network.PeerManager
	upgrader     = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
)

func setCacheManager(cm *cache.Manager) {
	cacheManager = cm
}

func setPeerManager(pm *network.PeerManager) {
	peerManager = pm
}

func handleGetCache(w http.ResponseWriter, r *http.Request) {
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

func handleSetCache(w http.ResponseWriter, r *http.Request) {
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

func handleDeleteCache(w http.ResponseWriter, r *http.Request) {
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

func handleStatus(w http.ResponseWriter, r *http.Request) {
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

func handlePeers(w http.ResponseWriter, r *http.Request) {
	peers := peerManager.GetPeers()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(peers)
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
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
