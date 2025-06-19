use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use tracing::{info, debug, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestMetrics {
    pub latency_ms: u64,
    pub status_code: u16,
    pub endpoint: String,
    pub timestamp: u64,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceHealth {
    pub endpoint: String,
    pub success_rate: f64,
    pub avg_latency_ms: f64,
    pub error_count: u32,
    pub total_requests: u32,
    pub last_updated: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIDecision {
    pub selected_endpoint: String,
    pub confidence: f64,
    pub reasoning: String,
    pub fallback_endpoints: Vec<String>,
}

pub struct AIEngine {
    service_metrics: Arc<RwLock<HashMap<String, ServiceHealth>>>,
    request_history: Arc<RwLock<Vec<RequestMetrics>>>,
    learning_weights: Arc<RwLock<HashMap<String, f64>>>,
}

impl AIEngine {
    pub fn new() -> Self {
        Self {
            service_metrics: Arc::new(RwLock::new(HashMap::new())),
            request_history: Arc::new(RwLock::new(Vec::new())),
            learning_weights: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn record_request(&self, metrics: RequestMetrics) {
        let mut history = self.request_history.write().await;
        history.push(metrics.clone());
        
        if history.len() > 10000 {
            history.drain(0..1000);
        }

        self.update_service_health(&metrics).await;
        debug!("Recorded request metrics for endpoint: {}", metrics.endpoint);
    }

    async fn update_service_health(&self, metrics: &RequestMetrics) {
        let mut service_metrics = self.service_metrics.write().await;
        
        let health = service_metrics
            .entry(metrics.endpoint.clone())
            .or_insert(ServiceHealth {
                endpoint: metrics.endpoint.clone(),
                success_rate: 1.0,
                avg_latency_ms: 0.0,
                error_count: 0,
                total_requests: 0,
                last_updated: metrics.timestamp,
            });

        health.total_requests += 1;
        
        if !metrics.success {
            health.error_count += 1;
        }
        
        health.success_rate = 1.0 - (health.error_count as f64 / health.total_requests as f64);
        
        let alpha = 0.1;
        health.avg_latency_ms = alpha * metrics.latency_ms as f64 + (1.0 - alpha) * health.avg_latency_ms;
        health.last_updated = metrics.timestamp;
    }

    pub async fn select_endpoint(&self, service_name: &str, available_endpoints: &[String]) -> AIDecision {
        if available_endpoints.is_empty() {
            return AIDecision {
                selected_endpoint: "".to_string(),
                confidence: 0.0,
                reasoning: "No available endpoints".to_string(),
                fallback_endpoints: vec![],
            };
        }

        let service_metrics = self.service_metrics.read().await;
        let mut endpoint_scores = HashMap::new();

        for endpoint in available_endpoints {
            let score = if let Some(health) = service_metrics.get(endpoint) {
                self.calculate_endpoint_score(health).await
            } else {
                0.5
            };
            endpoint_scores.insert(endpoint.clone(), score);
        }

        let best_endpoint = endpoint_scores
            .iter()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
            .map(|(endpoint, score)| (endpoint.clone(), *score))
            .unwrap_or_else(|| (available_endpoints[0].clone(), 0.5));

        let mut fallback_with_scores: Vec<(String, f64)> = endpoint_scores
            .iter()
            .filter(|(endpoint, _)| *endpoint != &best_endpoint.0)
            .map(|(endpoint, score)| (endpoint.clone(), *score))
            .collect::<Vec<_>>();
        
        fallback_with_scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        let fallback_endpoints: Vec<String> = fallback_with_scores.into_iter().map(|(endpoint, _)| endpoint).collect();

        let reasoning = format!(
            "Selected {} with score {:.3} based on success rate and latency analysis",
            best_endpoint.0, best_endpoint.1
        );

        info!("AI decision for {}: {} (confidence: {:.3})", service_name, best_endpoint.0, best_endpoint.1);

        AIDecision {
            selected_endpoint: best_endpoint.0,
            confidence: best_endpoint.1,
            reasoning,
            fallback_endpoints,
        }
    }

    async fn calculate_endpoint_score(&self, health: &ServiceHealth) -> f64 {
        let success_weight = 0.6;
        let latency_weight = 0.4;
        
        let success_score = health.success_rate;
        
        let normalized_latency = if health.avg_latency_ms > 0.0 {
            1.0 / (1.0 + health.avg_latency_ms / 1000.0)
        } else {
            1.0
        };
        
        let score = success_weight * success_score + latency_weight * normalized_latency;
        score.min(1.0).max(0.0)
    }

    pub async fn get_service_health(&self, endpoint: &str) -> Option<ServiceHealth> {
        let service_metrics = self.service_metrics.read().await;
        service_metrics.get(endpoint).cloned()
    }

    pub async fn get_all_service_health(&self) -> HashMap<String, ServiceHealth> {
        let service_metrics = self.service_metrics.read().await;
        service_metrics.clone()
    }

    pub async fn should_circuit_break(&self, endpoint: &str, threshold: u32) -> bool {
        if let Some(health) = self.get_service_health(endpoint).await {
            health.error_count >= threshold && health.success_rate < 0.5
        } else {
            false
        }
    }

    pub async fn adaptive_timeout(&self, endpoint: &str) -> u64 {
        if let Some(health) = self.get_service_health(endpoint).await {
            let base_timeout = 5000u64;
            let adaptive_factor = if health.avg_latency_ms > 0.0 {
                (health.avg_latency_ms * 2.0) as u64
            } else {
                base_timeout
            };
            adaptive_factor.max(base_timeout).min(30000)
        } else {
            5000
        }
    }
}
