use crate::{config::UpstreamService, ai::AIEngine};
use std::{collections::HashMap, sync::Arc, time::Duration};
use tokio::{sync::RwLock, time::interval};
use tracing::{info, warn, error, debug};
use reqwest::Client;

#[derive(Debug, Clone)]
pub struct HealthStatus {
    pub endpoint: String,
    pub is_healthy: bool,
    pub last_check: u64,
    pub response_time_ms: u64,
    pub consecutive_failures: u32,
    pub consecutive_successes: u32,
}

pub struct HealthChecker {
    services: HashMap<String, UpstreamService>,
    health_status: Arc<RwLock<HashMap<String, HealthStatus>>>,
    ai_engine: Arc<AIEngine>,
    client: Client,
}

impl HealthChecker {
    pub fn new(
        services: HashMap<String, UpstreamService>,
        ai_engine: Arc<AIEngine>,
    ) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .expect("Failed to create HTTP client for health checks");

        Self {
            services,
            health_status: Arc::new(RwLock::new(HashMap::new())),
            ai_engine,
            client,
        }
    }

    pub async fn start_health_checks(&self) {
        let services = self.services.clone();
        let health_status = self.health_status.clone();
        let ai_engine = self.ai_engine.clone();
        let client = self.client.clone();

        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(30));
            
            loop {
                interval.tick().await;
                
                for (service_name, service_config) in &services {
                    for endpoint in &service_config.endpoints {
                        let health_url = format!("{}{}", endpoint, service_config.health_check_path);
                        
                        let start_time = std::time::Instant::now();
                        let is_healthy = match client.get(&health_url).send().await {
                            Ok(response) => {
                                let status = response.status();
                                let is_success = status.is_success();
                                
                                if !is_success {
                                    warn!("Health check failed for {}: HTTP {}", endpoint, status);
                                }
                                
                                is_success
                            }
                            Err(e) => {
                                warn!("Health check error for {}: {}", endpoint, e);
                                false
                            }
                        };
                        
                        let response_time = start_time.elapsed().as_millis() as u64;
                        
                        let mut status_map = health_status.write().await;
                        let status = status_map.entry(endpoint.clone()).or_insert(HealthStatus {
                            endpoint: endpoint.clone(),
                            is_healthy: true,
                            last_check: 0,
                            response_time_ms: 0,
                            consecutive_failures: 0,
                            consecutive_successes: 0,
                        });

                        status.is_healthy = is_healthy;
                        status.last_check = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs();
                        status.response_time_ms = response_time;

                        if is_healthy {
                            status.consecutive_successes += 1;
                            status.consecutive_failures = 0;
                            
                            if status.consecutive_successes == 1 {
                                info!("Endpoint {} is now healthy", endpoint);
                            }
                        } else {
                            status.consecutive_failures += 1;
                            status.consecutive_successes = 0;
                            
                            if status.consecutive_failures == 1 {
                                warn!("Endpoint {} is now unhealthy", endpoint);
                            }
                        }

                        debug!(
                            "Health check for {}: {} ({}ms, failures: {}, successes: {})",
                            endpoint,
                            if is_healthy { "HEALTHY" } else { "UNHEALTHY" },
                            response_time,
                            status.consecutive_failures,
                            status.consecutive_successes
                        );

                        let request_metrics = crate::ai::RequestMetrics {
                            latency_ms: response_time,
                            status_code: if is_healthy { 200 } else { 503 },
                            endpoint: endpoint.clone(),
                            timestamp: status.last_check,
                            success: is_healthy,
                        };
                        
                        ai_engine.record_request(request_metrics).await;
                    }
                }
            }
        });

        info!("Health checker started for {} services", self.services.len());
    }

    pub async fn get_healthy_endpoints(&self, service_name: &str) -> Vec<String> {
        if let Some(service) = self.services.get(service_name) {
            let status_map = self.health_status.read().await;
            
            service.endpoints
                .iter()
                .filter(|endpoint| {
                    status_map.get(*endpoint)
                        .map(|status| status.is_healthy)
                        .unwrap_or(true)
                })
                .cloned()
                .collect()
        } else {
            vec![]
        }
    }

    pub async fn get_health_status(&self, endpoint: &str) -> Option<HealthStatus> {
        let status_map = self.health_status.read().await;
        status_map.get(endpoint).cloned()
    }

    pub async fn get_all_health_status(&self) -> HashMap<String, HealthStatus> {
        let status_map = self.health_status.read().await;
        status_map.clone()
    }

    pub async fn is_endpoint_healthy(&self, endpoint: &str) -> bool {
        let status_map = self.health_status.read().await;
        status_map.get(endpoint)
            .map(|status| status.is_healthy)
            .unwrap_or(true)
    }

    pub async fn mark_endpoint_unhealthy(&self, endpoint: &str) {
        let mut status_map = self.health_status.write().await;
        if let Some(status) = status_map.get_mut(endpoint) {
            status.is_healthy = false;
            status.consecutive_failures += 1;
            status.consecutive_successes = 0;
            warn!("Manually marked endpoint {} as unhealthy", endpoint);
        }
    }

    pub async fn force_health_check(&self, service_name: &str) {
        if let Some(service_config) = self.services.get(service_name) {
            info!("Forcing health check for service: {}", service_name);
            
            for endpoint in &service_config.endpoints {
                let health_url = format!("{}{}", endpoint, service_config.health_check_path);
                
                let start_time = std::time::Instant::now();
                let is_healthy = match self.client.get(&health_url).send().await {
                    Ok(response) => response.status().is_success(),
                    Err(_) => false,
                };
                
                let response_time = start_time.elapsed().as_millis() as u64;
                
                let mut status_map = self.health_status.write().await;
                let status = status_map.entry(endpoint.clone()).or_insert(HealthStatus {
                    endpoint: endpoint.clone(),
                    is_healthy: true,
                    last_check: 0,
                    response_time_ms: 0,
                    consecutive_failures: 0,
                    consecutive_successes: 0,
                });

                status.is_healthy = is_healthy;
                status.last_check = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                status.response_time_ms = response_time;

                info!("Forced health check for {}: {}", endpoint, if is_healthy { "HEALTHY" } else { "UNHEALTHY" });
            }
        }
    }
}
