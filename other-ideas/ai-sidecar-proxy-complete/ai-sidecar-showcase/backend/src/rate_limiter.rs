use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use tracing::debug;

#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    pub requests_per_second: u32,
    pub burst_size: u32,
    pub window_size: Duration,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            requests_per_second: 100,
            burst_size: 10,
            window_size: Duration::from_secs(1),
        }
    }
}

#[derive(Debug)]
struct TokenBucket {
    tokens: f64,
    last_refill: Instant,
    capacity: f64,
    refill_rate: f64,
}

impl TokenBucket {
    fn new(capacity: f64, refill_rate: f64) -> Self {
        Self {
            tokens: capacity,
            last_refill: Instant::now(),
            capacity,
            refill_rate,
        }
    }

    fn try_consume(&mut self, tokens: f64) -> bool {
        self.refill();
        
        if self.tokens >= tokens {
            self.tokens -= tokens;
            true
        } else {
            false
        }
    }

    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        
        let tokens_to_add = elapsed * self.refill_rate;
        self.tokens = (self.tokens + tokens_to_add).min(self.capacity);
        self.last_refill = now;
    }

    fn available_tokens(&self) -> f64 {
        self.tokens
    }
}

pub struct RateLimiter {
    buckets: Arc<RwLock<HashMap<String, TokenBucket>>>,
    config: RateLimitConfig,
}

impl RateLimiter {
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            buckets: Arc::new(RwLock::new(HashMap::new())),
            config,
        }
    }

    pub async fn is_allowed(&self, key: &str) -> bool {
        self.is_allowed_n(key, 1.0).await
    }

    pub async fn is_allowed_n(&self, key: &str, tokens: f64) -> bool {
        let mut buckets = self.buckets.write().await;
        
        let bucket = buckets.entry(key.to_string()).or_insert_with(|| {
            TokenBucket::new(
                self.config.burst_size as f64,
                self.config.requests_per_second as f64,
            )
        });

        let allowed = bucket.try_consume(tokens);
        
        debug!(
            "Rate limit check for {}: {} (tokens: {:.1}, available: {:.1})",
            key,
            if allowed { "ALLOWED" } else { "DENIED" },
            tokens,
            bucket.available_tokens()
        );

        allowed
    }

    pub async fn get_remaining_tokens(&self, key: &str) -> f64 {
        let buckets = self.buckets.read().await;
        buckets.get(key)
            .map(|bucket| bucket.available_tokens())
            .unwrap_or(self.config.burst_size as f64)
    }

    pub async fn reset_bucket(&self, key: &str) {
        let mut buckets = self.buckets.write().await;
        buckets.remove(key);
    }

    pub async fn cleanup_expired_buckets(&self) {
        let mut buckets = self.buckets.write().await;
        let now = Instant::now();
        
        buckets.retain(|_, bucket| {
            now.duration_since(bucket.last_refill) < Duration::from_secs(300)
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::{sleep, Duration};

    #[tokio::test]
    async fn test_rate_limiter_basic() {
        let config = RateLimitConfig {
            requests_per_second: 2,
            burst_size: 5,
            window_size: Duration::from_secs(1),
        };
        
        let limiter = RateLimiter::new(config);
        
        for _ in 0..5 {
            assert!(limiter.is_allowed("test").await);
        }
        
        assert!(!limiter.is_allowed("test").await);
    }

    #[tokio::test]
    async fn test_rate_limiter_refill() {
        let config = RateLimitConfig {
            requests_per_second: 10,
            burst_size: 1,
            window_size: Duration::from_secs(1),
        };
        
        let limiter = RateLimiter::new(config);
        
        assert!(limiter.is_allowed("test").await);
        assert!(!limiter.is_allowed("test").await);
        
        sleep(Duration::from_millis(200)).await;
        
        assert!(limiter.is_allowed("test").await);
    }
}
