package cache

import (
	"encoding/json"
	"sync"
	"time"
)

type CacheItem struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	Region    string    `json:"region"`
	NodeID    string    `json:"node_id"`
	Timestamp time.Time `json:"timestamp"`
	TTL       int64     `json:"ttl"`
}

type Manager struct {
	region   string
	nodeID   string
	items    map[string]*CacheItem
	mutex    sync.RWMutex
	stats    *Stats
	onChange chan *CacheItem
}

type Stats struct {
	TotalItems    int `json:"total_items"`
	LocalItems    int `json:"local_items"`
	RemoteItems   int `json:"remote_items"`
	HitCount      int `json:"hit_count"`
	MissCount     int `json:"miss_count"`
	LastUpdated   time.Time `json:"last_updated"`
}

func NewManager(region, nodeID string) *Manager {
	return &Manager{
		region:   region,
		nodeID:   nodeID,
		items:    make(map[string]*CacheItem),
		stats:    &Stats{LastUpdated: time.Now()},
		onChange: make(chan *CacheItem, 100),
	}
}

func (m *Manager) Get(key string) (*CacheItem, bool) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	item, exists := m.items[key]
	if !exists {
		m.stats.MissCount++
		return nil, false
	}

	if item.TTL > 0 && time.Since(item.Timestamp).Seconds() > float64(item.TTL) {
		delete(m.items, key)
		m.stats.MissCount++
		return nil, false
	}

	m.stats.HitCount++
	return item, true
}

func (m *Manager) Set(key, value string, ttl int64) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	item := &CacheItem{
		Key:       key,
		Value:     value,
		Region:    m.region,
		NodeID:    m.nodeID,
		Timestamp: time.Now(),
		TTL:       ttl,
	}

	m.items[key] = item
	m.updateStats()

	select {
	case m.onChange <- item:
	default:
	}
}

func (m *Manager) Delete(key string) bool {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if _, exists := m.items[key]; exists {
		delete(m.items, key)
		m.updateStats()
		return true
	}
	return false
}

func (m *Manager) SetRemote(item *CacheItem) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	existing, exists := m.items[item.Key]
	if !exists || item.Timestamp.After(existing.Timestamp) {
		m.items[item.Key] = item
		m.updateStats()
	}
}

func (m *Manager) GetStats() *Stats {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	
	statsCopy := *m.stats
	return &statsCopy
}

func (m *Manager) GetAllItems() []*CacheItem {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	items := make([]*CacheItem, 0, len(m.items))
	for _, item := range m.items {
		if item.TTL == 0 || time.Since(item.Timestamp).Seconds() <= float64(item.TTL) {
			items = append(items, item)
		}
	}
	return items
}

func (m *Manager) GetChangeChannel() <-chan *CacheItem {
	return m.onChange
}

func (m *Manager) updateStats() {
	m.stats.TotalItems = len(m.items)
	m.stats.LocalItems = 0
	m.stats.RemoteItems = 0
	
	for _, item := range m.items {
		if item.NodeID == m.nodeID {
			m.stats.LocalItems++
		} else {
			m.stats.RemoteItems++
		}
	}
	
	m.stats.LastUpdated = time.Now()
}

func (m *Manager) SerializeItem(item *CacheItem) ([]byte, error) {
	return json.Marshal(item)
}

func (m *Manager) DeserializeItem(data []byte) (*CacheItem, error) {
	var item CacheItem
	err := json.Unmarshal(data, &item)
	return &item, err
}
