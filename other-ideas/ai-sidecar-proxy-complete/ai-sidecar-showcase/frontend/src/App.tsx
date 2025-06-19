import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { Activity, Shield, Brain, Server, Globe, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface ProxyMetrics {
  totalRequests: number
  successRate: number
  avgLatency: number
  activeEndpoints: number
  aiDecisions: number
  circuitBreakerTrips: number
}

interface EndpointHealth {
  endpoint: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime: number
  successRate: number
  lastCheck: string
}

interface AIDecision {
  timestamp: string
  selectedEndpoint: string
  confidence: number
  reasoning: string
  alternatives: string[]
}

interface TrafficData {
  time: string
  requests: number
  latency: number
  errors: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

function App() {
  const [metrics, setMetrics] = useState<ProxyMetrics>({
    totalRequests: 0,
    successRate: 0,
    avgLatency: 0,
    activeEndpoints: 0,
    aiDecisions: 0,
    circuitBreakerTrips: 0
  })

  const [endpointHealth, setEndpointHealth] = useState<EndpointHealth[]>([])
  const [aiDecisions, setAiDecisions] = useState<AIDecision[]>([])
  const [trafficData, setTrafficData] = useState<TrafficData[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [proxyUrl] = useState('http://localhost:8080')

  useEffect(() => {
    const mockEndpoints: EndpointHealth[] = [
      { endpoint: 'service-a-1', status: 'healthy', responseTime: 45, successRate: 99.2, lastCheck: '2 seconds ago' },
      { endpoint: 'service-a-2', status: 'healthy', responseTime: 52, successRate: 98.8, lastCheck: '1 second ago' },
      { endpoint: 'service-b-1', status: 'degraded', responseTime: 120, successRate: 95.1, lastCheck: '3 seconds ago' },
      { endpoint: 'service-b-2', status: 'unhealthy', responseTime: 0, successRate: 0, lastCheck: '30 seconds ago' },
    ]

    const mockAIDecisions: AIDecision[] = [
      {
        timestamp: '14:35:42',
        selectedEndpoint: 'service-a-1',
        confidence: 0.94,
        reasoning: 'Lowest latency with high success rate',
        alternatives: ['service-a-2', 'service-a-3']
      },
      {
        timestamp: '14:35:38',
        selectedEndpoint: 'service-a-2',
        confidence: 0.87,
        reasoning: 'Load balancing to prevent overload',
        alternatives: ['service-a-1']
      },
      {
        timestamp: '14:35:35',
        selectedEndpoint: 'service-a-1',
        confidence: 0.92,
        reasoning: 'Best performance metrics',
        alternatives: ['service-a-2', 'service-a-3']
      }
    ]

    const mockTrafficData: TrafficData[] = Array.from({ length: 20 }, (_, i) => ({
      time: `${14}:${35 - i}`,
      requests: Math.floor(Math.random() * 100) + 50,
      latency: Math.floor(Math.random() * 50) + 30,
      errors: Math.floor(Math.random() * 5)
    })).reverse()

    setEndpointHealth(mockEndpoints)
    setAiDecisions(mockAIDecisions)
    setTrafficData(mockTrafficData)
    
    setMetrics({
      totalRequests: 15847,
      successRate: 98.3,
      avgLatency: 67,
      activeEndpoints: 3,
      aiDecisions: 1247,
      circuitBreakerTrips: 2
    })

    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + Math.floor(Math.random() * 10),
        avgLatency: Math.max(30, prev.avgLatency + (Math.random() - 0.5) * 10),
        aiDecisions: prev.aiDecisions + Math.floor(Math.random() * 3)
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const testConnection = async () => {
    try {
      const response = await fetch(`${proxyUrl}/health`)
      setIsConnected(response.ok)
    } catch {
      setIsConnected(false)
    }
  }

  const sendTestTraffic = async () => {
    try {
      await fetch(`${proxyUrl}/api/test`, { method: 'POST' })
    } catch (error) {
      console.error('Failed to send test traffic:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI Sidecar Proxy
              </h1>
              <p className="text-slate-100 mt-2">Autonomous Service Mesh with AI-Driven Traffic Management</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={isConnected ? "default" : "destructive"} className="px-3 py-1">
                {isConnected ? <CheckCircle className="w-4 h-4 mr-1" /> : <AlertTriangle className="w-4 h-4 mr-1" />}
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              <Button onClick={testConnection} className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                Test Connection
              </Button>
              <Button onClick={sendTestTraffic} className="bg-gradient-to-r from-blue-500 to-purple-500">
                Send Test Traffic
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-200 text-sm">Total Requests</p>
                  <p className="text-2xl font-bold text-blue-400">{metrics.totalRequests.toLocaleString()}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-200 text-sm">Success Rate</p>
                  <p className="text-2xl font-bold text-green-400">{metrics.successRate}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-200 text-sm">Avg Latency</p>
                  <p className="text-2xl font-bold text-yellow-400">{Math.round(metrics.avgLatency)}ms</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-200 text-sm">Active Endpoints</p>
                  <p className="text-2xl font-bold text-purple-400">{metrics.activeEndpoints}</p>
                </div>
                <Server className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-200 text-sm">AI Decisions</p>
                  <p className="text-2xl font-bold text-pink-400">{metrics.aiDecisions.toLocaleString()}</p>
                </div>
                <Brain className="w-8 h-8 text-pink-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-200 text-sm">Circuit Breakers</p>
                  <p className="text-2xl font-bold text-red-400">{metrics.circuitBreakerTrips}</p>
                </div>
                <Shield className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-800/50 border-slate-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ai-decisions">AI Decisions</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoint Health</TabsTrigger>
            <TabsTrigger value="traffic">Traffic Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <TrendingUp className="w-5 h-5" />
                    Traffic Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trafficData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }} 
                      />
                      <Line type="monotone" dataKey="requests" stroke="#3B82F6" strokeWidth={2} />
                      <Line type="monotone" dataKey="latency" stroke="#F59E0B" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Endpoint Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={endpointHealth.map((endpoint, index) => ({
                          name: endpoint.endpoint,
                          value: endpoint.successRate,
                          fill: COLORS[index % COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {endpointHealth.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ai-decisions" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Brain className="w-5 h-5" />
                  Recent AI Routing Decisions
                </CardTitle>
                <CardDescription>
                  Real-time AI-driven endpoint selection with confidence scores and reasoning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {aiDecisions.map((decision, index) => (
                    <div key={index} className="border border-slate-700 rounded-lg p-4 bg-slate-900/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            {decision.timestamp}
                          </Badge>
                          <span className="font-semibold text-green-400">{decision.selectedEndpoint}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-200">Confidence:</span>
                          <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                            {(decision.confidence * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <p className="text-slate-300 mb-2">{decision.reasoning}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-200">Alternatives:</span>
                        {decision.alternatives.map((alt, altIndex) => (
                          <Badge key={altIndex} variant="outline" className="text-slate-400 border-slate-600">
                            {alt}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Server className="w-5 h-5" />
                  Endpoint Health Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {endpointHealth.map((endpoint, index) => (
                    <div key={index} className="border border-slate-700 rounded-lg p-4 bg-slate-900/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{endpoint.endpoint}</h3>
                          <Badge 
                            variant={endpoint.status === 'healthy' ? 'default' : endpoint.status === 'degraded' ? 'secondary' : 'destructive'}
                            className={
                              endpoint.status === 'healthy' ? 'bg-green-500/20 text-green-300' :
                              endpoint.status === 'degraded' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-red-500/20 text-red-300'
                            }
                          >
                            {endpoint.status.toUpperCase()}
                          </Badge>
                        </div>
                        <span className="text-sm text-slate-200">{endpoint.lastCheck}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-200">Response Time</p>
                          <p className="text-lg font-semibold text-blue-400">{endpoint.responseTime}ms</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-200">Success Rate</p>
                          <div className="flex items-center gap-2">
                            <Progress value={endpoint.successRate} className="flex-1" />
                            <span className="text-sm font-semibold text-green-400">{endpoint.successRate}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="traffic" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Globe className="w-5 h-5" />
                  Traffic Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={trafficData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="requests" fill="#3B82F6" />
                    <Bar dataKey="errors" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App
