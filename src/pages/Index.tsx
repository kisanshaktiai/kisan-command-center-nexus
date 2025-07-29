
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, BarChart3, Settings } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Platform Super Admin
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Comprehensive platform management and administration
          </p>
          <Link to="/auth">
            <Button size="lg" className="mx-2">
              <Shield className="w-5 h-5 mr-2" />
              Admin Login
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Users className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Tenant Management</CardTitle>
              <CardDescription>
                Manage multi-tenant organizations and their configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Complete control over tenant onboarding, settings, and access management.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Analytics & Monitoring</CardTitle>
              <CardDescription>
                Real-time platform monitoring and performance analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Track system health, user engagement, and platform performance metrics.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Settings className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Feature Management</CardTitle>
              <CardDescription>
                Control feature flags and platform configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Enable/disable features, manage rollouts, and configure platform settings.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Security & Compliance</CardTitle>
              <CardDescription>
                Advanced security controls and audit logging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Comprehensive security monitoring, access controls, and compliance tools.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p>Secure, scalable, and comprehensive platform administration</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
