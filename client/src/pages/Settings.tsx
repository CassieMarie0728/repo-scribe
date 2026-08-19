import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { TemplateManager } from "@/components/TemplateManager";
import ScheduledJobsManager from "@/components/ScheduledJobsManager";

export default function Settings() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("templates");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to access settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You need to be logged in to manage templates and scheduled jobs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">
            Settings
          </h1>
          <p className="text-lg text-gray-600">
            Manage your export templates and scheduled regenerations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="templates">Export Templates</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled Jobs</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Templates Library</CardTitle>
                <CardDescription>
                  Choose from pre-designed templates or create your own custom formatting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TemplateManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Batch Regeneration</CardTitle>
                <CardDescription>
                  Automatically regenerate documents on a recurring schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScheduledJobsManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
