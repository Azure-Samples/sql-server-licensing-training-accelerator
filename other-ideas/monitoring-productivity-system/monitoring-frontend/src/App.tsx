import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Clock, Users, Activity, TrendingUp, Bell, Settings } from 'lucide-react'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface DashboardSummary {
  system_health_score: number
  total_users: number
  active_alerts: number
  high_priority_prompts: number
  recent_metrics_count: number
  productivity_trends: {
    focus_time_avg: number
    task_completion_rate: number
  }
}

interface AlertItem {
  id: string
  user_id: string
  alert_type: string
  severity: string
  message: string
  timestamp: string
  is_resolved: boolean
  suggested_actions: string[]
}

interface SelfServicePrompt {
  id: string
  user_id: string
  prompt_type: string
  title: string
  description: string
  actions: Array<{ type: string; label: string }>
  priority: string
  timestamp: string
}

interface MonitoringMetric {
  user_id: string
  metric_type: string
  value: number
  timestamp: string
  metadata: Record<string, any>
}

function App() {
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [prompts, setPrompts] = useState<SelfServicePrompt[]>([])
  const [metrics, setMetrics] = useState<MonitoringMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [availableUsers, setAvailableUsers] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [dashboardRes, alertsRes, promptsRes, metricsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/dashboard/summary`),
        fetch(`${API_BASE_URL}/api/alerts`),
        fetch(`${API_BASE_URL}/api/self-service-prompts`),
        fetch(`${API_BASE_URL}/api/monitoring/metrics`)
      ])

      const dashboardData = await dashboardRes.json()
      const alertsData = await alertsRes.json()
      const promptsData = await promptsRes.json()
      const metricsData = await metricsRes.json()

      setDashboardData(dashboardData)
      setAlerts(alertsData.alerts || [])
      setPrompts(promptsData.prompts || [])
      setMetrics(metricsData.metrics || [])
      setAvailableUsers(metricsData.users || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/alerts/${alertId}/resolve`, {
        method: 'POST'
      })
      fetchData() // Refresh data
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const handlePromptAction = async (promptId: string, actionType: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/self-service-prompts/${promptId}/action?action_type=${actionType}`, {
        method: 'POST'
      })
      setPrompts(prompts.filter(p => p.id !== promptId))
    } catch (error) {
      console.error('Error handling prompt action:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'default'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'default'
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const processMetricsForChart = () => {
    const filteredMetrics = selectedUser === 'all' 
      ? metrics 
      : metrics.filter(m => m.user_id === selectedUser)
    
    const metricsByType = filteredMetrics.reduce((acc, metric) => {
      if (!acc[metric.metric_type]) {
        acc[metric.metric_type] = []
      }
      acc[metric.metric_type].push(metric)
      return acc
    }, {} as Record<string, MonitoringMetric[]>)

    return Object.entries(metricsByType).map(([type, data]) => ({
      name: type.replace('_', ' ').toUpperCase(),
      value: data.reduce((sum, m) => sum + m.value, 0) / data.length
    }))
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading monitoring data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Productivity Monitoring System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <select 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Users</option>
                {availableUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <Settings className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getHealthScoreColor(dashboardData?.system_health_score || 0)}`}>
                {dashboardData?.system_health_score}%
              </div>
              <p className="text-xs text-muted-foreground">Overall system performance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.total_users}</div>
              <p className="text-xs text-muted-foreground">Currently monitored</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{dashboardData?.active_alerts}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Priority Prompts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{dashboardData?.high_priority_prompts}</div>
              <p className="text-xs text-muted-foreground">High priority actions</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="prompts">Self-Service</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Productivity Trends</CardTitle>
                  <CardDescription>Average focus time and task completion rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Focus Time (hours)</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {dashboardData?.productivity_trends.focus_time_avg}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Task Completion Rate</span>
                      <span className="text-2xl font-bold text-green-600">
                        {dashboardData?.productivity_trends.task_completion_rate}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Metrics Distribution</CardTitle>
                  <CardDescription>Current monitoring metrics breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={processMetricsForChart().slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value.toFixed(1)}`}
                      >
                        {processMetricsForChart().slice(0, 6).map((_, index) => (
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

          <TabsContent value="alerts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Active Alerts</h2>
              <Badge variant="outline">{alerts.filter(a => !a.is_resolved).length} unresolved</Badge>
            </div>
            
            <div className="space-y-4">
              {alerts.filter(a => selectedUser === 'all' || a.user_id === selectedUser).map((alert) => (
                <Alert key={alert.id} className={alert.is_resolved ? 'opacity-60' : ''}>
                  <AlertTriangle className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                        <Badge variant="outline">{alert.user_id}</Badge>
                        {alert.is_resolved && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <AlertDescription className="mb-3">
                      {alert.message}
                    </AlertDescription>
                    {alert.suggested_actions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-2">Suggested Actions:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {alert.suggested_actions.map((action, index) => (
                            <li key={index} className="flex items-center">
                              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!alert.is_resolved && (
                      <Button 
                        size="sm" 
                        onClick={() => resolveAlert(alert.id)}
                        className="mt-2"
                      >
                        Mark as Resolved
                      </Button>
                    )}
                  </div>
                </Alert>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="prompts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Self-Service Prompts</h2>
              <Badge variant="outline">{prompts.length} available</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prompts.filter(p => selectedUser === 'all' || p.user_id === selectedUser).map((prompt) => (
                <Card key={prompt.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{prompt.title}</CardTitle>
                      <Badge variant={getPriorityColor(prompt.priority)}>{prompt.priority}</Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Badge variant="outline">{prompt.user_id}</Badge>
                      <Clock className="h-3 w-3" />
                      <span>{new Date(prompt.timestamp).toLocaleString()}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {prompt.description}
                    </CardDescription>
                    <div className="flex flex-wrap gap-2">
                      {prompt.actions.map((action, index) => (
                        <Button
                          key={index}
                          variant={action.type === 'dismiss' ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => handlePromptAction(prompt.id, action.type)}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Monitoring Metrics Overview</CardTitle>
                <CardDescription>Real-time system and productivity metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processMetricsForChart()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App
