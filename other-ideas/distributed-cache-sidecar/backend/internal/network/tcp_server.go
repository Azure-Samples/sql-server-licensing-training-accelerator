package network

import (
	"bufio"
	"distributed-cache-sidecar/internal/cache"
	"fmt"
	"log"
	"net"
	"strings"
	"sync"
)

type TCPServer struct {
	port         int
	listener     net.Listener
	cacheManager *cache.Manager
	connections  map[string]net.Conn
	mutex        sync.RWMutex
	running      bool
}

func NewTCPServer(port int, cacheManager *cache.Manager) *TCPServer {
	return &TCPServer{
		port:         port,
		cacheManager: cacheManager,
		connections:  make(map[string]net.Conn),
	}
}

func (s *TCPServer) Start() error {
	listener, err := net.Listen("tcp", fmt.Sprintf(":%d", s.port))
	if err != nil {
		return fmt.Errorf("failed to start TCP server: %v", err)
	}

	s.listener = listener
	s.running = true
	
	log.Printf("TCP server listening on port %d", s.port)

	for s.running {
		conn, err := listener.Accept()
		if err != nil {
			if s.running {
				log.Printf("Failed to accept connection: %v", err)
			}
			continue
		}

		go s.handleConnection(conn)
	}

	return nil
}

func (s *TCPServer) Stop() {
	s.running = false
	
	if s.listener != nil {
		s.listener.Close()
	}

	s.mutex.Lock()
	for _, conn := range s.connections {
		conn.Close()
	}
	s.connections = make(map[string]net.Conn)
	s.mutex.Unlock()
}

func (s *TCPServer) handleConnection(conn net.Conn) {
	defer conn.Close()
	
	remoteAddr := conn.RemoteAddr().String()
	log.Printf("New TCP connection from %s", remoteAddr)

	s.mutex.Lock()
	s.connections[remoteAddr] = conn
	s.mutex.Unlock()

	defer func() {
		s.mutex.Lock()
		delete(s.connections, remoteAddr)
		s.mutex.Unlock()
	}()

	scanner := bufio.NewScanner(conn)
	for scanner.Scan() {
		message := strings.TrimSpace(scanner.Text())
		if message == "" {
			continue
		}

		response := s.processMessage(message)
		if response != "" {
			fmt.Fprintf(conn, "%s\n", response)
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("Connection error with %s: %v", remoteAddr, err)
	}
}

func (s *TCPServer) processMessage(message string) string {
	parts := strings.Split(message, "|")
	if len(parts) < 2 {
		return "ERROR|Invalid message format"
	}

	command := parts[0]
	
	switch command {
	case "SYNC":
		if len(parts) < 2 {
			return "ERROR|Missing data for SYNC"
		}
		
		itemData := parts[1]
		item, err := s.cacheManager.DeserializeItem([]byte(itemData))
		if err != nil {
			return fmt.Sprintf("ERROR|Failed to deserialize: %v", err)
		}
		
		s.cacheManager.SetRemote(item)
		return "OK|Synced"
		
	case "GET":
		if len(parts) < 2 {
			return "ERROR|Missing key for GET"
		}
		
		key := parts[1]
		item, exists := s.cacheManager.Get(key)
		if !exists {
			return "NOT_FOUND|Key not found"
		}
		
		data, err := s.cacheManager.SerializeItem(item)
		if err != nil {
			return fmt.Sprintf("ERROR|Serialization failed: %v", err)
		}
		
		return fmt.Sprintf("OK|%s", string(data))
		
	case "PING":
		return "PONG"
		
	default:
		return "ERROR|Unknown command"
	}
}

func (s *TCPServer) BroadcastSync(item *cache.CacheItem) {
	data, err := s.cacheManager.SerializeItem(item)
	if err != nil {
		log.Printf("Failed to serialize item for broadcast: %v", err)
		return
	}

	message := fmt.Sprintf("SYNC|%s\n", string(data))

	s.mutex.RLock()
	connections := make([]net.Conn, 0, len(s.connections))
	for _, conn := range s.connections {
		connections = append(connections, conn)
	}
	s.mutex.RUnlock()

	for _, conn := range connections {
		if _, err := conn.Write([]byte(message)); err != nil {
			log.Printf("Failed to broadcast to connection: %v", err)
		}
	}
}
