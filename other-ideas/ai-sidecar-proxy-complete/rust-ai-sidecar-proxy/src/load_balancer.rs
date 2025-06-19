use std::sync::atomic::{AtomicUsize, Ordering};
use std::collections::HashMap;
use tokio::sync::RwLock;
use tracing::debug;

#[derive(Debug, Clone)]
pub enum LoadBalancingStrategy {
    RoundRobin,
    WeightedRoundRobin,
    LeastConnections,
    Random,
}

pub struct LoadBalancer {
    strategy: LoadBalancingStrategy,
    round_robin_counters: RwLock<HashMap<String, AtomicUsize>>,
    connection_counts: RwLock<HashMap<String, AtomicUsize>>,
}

impl LoadBalancer {
    pub fn new() -> Self {
        Self {
            strategy: LoadBalancingStrategy::RoundRobin,
            round_robin_counters: RwLock::new(HashMap::new()),
            connection_counts: RwLock::new(HashMap::new()),
        }
    }

    pub fn with_strategy(strategy: LoadBalancingStrategy) -> Self {
        Self {
            strategy,
            round_robin_counters: RwLock::new(HashMap::new()),
            connection_counts: RwLock::new(HashMap::new()),
        }
    }

    pub async fn select_endpoint(&self, service_name: &str, endpoints: &[String]) -> Option<String> {
        if endpoints.is_empty() {
            return None;
        }

        match self.strategy {
            LoadBalancingStrategy::RoundRobin => {
                self.round_robin_select(service_name, endpoints).await
            }
            LoadBalancingStrategy::WeightedRoundRobin => {
                self.weighted_round_robin_select(service_name, endpoints).await
            }
            LoadBalancingStrategy::LeastConnections => {
                self.least_connections_select(endpoints).await
            }
            LoadBalancingStrategy::Random => {
                self.random_select(endpoints).await
            }
        }
    }

    async fn round_robin_select(&self, service_name: &str, endpoints: &[String]) -> Option<String> {
        let mut counters = self.round_robin_counters.write().await;
        let counter = counters.entry(service_name.to_string())
            .or_insert_with(|| AtomicUsize::new(0));
        
        let index = counter.fetch_add(1, Ordering::Relaxed) % endpoints.len();
        let selected = endpoints[index].clone();
        
        debug!("Round-robin selected endpoint: {} (index: {})", selected, index);
        Some(selected)
    }

    async fn weighted_round_robin_select(&self, service_name: &str, endpoints: &[String]) -> Option<String> {
        self.round_robin_select(service_name, endpoints).await
    }

    async fn least_connections_select(&self, endpoints: &[String]) -> Option<String> {
        let connection_counts = self.connection_counts.read().await;
        
        let mut min_connections = usize::MAX;
        let mut selected_endpoint = None;
        
        for endpoint in endpoints {
            let count = connection_counts.get(endpoint)
                .map(|c| c.load(Ordering::Relaxed))
                .unwrap_or(0);
            
            if count < min_connections {
                min_connections = count;
                selected_endpoint = Some(endpoint.clone());
            }
        }
        
        if let Some(ref endpoint) = selected_endpoint {
            debug!("Least connections selected endpoint: {} (connections: {})", endpoint, min_connections);
        }
        
        selected_endpoint
    }

    async fn random_select(&self, endpoints: &[String]) -> Option<String> {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        use std::time::{SystemTime, UNIX_EPOCH};
        
        let mut hasher = DefaultHasher::new();
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos().hash(&mut hasher);
        let hash = hasher.finish();
        
        let index = (hash as usize) % endpoints.len();
        let selected = endpoints[index].clone();
        
        debug!("Random selected endpoint: {} (index: {})", selected, index);
        Some(selected)
    }

    pub async fn increment_connections(&self, endpoint: &str) {
        let mut connection_counts = self.connection_counts.write().await;
        let counter = connection_counts.entry(endpoint.to_string())
            .or_insert_with(|| AtomicUsize::new(0));
        counter.fetch_add(1, Ordering::Relaxed);
    }

    pub async fn decrement_connections(&self, endpoint: &str) {
        let connection_counts = self.connection_counts.read().await;
        if let Some(counter) = connection_counts.get(endpoint) {
            counter.fetch_sub(1, Ordering::Relaxed);
        }
    }

    pub async fn get_connection_count(&self, endpoint: &str) -> usize {
        let connection_counts = self.connection_counts.read().await;
        connection_counts.get(endpoint)
            .map(|c| c.load(Ordering::Relaxed))
            .unwrap_or(0)
    }
}
