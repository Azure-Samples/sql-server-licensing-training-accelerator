use std::sync::atomic::{AtomicU32, AtomicBool, Ordering};
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use tracing::{info, warn};

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CircuitBreakerState {
    Closed,
    Open,
    HalfOpen,
}

pub struct CircuitBreaker {
    state: RwLock<CircuitBreakerState>,
    failure_count: AtomicU32,
    success_count: AtomicU32,
    last_failure_time: RwLock<Option<Instant>>,
    failure_threshold: u32,
    timeout: Duration,
    half_open_max_calls: u32,
    half_open_success_threshold: u32,
}

impl CircuitBreaker {
    pub fn new(failure_threshold: u32) -> Self {
        Self {
            state: RwLock::new(CircuitBreakerState::Closed),
            failure_count: AtomicU32::new(0),
            success_count: AtomicU32::new(0),
            last_failure_time: RwLock::new(None),
            failure_threshold,
            timeout: Duration::from_secs(60),
            half_open_max_calls: 5,
            half_open_success_threshold: 3,
        }
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    pub async fn is_open(&self) -> bool {
        let state = *self.state.read().await;
        
        match state {
            CircuitBreakerState::Open => {
                if self.should_attempt_reset().await {
                    self.transition_to_half_open().await;
                    false
                } else {
                    true
                }
            }
            CircuitBreakerState::HalfOpen => false,
            CircuitBreakerState::Closed => false,
        }
    }

    pub async fn record_success(&self) {
        let current_state = *self.state.read().await;
        
        match current_state {
            CircuitBreakerState::Closed => {
                self.failure_count.store(0, Ordering::Relaxed);
            }
            CircuitBreakerState::HalfOpen => {
                let success_count = self.success_count.fetch_add(1, Ordering::Relaxed) + 1;
                
                if success_count >= self.half_open_success_threshold {
                    self.transition_to_closed().await;
                }
            }
            CircuitBreakerState::Open => {
            }
        }
    }

    pub async fn record_failure(&self) {
        let current_state = *self.state.read().await;
        
        match current_state {
            CircuitBreakerState::Closed => {
                let failure_count = self.failure_count.fetch_add(1, Ordering::Relaxed) + 1;
                *self.last_failure_time.write().await = Some(Instant::now());
                
                if failure_count >= self.failure_threshold {
                    self.transition_to_open().await;
                }
            }
            CircuitBreakerState::HalfOpen => {
                self.transition_to_open().await;
            }
            CircuitBreakerState::Open => {
                *self.last_failure_time.write().await = Some(Instant::now());
            }
        }
    }

    async fn should_attempt_reset(&self) -> bool {
        if let Some(last_failure) = *self.last_failure_time.read().await {
            last_failure.elapsed() >= self.timeout
        } else {
            false
        }
    }

    async fn transition_to_open(&self) {
        let mut state = self.state.write().await;
        if *state != CircuitBreakerState::Open {
            *state = CircuitBreakerState::Open;
            warn!("Circuit breaker transitioned to OPEN state");
        }
    }

    async fn transition_to_half_open(&self) {
        let mut state = self.state.write().await;
        if *state == CircuitBreakerState::Open {
            *state = CircuitBreakerState::HalfOpen;
            self.success_count.store(0, Ordering::Relaxed);
            info!("Circuit breaker transitioned to HALF-OPEN state");
        }
    }

    async fn transition_to_closed(&self) {
        let mut state = self.state.write().await;
        *state = CircuitBreakerState::Closed;
        self.failure_count.store(0, Ordering::Relaxed);
        self.success_count.store(0, Ordering::Relaxed);
        info!("Circuit breaker transitioned to CLOSED state");
    }

    pub async fn get_state(&self) -> CircuitBreakerState {
        *self.state.read().await
    }

    pub fn get_failure_count(&self) -> u32 {
        self.failure_count.load(Ordering::Relaxed)
    }

    pub fn get_success_count(&self) -> u32 {
        self.success_count.load(Ordering::Relaxed)
    }
}
