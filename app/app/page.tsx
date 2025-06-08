import { Shield, Key, Clock, AlertTriangle, Plus, Download, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const stats = [
    { title: "Total Credentials", value: "24", icon: Key, color: "text-blue-500" },
    { title: "TOTP Codes", value: "8", icon: Shield, color: "text-green-500" },
    { title: "Recent Activity", value: "3", icon: Clock, color: "text-orange-500" },
    { title: "Security Alerts", value: "1", icon: AlertTriangle, color: "text-red-500" },
  ];

  const recentItems = [
    { name: "GitHub", username: "john@example.com", lastUsed: "2 hours ago" },
    { name: "Gmail", username: "john.doe@gmail.com", lastUsed: "5 hours ago" },
    { name: "AWS Console", username: "johndoe", lastUsed: "1 day ago" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your security overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button className="justify-start gap-2 h-auto p-4">
            <Plus className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Add Credential</div>
              <div className="text-sm opacity-90">Store a new password</div>
            </div>
          </Button>
          <Button variant="outline" className="justify-start gap-2 h-auto p-4">
            <Download className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Backup Vault</div>
              <div className="text-sm opacity-70">Export your data</div>
            </div>
          </Button>
          <Button variant="outline" className="justify-start gap-2 h-auto p-4">
            <FileText className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">View Logs</div>
              <div className="text-sm opacity-70">Security activity</div>
            </div>
          </Button>
        </div>
      </Card>

      {/* Recent Items */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Items</h2>
        <div className="space-y-3">
          {recentItems.map((item) => (
            <div key={item.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.username}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{item.lastUsed}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
