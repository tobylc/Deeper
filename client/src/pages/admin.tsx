import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  MessageSquare, 
  Activity, 
  TrendingUp, 
  Database, 
  Mail,
  Phone,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  LineChart,
  PieChart,
  Settings,
  Search,
  Eye,
  Edit,
  RefreshCw,
  Download
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell } from "recharts";
import AdminAccessGuard from "@/components/admin-access-guard";
import RetentionChart from "@/components/retention-chart";
import AdminDatabaseBrowser from "@/components/admin-database-browser";
import AdvancedAnalytics from "@/components/advanced-analytics";
import { AdminEmailCampaigns } from "@/components/admin-email-campaigns";

// Color palette for charts
const COLORS = ['#4FACFE', '#D7A087', '#22D3EE', '#F59E0B', '#EF4444', '#10B981'];

function AdminStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-slate-200 rounded mb-4"></div>
              <div className="h-8 bg-slate-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.users.newThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.connections.accepted.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.connections.acceptanceRate}% acceptance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messages.today.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.messages.thisWeek.toLocaleString()} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Metrics</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.users.subscriptionBreakdown.filter(s => s.tier !== 'trial').reduce((sum, s) => sum + s.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Paying users</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.users.subscriptionBreakdown.map((tier, index) => (
                <div key={tier.tier} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="capitalize">{tier.tier}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{tier.count}</div>
                    <div className="text-xs text-muted-foreground">
                      {((tier.count / stats.users.total) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Message Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.messages.typeBreakdown.map((type, index) => (
                <div key={type.format} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="capitalize">{type.format}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{type.count}</div>
                    <div className="text-xs text-muted-foreground">
                      {((type.count / stats.messages.total) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActivityChart() {
  const [days, setDays] = useState(30);
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['/api/admin/activity-chart', { days }],
    refetchInterval: 60000 // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Activity Trends</CardTitle>
        <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsLineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
            />
            <Line 
              type="monotone" 
              dataKey="new_users" 
              stroke="#4FACFE" 
              strokeWidth={2}
              name="New Users"
            />
            <Line 
              type="monotone" 
              dataKey="messages" 
              stroke="#D7A087" 
              strokeWidth={2}
              name="Messages"
            />
            <Line 
              type="monotone" 
              dataKey="connections" 
              stroke="#22D3EE" 
              strokeWidth={2}
              name="Connections"
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function UserManagement() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['/api/admin/users', { page, search }],
    refetchInterval: 30000
  });

  const { data: userDetails } = useQuery({
    queryKey: ['/api/admin/users', selectedUser?.id],
    enabled: !!selectedUser?.id
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Subscription</th>
                  <th className="p-4 font-medium">Connections</th>
                  <th className="p-4 font-medium">Joined</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersData?.users.map((user: any) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profileImageUrl} />
                          <AvatarFallback>
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.subscriptionTier === 'trial' ? 'secondary' : 'default'}>
                        {user.subscriptionTier}
                      </Badge>
                    </td>
                    <td className="p-4">{user.maxConnections}</td>
                    <td className="p-4">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </td>
                    <td className="p-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>User Details</DialogTitle>
                          </DialogHeader>
                          {userDetails && (
                            <UserDetailsModal user={userDetails.user} data={userDetails} />
                          )}
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {usersData && (
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, usersData.pagination.total)} of {usersData.pagination.total} users
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= usersData.pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserDetailsModal({ user, data }: { user: any, data: any }) {
  return (
    <div className="space-y-6">
      {/* User Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <div className="font-medium">{user.firstName} {user.lastName}</div>
        </div>
        <div>
          <Label>Email</Label>
          <div className="font-medium">{user.email}</div>
        </div>
        <div>
          <Label>Subscription</Label>
          <Badge>{user.subscriptionTier}</Badge>
        </div>
        <div>
          <Label>Status</Label>
          <Badge variant={user.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
            {user.subscriptionStatus}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Connections */}
      <div>
        <h3 className="font-medium mb-3">Connections ({data.connections.length})</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {data.connections.map((conn: any) => (
            <div key={conn.id} className="flex items-center justify-between p-2 border rounded">
              <div>
                <div className="text-sm font-medium">
                  {conn.inviterEmail === user.email ? conn.inviteeEmail : conn.inviterEmail}
                </div>
                <div className="text-xs text-muted-foreground">
                  {conn.relationshipType} • {conn.status}
                </div>
              </div>
              <Badge variant={conn.status === 'accepted' ? 'default' : 'secondary'}>
                {conn.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Recent Messages */}
      <div>
        <h3 className="font-medium mb-3">Recent Messages ({data.messages.length})</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {data.messages.slice(0, 10).map((msg: any) => (
            <div key={msg.id} className="p-2 border rounded">
              <div className="text-sm">{msg.content.substring(0, 100)}...</div>
              <div className="text-xs text-muted-foreground mt-1">
                {format(new Date(msg.createdAt), 'MMM dd, yyyy h:mm a')} • {msg.type}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SystemHealth() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['/api/admin/system-health'],
    refetchInterval: 30000
  });

  const { data: issues } = useQuery({
    queryKey: ['/api/admin/debug/recent-issues'],
    refetchInterval: 60000
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-slate-200 rounded mb-4"></div>
            <div className="h-8 bg-slate-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {health?.database.healthy ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span className={health?.database.healthy ? 'text-green-600' : 'text-red-600'}>
                {health?.database.healthy ? 'Healthy' : 'Issues Detected'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email System</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {(health?.errors.recentEmailFailures || 0) < 5 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              <span>
                {health?.errors.recentEmailFailures || 0} failures today
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {health?.timestamp ? formatDistanceToNow(new Date(health.timestamp), { addSuffix: true }) : 'Unknown'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Tables */}
      {health?.database.tables && (
        <Card>
          <CardHeader>
            <CardTitle>Database Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Table</th>
                    <th className="text-left p-2">Live Rows</th>
                    <th className="text-left p-2">Inserts</th>
                    <th className="text-left p-2">Updates</th>
                    <th className="text-left p-2">Deletes</th>
                  </tr>
                </thead>
                <tbody>
                  {health.database.tables.map((table: any) => (
                    <tr key={table.tablename} className="border-b">
                      <td className="p-2 font-medium">{table.tablename}</td>
                      <td className="p-2">{table.live_rows?.toLocaleString()}</td>
                      <td className="p-2">{table.inserts?.toLocaleString()}</td>
                      <td className="p-2">{table.updates?.toLocaleString()}</td>
                      <td className="p-2">{table.deletes?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Issues */}
      {issues && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Failed Emails</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {issues.failedEmails?.slice(0, 5).map((email: any) => (
                  <div key={email.id} className="text-xs">
                    <div className="font-medium">{email.toEmail}</div>
                    <div className="text-muted-foreground">{email.subject}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Expired Trials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {issues.expiredTrials?.slice(0, 5).map((user: any) => (
                  <div key={user.id} className="text-xs">
                    <div className="font-medium">{user.email}</div>
                    <div className="text-muted-foreground">
                      Expired {formatDistanceToNow(new Date(user.trialExpiresAt), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Stale Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {issues.staleConnections?.slice(0, 5).map((conn: any) => (
                  <div key={conn.id} className="text-xs">
                    <div className="font-medium">{conn.inviteeEmail}</div>
                    <div className="text-muted-foreground">
                      Pending {formatDistanceToNow(new Date(conn.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  return (
    <AdminAccessGuard>
      <div className="min-h-screen bg-gradient-radial from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-slate-300">Monitor and manage your Deeper platform</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-ocean data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-ocean data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="emails" className="data-[state=active]:bg-ocean data-[state=active]:text-white">
              <Mail className="h-4 w-4 mr-2" />
              Email Campaigns
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-ocean data-[state=active]:text-white">
              <LineChart className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="database" className="data-[state=active]:bg-ocean data-[state=active]:text-white">
              <Database className="h-4 w-4 mr-2" />
              Database
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-ocean data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-2" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AdminStats />
            <ActivityChart />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="emails" className="space-y-6">
            <AdminEmailCampaigns />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AdvancedAnalytics />
            <ActivityChart />
            <RetentionChart />
          </TabsContent>

          <TabsContent value="database" className="space-y-6">
            <AdminDatabaseBrowser />
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <SystemHealth />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </AdminAccessGuard>
  );
}