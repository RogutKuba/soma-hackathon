"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiCloseCircleFill,
  RiFileTextLine
} from "@remixicon/react";

// Mock data - replace with actual API call
const mockStats = {
  total_invoices: 21,
  match_breakdown: {
    perfect_matches: 12,
    bol_approved: 5,
    with_variance: 2,
    mismatched: 2,
  },
};

export function ThreeWayMatchSummary() {
  const { total_invoices, match_breakdown } = mockStats;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RiFileTextLine className="h-5 w-5" />
          3-Way Match Summary
        </CardTitle>
        <CardDescription>
          Overview of invoice matching status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="space-y-3">
          {/* Perfect Matches */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2">
              <RiCheckboxCircleFill className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900 dark:text-green-100">
                Perfect Matches
              </span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100">
              {match_breakdown.perfect_matches}
            </Badge>
          </div>

          {/* BOL Approved */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
            <div className="flex items-center gap-2">
              <RiCheckboxCircleFill className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900 dark:text-blue-100">
                BOL Approved
              </span>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100">
              {match_breakdown.bol_approved}
            </Badge>
          </div>

          {/* With Variance */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
            <div className="flex items-center gap-2">
              <RiErrorWarningFill className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-yellow-900 dark:text-yellow-100">
                With Variance
              </span>
            </div>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100">
              {match_breakdown.with_variance}
            </Badge>
          </div>

          {/* Mismatched */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
            <div className="flex items-center gap-2">
              <RiCloseCircleFill className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-900 dark:text-red-100">
                Flagged
              </span>
            </div>
            <Badge variant="secondary" className="bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100">
              {match_breakdown.mismatched}
            </Badge>
          </div>
        </div>

        {/* Total */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Total Invoices
            </span>
            <span className="text-2xl font-bold">{total_invoices}</span>
          </div>
        </div>

        {/* Action Button */}
        <Button variant="outline" className="w-full">
          View Detailed Report
        </Button>
      </CardContent>
    </Card>
  );
}
