use crate::{
    config::{Config, UpstreamService},
    ai::{AIEngine, RequestMetrics},
    metrics::MetricsCollector,
    load_balancer::LoadBalancer,
    circuit_breaker::CircuitBreaker,
    health_checker::HealthChecker,
};

use hyper::{
    body::Incoming, 
    service::service_fn, 
    Request, 
    Response, 
    StatusCode,
    Method,
};
use hyper_util::{
    rt::{TokioIo, TokioExecutor},
    server::conn::auto::Builder as ServerBuilder,
};
use http_body_util::{BodyExt, Full};
use bytes::Bytes;
use std::{
    collections::HashMap,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH, Instant},
    net::SocketAddr,
};
use tokio::net::TcpListener;
use tracing::{info, error, warn, debug};
use anyhow::Result;

type BoxBody = http_body_util::combinators::BoxBody<Bytes, hyper::Error>;

pub struct ProxyServer {
    config: Config,
    ai_engine: Arc<AIEngine>,
    metrics: Arc<MetricsCollector>,
    load_balancer: Arc<LoadBalancer>,
    circuit_breakers: Arc<HashMap<String, CircuitBreaker>>,
    health_checker: Arc<HealthChecker>,
}

impl ProxyServer {
    pub fn new(
        config: Config,
        ai_engine: Arc<AIEngine>,
        metrics: Arc<MetricsCollector>,
    ) -> Self {
        let load_balancer = Arc::new(LoadBalancer::new());
        
        let mut circuit_breakers = HashMap::new();
        for (service_name, service_config) in &config.upstream_services {
            circuit_breakers.insert(
                service_name.clone(),
                CircuitBreaker::new(service_config.circuit_breaker_threshold),
            );
        }
        let circuit_breakers = Arc::new(circuit_breakers);
        
        let health_checker = Arc::new(HealthChecker::new(
            config.upstream_services.clone(),
            ai_engine.clone(),
        ));

        Self {
            config,
            ai_engine,
            metrics,
            load_balancer,
            circuit_breakers,
            health_checker,
        }
    }

    pub async fn run(&self, bind_addr: &str, port: u16) -> Result<()> {
        let addr: SocketAddr = format!("{}:{}", bind_addr, port).parse()?;
        let listener = TcpListener::bind(addr).await?;
        
        self.health_checker.start_health_checks().await;
        
        info!("AI Sidecar Proxy listening on {}", addr);

        loop {
            let (stream, remote_addr) = listener.accept().await?;
            let io = TokioIo::new(stream);

            let config = self.config.clone();
            let ai_engine = self.ai_engine.clone();
            let metrics = self.metrics.clone();
            let load_balancer = self.load_balancer.clone();
            let circuit_breakers = self.circuit_breakers.clone();

            tokio::task::spawn(async move {
                let service = service_fn(move |req| {
                    Self::handle_request(
                        req,
                        config.clone(),
                        ai_engine.clone(),
                        metrics.clone(),
                        load_balancer.clone(),
                        circuit_breakers.clone(),
                        remote_addr,
                    )
                });

                let builder = ServerBuilder::new(TokioExecutor::new());
                
                if let Err(err) = builder.serve_connection(io, service).await {
                    error!("Error serving connection from {}: {}", remote_addr, err);
                }
            });
        }
    }

    async fn handle_request(
        req: Request<Incoming>,
        config: Config,
        ai_engine: Arc<AIEngine>,
        metrics: Arc<MetricsCollector>,
        load_balancer: Arc<LoadBalancer>,
        circuit_breakers: Arc<HashMap<String, CircuitBreaker>>,
        remote_addr: SocketAddr,
    ) -> Result<Response<BoxBody>, hyper::Error> {
        let start_time = Instant::now();
        let method = req.method().clone();
        let uri = req.uri().clone();
        let path = uri.path();

        debug!("Handling request: {} {} from {}", method, path, remote_addr);

        if path == "/health" {
            return Ok(Self::health_response());
        }

        if path == "/metrics" {
            return Ok(Self::metrics_response(&metrics).await);
        }

        if path.starts_with("/admin") {
            return Self::admin_handler(req, &ai_engine).await;
        }

        let service_name = Self::extract_service_name(path);
        
        if let Some(upstream_service) = config.upstream_services.get(&service_name) {
            Self::proxy_request(
                req,
                upstream_service,
                &ai_engine,
                &metrics,
                &load_balancer,
                &circuit_breakers,
                start_time,
            ).await
        } else {
            warn!("No upstream service found for path: {}", path);
            Ok(Self::error_response(StatusCode::NOT_FOUND, "Service not found"))
        }
    }

    fn extract_service_name(path: &str) -> String {
        let parts: Vec<&str> = path.trim_start_matches('/').split('/').collect();
        if parts.is_empty() {
            "default".to_string()
        } else {
            match parts[0] {
                "api" if parts.len() > 1 => format!("service-{}", parts[1]),
                _ => "service-a".to_string(),
            }
        }
    }

    async fn proxy_request(
        mut req: Request<Incoming>,
        upstream_service: &UpstreamService,
        ai_engine: &Arc<AIEngine>,
        metrics: &Arc<MetricsCollector>,
        load_balancer: &Arc<LoadBalancer>,
        circuit_breakers: &Arc<HashMap<String, CircuitBreaker>>,
        start_time: Instant,
    ) -> Result<Response<BoxBody>, hyper::Error> {
        let service_name = &upstream_service.name;
        
        if let Some(circuit_breaker) = circuit_breakers.get(service_name) {
            if circuit_breaker.is_open().await {
                warn!("Circuit breaker is open for service: {}", service_name);
                return Ok(Self::error_response(StatusCode::SERVICE_UNAVAILABLE, "Service temporarily unavailable"));
            }
        }

        let ai_decision = ai_engine
            .select_endpoint(service_name, &upstream_service.endpoints)
            .await;

        if ai_decision.selected_endpoint.is_empty() {
            error!("No available endpoints for service: {}", service_name);
            return Ok(Self::error_response(StatusCode::SERVICE_UNAVAILABLE, "No available endpoints"));
        }

        info!("AI selected endpoint: {} (confidence: {:.3})", ai_decision.selected_endpoint, ai_decision.confidence);

        let timeout = ai_engine.adaptive_timeout(&ai_decision.selected_endpoint).await;
        
        let client = match reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(timeout))
            .build() {
            Ok(client) => client,
            Err(e) => {
                error!("Failed to create HTTP client: {}", e);
                return Ok(Self::error_response(StatusCode::INTERNAL_SERVER_ERROR, "Failed to create HTTP client"));
            }
        };

        let method = req.method().clone();
        let uri = req.uri().clone();
        let headers = req.headers().clone();
        
        let body_bytes = req.collect().await?.to_bytes();
        
        let upstream_url = format!("{}{}", ai_decision.selected_endpoint, uri.path_and_query().map(|pq| pq.as_str()).unwrap_or(""));
        
        let reqwest_method = match method {
            hyper::Method::GET => reqwest::Method::GET,
            hyper::Method::POST => reqwest::Method::POST,
            hyper::Method::PUT => reqwest::Method::PUT,
            hyper::Method::DELETE => reqwest::Method::DELETE,
            hyper::Method::HEAD => reqwest::Method::HEAD,
            hyper::Method::OPTIONS => reqwest::Method::OPTIONS,
            hyper::Method::PATCH => reqwest::Method::PATCH,
            _ => reqwest::Method::GET,
        };
        
        let mut upstream_req = client.request(reqwest_method, &upstream_url);
        
        for (name, value) in headers.iter() {
            if name != "host" && name != "content-length" {
                if let Ok(value_str) = value.to_str() {
                    upstream_req = upstream_req.header(name.as_str(), value_str);
                }
            }
        }
        
        if !body_bytes.is_empty() {
            upstream_req = upstream_req.body(body_bytes.to_vec());
        }

        let response_result = upstream_req.send().await;
        let elapsed = start_time.elapsed();

        let (status_code, success, response_body) = match response_result {
            Ok(resp) => {
                let status = resp.status();
                let success = status.is_success();
                let body_bytes = resp.bytes().await.unwrap_or_default();
                (status.as_u16(), success, body_bytes)
            }
            Err(e) => {
                error!("Upstream request failed: {}", e);
                (503, false, Bytes::from("Upstream service unavailable"))
            }
        };

        let request_metrics = RequestMetrics {
            latency_ms: elapsed.as_millis() as u64,
            status_code,
            endpoint: ai_decision.selected_endpoint.clone(),
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
            success,
        };

        ai_engine.record_request(request_metrics).await;
        metrics.record_request(&ai_decision.selected_endpoint, elapsed.as_millis() as u64, success).await;

        if let Some(circuit_breaker) = circuit_breakers.get(service_name) {
            if success {
                circuit_breaker.record_success().await;
            } else {
                circuit_breaker.record_failure().await;
            }
        }

        let mut response = Response::builder()
            .status(status_code)
            .body(Self::full(response_body))
            .unwrap();

        response.headers_mut().insert("x-proxy-endpoint", ai_decision.selected_endpoint.parse().unwrap());
        response.headers_mut().insert("x-proxy-confidence", ai_decision.confidence.to_string().parse().unwrap());

        Ok(response)
    }

    async fn admin_handler(
        req: Request<Incoming>,
        ai_engine: &Arc<AIEngine>,
    ) -> Result<Response<BoxBody>, hyper::Error> {
        let path = req.uri().path();
        
        match path {
            "/admin/health" => {
                let health_data = ai_engine.get_all_service_health().await;
                let json = serde_json::to_string_pretty(&health_data).unwrap_or_else(|_| "{}".to_string());
                Ok(Response::builder()
                    .status(StatusCode::OK)
                    .header("content-type", "application/json")
                    .body(Self::full(json))
                    .unwrap())
            }
            "/admin/status" => {
                let status = serde_json::json!({
                    "status": "healthy",
                    "version": env!("CARGO_PKG_VERSION"),
                    "uptime": "running"
                });
                Ok(Response::builder()
                    .status(StatusCode::OK)
                    .header("content-type", "application/json")
                    .body(Self::full(status.to_string()))
                    .unwrap())
            }
            _ => Ok(Self::error_response(StatusCode::NOT_FOUND, "Admin endpoint not found"))
        }
    }

    fn health_response() -> Response<BoxBody> {
        Response::builder()
            .status(StatusCode::OK)
            .header("content-type", "application/json")
            .body(Self::full(r#"{"status":"healthy"}"#))
            .unwrap()
    }

    async fn metrics_response(metrics: &Arc<MetricsCollector>) -> Response<BoxBody> {
        let metrics_data = metrics.get_prometheus_metrics().await;
        Response::builder()
            .status(StatusCode::OK)
            .header("content-type", "text/plain")
            .body(Self::full(metrics_data))
            .unwrap()
    }

    fn error_response(status: StatusCode, message: &str) -> Response<BoxBody> {
        let error_json = serde_json::json!({
            "error": message,
            "status": status.as_u16()
        });
        
        Response::builder()
            .status(status)
            .header("content-type", "application/json")
            .body(Self::full(error_json.to_string()))
            .unwrap()
    }

    fn full<T: Into<Bytes>>(chunk: T) -> BoxBody {
        Full::new(chunk.into())
            .map_err(|never| match never {})
            .boxed()
    }
}
