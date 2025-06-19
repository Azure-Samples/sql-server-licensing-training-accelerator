package network

import (
	"bufio"
	"distributed-cache-sidecar/internal/cache"
	"distributed-cache-sidecar/internal/config"
	"fmt"
	"log"
	"net"
	"strings"
	"sync"
	"time"
)

type PeerManager struct {
	config       *config.Config
	cacheManager *cache.Manager
	peers        map[string]*Peer
	mutex        sync.RWMutex
	running      bool
}

type Peer struct {
	Address    string
	Region     string
	Connected  bool
	LastSeen   time.Time
	Connection net.Conn
}

func NewPeerManager(cfg *config.Config, cacheManager *cache.Manager) *PeerManager {
	return &PeerManager{
		config:       cfg,
		cacheManager: cacheManager,
		peers:        make(map[string]*Peer),
	}
}

func (pm *PeerManager) Start() {
	pm.running = true
	
	for _, peerAddr := range pm.config.Peers {
		pm.addPeer(peerAddr)
	}

	go pm.syncLoop()
	go pm.healthCheckLoop()
	
	changeChannel := pm.cacheManager.GetChangeChannel()
	go func() {
		for item := range changeChannel {
			pm.broadcastItem(item)
		}
	}()
}

func (pm *PeerManager) Stop() {
	pm.running = false
	
	pm.mutex.Lock()
	for _, peer := range pm.peers {
		if peer.Connection != nil {
			peer.Connection.Close()
		}
	}
	pm.mutex.Unlock()
}

func (pm *PeerManager) addPeer(address string) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()
	
	if _, exists := pm.peers[address]; !exists {
		pm.peers[address] = &Peer{
			Address:   address,
			Connected: false,
			LastSeen:  time.Now(),
		}
	}
}

func (pm *PeerManager) connectToPeer(peer *Peer) error {
	conn, err := net.DialTimeout("tcp", peer.Address, 10*time.Second)
	if err != nil {
		return err
	}

	peer.Connection = conn
	peer.Connected = true
	peer.LastSeen = time.Now()
	
	go pm.handlePeerConnection(peer)
	
	return nil
}

func (pm *PeerManager) handlePeerConnection(peer *Peer) {
	defer func() {
		peer.Connected = false
		if peer.Connection != nil {
			peer.Connection.Close()
			peer.Connection = nil
		}
	}()

	scanner := bufio.NewScanner(peer.Connection)
	for scanner.Scan() && pm.running {
		message := strings.TrimSpace(scanner.Text())
		if message != "" {
			pm.processPeerMessage(peer, message)
		}
	}
}

func (pm *PeerManager) processPeerMessage(peer *Peer, message string) {
	parts := strings.Split(message, "|")
	if len(parts) < 2 {
		return
	}

	command := parts[0]
	
	switch command {
	case "SYNC":
		if len(parts) >= 2 {
			itemData := parts[1]
			item, err := pm.cacheManager.DeserializeItem([]byte(itemData))
			if err == nil {
				pm.cacheManager.SetRemote(item)
			}
		}
	case "PONG":
		peer.LastSeen = time.Now()
	}
}

func (pm *PeerManager) broadcastItem(item *cache.CacheItem) {
	data, err := pm.cacheManager.SerializeItem(item)
	if err != nil {
		return
	}

	message := fmt.Sprintf("SYNC|%s\n", string(data))

	pm.mutex.RLock()
	peers := make([]*Peer, 0, len(pm.peers))
	for _, peer := range pm.peers {
		if peer.Connected && peer.Connection != nil {
			peers = append(peers, peer)
		}
	}
	pm.mutex.RUnlock()

	for _, peer := range peers {
		if _, err := peer.Connection.Write([]byte(message)); err != nil {
			log.Printf("Failed to send to peer %s: %v", peer.Address, err)
		}
	}
}

func (pm *PeerManager) syncLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for pm.running {
		select {
		case <-ticker.C:
			pm.syncWithPeers()
		}
	}
}

func (pm *PeerManager) healthCheckLoop() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for pm.running {
		select {
		case <-ticker.C:
			pm.checkPeerHealth()
		}
	}
}

func (pm *PeerManager) syncWithPeers() {
	pm.mutex.RLock()
	peers := make([]*Peer, 0, len(pm.peers))
	for _, peer := range pm.peers {
		peers = append(peers, peer)
	}
	pm.mutex.RUnlock()

	for _, peer := range peers {
		if !peer.Connected {
			if err := pm.connectToPeer(peer); err != nil {
				log.Printf("Failed to connect to peer %s: %v", peer.Address, err)
			}
		}
	}
}

func (pm *PeerManager) checkPeerHealth() {
	pm.mutex.RLock()
	peers := make([]*Peer, 0, len(pm.peers))
	for _, peer := range pm.peers {
		if peer.Connected && peer.Connection != nil {
			peers = append(peers, peer)
		}
	}
	pm.mutex.RUnlock()

	for _, peer := range peers {
		if _, err := peer.Connection.Write([]byte("PING\n")); err != nil {
			log.Printf("Health check failed for peer %s: %v", peer.Address, err)
			peer.Connected = false
			if peer.Connection != nil {
				peer.Connection.Close()
				peer.Connection = nil
			}
		}
	}
}

func (pm *PeerManager) GetPeers() []*Peer {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()
	
	peers := make([]*Peer, 0, len(pm.peers))
	for _, peer := range pm.peers {
		peerCopy := *peer
		peerCopy.Connection = nil
		peers = append(peers, &peerCopy)
	}
	
	return peers
}
