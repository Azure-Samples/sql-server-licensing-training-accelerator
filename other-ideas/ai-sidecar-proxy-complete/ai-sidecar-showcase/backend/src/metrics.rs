use prometheus::{Counter, Histogram, Gauge, Registry, Encoder, TextEncoder};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::debug;

pub struct MetricsCollector {
    registry: Registry,
    request_counter: Counter,
    request_duration: Histogram,
    active_connections: Gauge,
    endpoint_metrics: Arc<RwLock<HashMap<String, EndpointMetrics>>>,
}

#[derive(Debug, Clone)]
struct EndpointMetrics {
    total_requests: u64,
    successful_requests: u64,
    failed_requests: u64,
    avg_latency_ms: f64,
    last_request_time: u64,
}

impl MetricsCollector {
    pub fn new() -> Self {
        let registry = Registry::new();
        
        let request_counter = Counter::new(
            "proxy_requests_total",
            "Total number of requests processed by the proxy"
        ).unwrap();
        
        let request_duration = Histogram::with_opts(
            prometheus::HistogramOpts::new(
                "proxy_request_duration_seconds",
                "Request duration in seconds"
            ).buckets(vec![0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0])
        ).unwrap();
        
        let active_connections = Gauge::new(
            "proxy_active_connections",
            "Number of active connections"
        ).unwrap();

        registry.register(Box::new(request_counter.clone())).unwrap();
        registry.register(Box::new(request_duration.clone())).unwrap();
        registry.register(Box::new(active_connections.clone())).unwrap();

        Self {
            registry,
            request_counter,
            request_duration,
            active_connections,
            endpoint_metrics: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn record_request(&self, endpoint: &str, latency_ms: u64, success: bool) {
        self.request_counter.inc();
        self.request_duration.observe(latency_ms as f64 / 1000.0);
        
        let mut metrics = self.endpoint_metrics.write().await;
        let endpoint_metric = metrics.entry(endpoint.to_string()).or_insert(EndpointMetrics {
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            avg_latency_ms: 0.0,
            last_request_time: 0,
        });

        endpoint_metric.total_requests += 1;
        
        if success {
            endpoint_metric.successful_requests += 1;
        } else {
            endpoint_metric.failed_requests += 1;
        }

        let alpha = 0.1;
        endpoint_metric.avg_latency_ms = alpha * latency_ms as f64 + (1.0 - alpha) * endpoint_metric.avg_latency_ms;
        endpoint_metric.last_request_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        debug!("Recorded metrics for endpoint {}: latency={}ms, success={}", endpoint, latency_ms, success);
    }

    pub fn increment_connections(&self) {
        self.active_connections.inc();
    }

    pub fn decrement_connections(&self) {
        self.active_connections.dec();
    }

    pub async fn get_prometheus_metrics(&self) -> String {
        let encoder = TextEncoder::new();
        let metric_families = self.registry.gather();
        
        let mut buffer = Vec::new();
        encoder.encode(&metric_families, &mut buffer).unwrap();
        
        let mut result = String::from_utf8(buffer).unwrap();
        
        let endpoint_metrics = self.endpoint_metrics.read().await;
        for (endpoint, metrics) in endpoint_metrics.iter() {
            result.push_str(&format!(
                "# HELP proxy_endpoint_requests_total Total requests per endpoint\n"
            ));
            result.push_str(&format!(
                "# TYPE proxy_endpoint_requests_total counter\n"
            ));
            result.push_str(&format!(
                "proxy_endpoint_requests_total{{endpoint=\"{}\"}} {}\n",
                endpoint, metrics.total_requests
            ));
            
            result.push_str(&format!(
                "# HELP proxy_endpoint_success_rate Success rate per endpoint\n"
            ));
            result.push_str(&format!(
                "# TYPE proxy_endpoint_success_rate gauge\n"
            ));
            let success_rate = if metrics.total_requests > 0 {
                metrics.successful_requests as f64 / metrics.total_requests as f64
            } else {
                0.0
            };
            result.push_str(&format!(
                "proxy_endpoint_success_rate{{endpoint=\"{}\"}} {:.4}\n",
                endpoint, success_rate
            ));
            
            result.push_str(&format!(
                "# HELP proxy_endpoint_avg_latency_ms Average latency per endpoint in milliseconds\n"
            ));
            result.push_str(&format!(
                "# TYPE proxy_endpoint_avg_latency_ms gauge\n"
            ));
            result.push_str(&format!(
                "proxy_endpoint_avg_latency_ms{{endpoint=\"{}\"}} {:.2}\n",
                endpoint, metrics.avg_latency_ms
            ));
        }
        
        result
    }

    pub async fn get_endpoint_stats(&self) -> HashMap<String, EndpointMetrics> {
        let metrics = self.endpoint_metrics.read().await;
        metrics.clone()
    }
}
