import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";

export default function RetentionChart() {
  const { data: retentionData, isLoading } = useQuery({
    queryKey: ['/api/admin/analytics/retention'],
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Retention Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!retentionData?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Retention Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No retention data available</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate retention percentages
  const chartData = retentionData.map((cohort: any) => ({
    week: format(new Date(cohort.cohort_week), 'MMM dd'),
    cohortSize: cohort.cohort_size,
    week1Retention: cohort.cohort_size > 0 ? (cohort.week_1_retained / cohort.cohort_size * 100).toFixed(1) : 0,
    week2Retention: cohort.cohort_size > 0 ? (cohort.week_2_retained / cohort.cohort_size * 100).toFixed(1) : 0,
    week4Retention: cohort.cohort_size > 0 ? (cohort.week_4_retained / cohort.cohort_size * 100).toFixed(1) : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Retention Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">
          Percentage of users who return after 1, 2, and 4 weeks by signup cohort
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="week" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Retention %', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value, name) => [`${value}%`, name]}
              labelFormatter={(label) => `Week of ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="week1Retention" 
              stroke="#4FACFE" 
              strokeWidth={2}
              name="Week 1 Retention"
            />
            <Line 
              type="monotone" 
              dataKey="week2Retention" 
              stroke="#D7A087" 
              strokeWidth={2}
              name="Week 2 Retention"
            />
            <Line 
              type="monotone" 
              dataKey="week4Retention" 
              stroke="#22D3EE" 
              strokeWidth={2}
              name="Week 4 Retention"
            />
          </LineChart>
        </ResponsiveContainer>
        
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Avg Week 1</p>
            <p className="text-lg font-semibold text-[#4FACFE]">
              {chartData.length > 0 ? 
                (chartData.reduce((sum, d) => sum + parseFloat(d.week1Retention), 0) / chartData.length).toFixed(1) : 0}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Week 2</p>
            <p className="text-lg font-semibold text-[#D7A087]">
              {chartData.length > 0 ? 
                (chartData.reduce((sum, d) => sum + parseFloat(d.week2Retention), 0) / chartData.length).toFixed(1) : 0}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Week 4</p>
            <p className="text-lg font-semibold text-[#22D3EE]">
              {chartData.length > 0 ? 
                (chartData.reduce((sum, d) => sum + parseFloat(d.week4Retention), 0) / chartData.length).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}