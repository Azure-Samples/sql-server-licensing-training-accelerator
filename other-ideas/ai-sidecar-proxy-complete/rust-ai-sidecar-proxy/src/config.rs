use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub upstream_services: HashMap<String, UpstreamService>,
    pub ai_config: AIConfig,
    pub proxy_config: ProxyConfig,
    pub metrics_config: MetricsConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpstreamService {
    pub name: String,
    pub endpoints: Vec<String>,
    pub health_check_path: String,
    pub timeout_ms: u64,
    pub max_retries: u32,
    pub circuit_breaker_threshold: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub enabled: bool,
    pub decision_threshold: f64,
    pub learning_rate: f64,
    pub model_update_interval_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    pub max_connections: usize,
    pub connection_timeout_ms: u64,
    pub request_timeout_ms: u64,
    pub buffer_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsConfig {
    pub enabled: bool,
    pub port: u16,
    pub path: String,
}

impl Config {
    pub fn new() -> Self {
        let mut upstream_services = HashMap::new();
        
        upstream_services.insert("service-a".to_string(), UpstreamService {
            name: "service-a".to_string(),
            endpoints: vec!["http://localhost:3001".to_string()],
            health_check_path: "/health".to_string(),
            timeout_ms: 5000,
            max_retries: 3,
            circuit_breaker_threshold: 5,
        });
        
        upstream_services.insert("service-b".to_string(), UpstreamService {
            name: "service-b".to_string(),
            endpoints: vec!["http://localhost:3002".to_string()],
            health_check_path: "/health".to_string(),
            timeout_ms: 5000,
            max_retries: 3,
            circuit_breaker_threshold: 5,
        });

        Self {
            upstream_services,
            ai_config: AIConfig {
                enabled: true,
                decision_threshold: 0.7,
                learning_rate: 0.01,
                model_update_interval_ms: 60000,
            },
            proxy_config: ProxyConfig {
                max_connections: 10000,
                connection_timeout_ms: 30000,
                request_timeout_ms: 30000,
                buffer_size: 8192,
            },
            metrics_config: MetricsConfig {
                enabled: true,
                port: 9090,
                path: "/metrics".to_string(),
            },
        }
    }
}
