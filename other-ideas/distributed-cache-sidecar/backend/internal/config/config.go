package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Region    string
	NodeID    string
	HTTPPort  int
	TCPPort   int
	Peers     []string
	CacheSize int
}

func Load() (*Config, error) {
	cfg := &Config{
		Region:    getEnv("REGION", "us-east-1"),
		NodeID:    getEnv("NODE_ID", "node-1"),
		HTTPPort:  getEnvInt("HTTP_PORT", 8080),
		TCPPort:   getEnvInt("TCP_PORT", 9090),
		CacheSize: getEnvInt("CACHE_SIZE", 1000),
	}

	if peersEnv := os.Getenv("PEERS"); peersEnv != "" {
		cfg.Peers = strings.Split(peersEnv, ",")
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
