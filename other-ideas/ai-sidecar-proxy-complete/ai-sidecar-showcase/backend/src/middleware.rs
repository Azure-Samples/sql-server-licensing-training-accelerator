use hyper::{Request, Response, StatusCode};
use http_body_util::{combinators::BoxBody, BodyExt};
use bytes::Bytes;
use std::time::Instant;
use tracing::{info, warn};
use uuid::Uuid;

pub struct RequestContext {
    pub request_id: String,
    pub start_time: Instant,
    pub client_ip: String,
    pub user_agent: Option<String>,
    pub path: String,
    pub method: String,
}

impl RequestContext {
    pub fn new<T>(req: &Request<T>, client_ip: String) -> Self {
        let request_id = Uuid::new_v4().to_string();
        let user_agent = req.headers()
            .get("user-agent")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        Self {
            request_id,
            start_time: Instant::now(),
            client_ip,
            user_agent,
            path: req.uri().path().to_string(),
            method: req.method().to_string(),
        }
    }

    pub fn elapsed(&self) -> u64 {
        self.start_time.elapsed().as_millis() as u64
    }
}

pub struct LoggingMiddleware;

impl LoggingMiddleware {
    pub fn log_request<T>(req: &Request<T>, context: &RequestContext) {
        info!(
            "Request started: {} {} {} [{}] - {}",
            context.method,
            context.path,
            context.client_ip,
            context.request_id,
            context.user_agent.as_deref().unwrap_or("unknown")
        );
    }

    pub fn log_response<T>(
        response: &Response<T>,
        context: &RequestContext,
        upstream_endpoint: Option<&str>,
    ) {
        let status = response.status();
        let elapsed = context.elapsed();
        
        let log_level = if status.is_server_error() {
            "ERROR"
        } else if status.is_client_error() {
            "WARN"
        } else {
            "INFO"
        };

        let upstream_info = upstream_endpoint
            .map(|e| format!(" -> {}", e))
            .unwrap_or_default();

        match log_level {
            "ERROR" => warn!(
                "Request completed: {} {} {} [{}] - {}ms{}",
                context.method, context.path, status, context.request_id, elapsed, upstream_info
            ),
            "WARN" => warn!(
                "Request completed: {} {} {} [{}] - {}ms{}",
                context.method, context.path, status, context.request_id, elapsed, upstream_info
            ),
            _ => info!(
                "Request completed: {} {} {} [{}] - {}ms{}",
                context.method, context.path, status, context.request_id, elapsed, upstream_info
            ),
        }
    }
}

pub struct SecurityMiddleware;

impl SecurityMiddleware {
    pub fn add_security_headers<T>(mut response: Response<T>) -> Response<T> {
        let headers = response.headers_mut();
        
        headers.insert("x-frame-options", "DENY".parse().unwrap());
        headers.insert("x-content-type-options", "nosniff".parse().unwrap());
        headers.insert("x-xss-protection", "1; mode=block".parse().unwrap());
        headers.insert(
            "strict-transport-security",
            "max-age=31536000; includeSubDomains".parse().unwrap(),
        );
        headers.insert(
            "content-security-policy",
            "default-src 'self'".parse().unwrap(),
        );
        
        response
    }

    pub fn is_request_allowed<T>(req: &Request<T>) -> bool {
        let path = req.uri().path();
        
        if path.contains("..") || path.contains("//") {
            return false;
        }
        
        if let Some(user_agent) = req.headers().get("user-agent") {
            if let Ok(ua_str) = user_agent.to_str() {
                if ua_str.to_lowercase().contains("bot") && !ua_str.contains("googlebot") {
                    return false;
                }
            }
        }
        
        true
    }
}

pub struct CorsMiddleware;

impl CorsMiddleware {
    pub fn add_cors_headers<T>(mut response: Response<T>) -> Response<T> {
        let headers = response.headers_mut();
        
        headers.insert("access-control-allow-origin", "*".parse().unwrap());
        headers.insert(
            "access-control-allow-methods",
            "GET, POST, PUT, DELETE, OPTIONS".parse().unwrap(),
        );
        headers.insert(
            "access-control-allow-headers",
            "content-type, authorization, x-requested-with".parse().unwrap(),
        );
        headers.insert("access-control-max-age", "86400".parse().unwrap());
        
        response
    }

    pub fn handle_preflight() -> Response<BoxBody<Bytes, hyper::Error>> {
        let response = Response::builder()
            .status(StatusCode::OK)
            .body(
                http_body_util::Full::new(Bytes::new())
                    .map_err(|never| match never {})
                    .boxed(),
            )
            .unwrap();
        
        Self::add_cors_headers(response)
    }
}

pub struct CompressionMiddleware;

impl CompressionMiddleware {
    pub fn should_compress<T>(req: &Request<T>, response_size: usize) -> bool {
        if response_size < 1024 {
            return false;
        }
        
        if let Some(accept_encoding) = req.headers().get("accept-encoding") {
            if let Ok(encoding_str) = accept_encoding.to_str() {
                return encoding_str.contains("gzip") || encoding_str.contains("deflate");
            }
        }
        
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use hyper::{Method, Uri};

    #[test]
    fn test_security_middleware_path_traversal() {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/../etc/passwd")
            .body(())
            .unwrap();
        
        assert!(!SecurityMiddleware::is_request_allowed(&req));
    }

    #[test]
    fn test_security_middleware_double_slash() {
        let req = Request::builder()
            .method(Method::GET)
            .uri("//admin/secret")
            .body(())
            .unwrap();
        
        assert!(!SecurityMiddleware::is_request_allowed(&req));
    }

    #[test]
    fn test_security_middleware_valid_path() {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/users")
            .body(())
            .unwrap();
        
        assert!(SecurityMiddleware::is_request_allowed(&req));
    }
}
