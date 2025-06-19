import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Server, Database, Shield, AlertTriangle, CheckCircle, Clock, HardDrive, Activity } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Site {
  name: string
  location: string
  status: string
  last_backup: string
  rpo_minutes: number
  rto_minutes: number
}

interface BackupJob {
  job_id: string
  site: string
  status: string
  start_time: string
  size_gb: number
}

interface HealthStatus {
  status: string
  timestamp: string
  sites_healthy: number
  sites_total: number
  uptime_percentage: number
}

function App() {
  const [sites, setSites] = useState<Site[]>([])
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([])
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [failoverHistory, setFailoverHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [failoverDialogOpen, setFailoverDialogOpen] = useState(false)
  const [failoverForm, setFailoverForm] = useState({
    from_site: '',
    to_site: '',
    reason: ''
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const [sitesRes, backupsRes, healthRes, historyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/sites/status`),
        fetch(`${API_BASE_URL}/backups/jobs`),
        fetch(`${API_BASE_URL}/health/check`),
        fetch(`${API_BASE_URL}/failover/history`)
      ])

      if (!sitesRes.ok || !backupsRes.ok || !healthRes.ok || !historyRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [sitesData, backupsData, healthData, historyData] = await Promise.all([
        sitesRes.json(),
        backupsRes.json(),
        healthRes.json(),
        historyRes.json()
      ])

      setSites(sitesData)
      setBackupJobs(backupsData)
      setHealthStatus(healthData)
      setFailoverHistory(historyData.history || [])
      setError(null)
    } catch (err) {
      setError('Failed to connect to DR management system')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFailover = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/failover/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(failoverForm)
      })

      if (!response.ok) {
        throw new Error('Failover failed')
      }

      const result = await response.json()
      setFailoverDialogOpen(false)
      setFailoverForm({ from_site: '', to_site: '', reason: '' })
      await fetchData() // Refresh data
      alert(`Failover successful: ${result.message}`)
    } catch (err) {
      alert('Failover failed. Please try again.')
    }
  }

  const handleSiteRestore = async (siteId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sites/${siteId}/restore`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Restore failed')
      }

      await fetchData() // Refresh data
      alert(`Site ${siteId} restored successfully`)
    } catch (err) {
      alert('Site restore failed. Please try again.')
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'active':
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'running':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'active':
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4" />
      case 'running':
        return <Activity className="h-4 w-4" />
      default:
        return <Server className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading DR Management Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Disaster Recovery Management Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor and manage your business-critical application DR infrastructure
          </p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {healthStatus && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Health Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    healthStatus.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {getStatusIcon(healthStatus.status)}
                    <span className="ml-1">{healthStatus.status.toUpperCase()}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{healthStatus.sites_healthy}/{healthStatus.sites_total}</p>
                  <p className="text-sm text-gray-600">Sites Healthy</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{healthStatus.uptime_percentage.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">Uptime</p>
                </div>
                <div className="text-center">
                  <Button onClick={fetchData} variant="outline" size="sm">
                    <Activity className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="sites" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sites">DR Sites</TabsTrigger>
            <TabsTrigger value="backups">Backup Jobs</TabsTrigger>
            <TabsTrigger value="failover">Failover</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="sites">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sites.map((site, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        {site.name}
                      </span>
                      <Badge className={getStatusColor(site.status)}>
                        {site.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{site.location}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>Last Backup: {new Date(site.last_backup).toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">RPO</p>
                          <p className="text-gray-600">{site.rpo_minutes} min</p>
                        </div>
                        <div>
                          <p className="font-medium">RTO</p>
                          <p className="text-gray-600">{site.rto_minutes} min</p>
                        </div>
                      </div>
                      {site.status === 'failed' && (
                        <Button 
                          onClick={() => handleSiteRestore(index === 0 ? 'primary' : index === 1 ? 'secondary' : 'cloud')}
                          className="w-full"
                          variant="outline"
                        >
                          Restore Site
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="backups">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Backup Jobs
                </CardTitle>
                <CardDescription>Recent backup operations across all sites</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {backupJobs.map((job) => (
                    <div key={job.job_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <HardDrive className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{job.job_id}</p>
                          <p className="text-sm text-gray-600">Site: {job.site}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">
                          {job.size_gb} GB • {new Date(job.start_time).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="failover">
            <Card>
              <CardHeader>
                <CardTitle>Failover Management</CardTitle>
                <CardDescription>Initiate failover between DR sites</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={failoverDialogOpen} onOpenChange={setFailoverDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Initiate Failover
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Initiate Failover</DialogTitle>
                      <DialogDescription>
                        Select source and target sites for failover operation
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="from_site">From Site</Label>
                        <Select value={failoverForm.from_site} onValueChange={(value) => 
                          setFailoverForm(prev => ({ ...prev, from_site: value }))
                        }>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source site" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">Primary Data Center</SelectItem>
                            <SelectItem value="secondary">Secondary Data Center</SelectItem>
                            <SelectItem value="cloud">Cloud DR Site</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="to_site">To Site</Label>
                        <Select value={failoverForm.to_site} onValueChange={(value) => 
                          setFailoverForm(prev => ({ ...prev, to_site: value }))
                        }>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target site" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">Primary Data Center</SelectItem>
                            <SelectItem value="secondary">Secondary Data Center</SelectItem>
                            <SelectItem value="cloud">Cloud DR Site</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea
                          id="reason"
                          placeholder="Describe the reason for failover..."
                          value={failoverForm.reason}
                          onChange={(e) => setFailoverForm(prev => ({ ...prev, reason: e.target.value }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setFailoverDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleFailover} disabled={!failoverForm.from_site || !failoverForm.to_site || !failoverForm.reason}>
                        Execute Failover
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Failover History</CardTitle>
                <CardDescription>Recent failover operations and their outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                {failoverHistory.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No failover history available</p>
                ) : (
                  <div className="space-y-4">
                    {failoverHistory.map((event, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">
                            {event.from_site} → {event.to_site}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Reason: {event.reason}</p>
                        <p className="text-sm text-gray-600">Downtime: {event.downtime_minutes} minutes</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App
