"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RiHistoryLine,
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiUploadCloudLine,
  RiFileTextLine
} from "@remixicon/react";

// Mock data - replace with actual API call
const mockActivities = [
  {
    id: "act_1",
    type: "matched",
    message: "C-9999 matched to BOL-123",
    timestamp: "2 minutes ago",
    icon: RiCheckboxCircleFill,
    iconColor: "text-green-600",
  },
  {
    id: "act_2",
    type: "flagged",
    message: "C-8888 flagged (variance)",
    timestamp: "5 minutes ago",
    icon: RiErrorWarningFill,
    iconColor: "text-yellow-600",
  },
  {
    id: "act_3",
    type: "approved",
    message: "C-7777 approved",
    timestamp: "10 minutes ago",
    icon: RiCheckboxCircleFill,
    iconColor: "text-green-600",
  },
  {
    id: "act_4",
    type: "uploaded",
    message: "C-6666 uploaded",
    timestamp: "15 minutes ago",
    icon: RiUploadCloudLine,
    iconColor: "text-blue-600",
  },
  {
    id: "act_5",
    type: "matched",
    message: "C-5555 perfect 3-way match",
    timestamp: "22 minutes ago",
    icon: RiCheckboxCircleFill,
    iconColor: "text-green-600",
  },
  {
    id: "act_6",
    type: "flagged",
    message: "C-4444 unexpected charge",
    timestamp: "28 minutes ago",
    icon: RiErrorWarningFill,
    iconColor: "text-red-600",
  },
];

export function RecentActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RiHistoryLine className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest invoice processing updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity, index) => (
            <div key={activity.id} className="relative">
              {index !== mockActivities.length - 1 && (
                <div className="absolute left-2.5 top-8 h-full w-0.5 bg-border" />
              )}
              <div className="flex items-start gap-3">
                <div className="relative z-10 rounded-full bg-background p-1">
                  <activity.icon className={`h-4 w-4 ${activity.iconColor}`} />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {activity.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
