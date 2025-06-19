use ai_sidecar_proxy::{
    config::Config,
    proxy::ProxyServer,
    ai::AIEngine,
    metrics::MetricsCollector,
};
use clap::Parser;
use tracing::{info, error};
use std::sync::Arc;

#[derive(Parser)]
#[command(name = "ai-sidecar-proxy")]
#[command(about = "High-performance AI-driven sidecar proxy")]
struct Args {
    #[arg(short, long, default_value = "8080")]
    port: u16,
    
    #[arg(short, long, default_value = "0.0.0.0")]
    bind: String,
    
    #[arg(long, default_value = "info")]
    log_level: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    
    tracing_subscriber::fmt()
        .with_env_filter(&args.log_level)
        .init();

    info!("Starting AI Sidecar Proxy v{}", env!("CARGO_PKG_VERSION"));
    
    let config = Config::new();
    let ai_engine = Arc::new(AIEngine::new());
    let metrics = Arc::new(MetricsCollector::new());
    
    let proxy = ProxyServer::new(config, ai_engine, metrics);
    
    info!("Proxy server listening on {}:{}", args.bind, args.port);
    
    if let Err(e) = proxy.run(&args.bind, args.port).await {
        error!("Proxy server error: {}", e);
        return Err(e);
    }
    
    Ok(())
}
