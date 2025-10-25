"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiCheckboxCircleFill, RiCheckLine, RiErrorWarningFill } from "@remixicon/react";

// Mock data - replace with actual API call
const mockReadyInvoices = [
  {
    id: "inv_7",
    invoice_number: "C-5555",
    carrier_name: "ACME Trucking",
    total_amount: 1150.00,
    match_type: "perfect",
    has_variance: false,
  },
  {
    id: "inv_8",
    invoice_number: "C-4444",
    carrier_name: "Fast Freight",
    total_amount: 980.00,
    match_type: "bol_approved",
    has_variance: true,
    variance_note: "+$30 fuel adjustment",
  },
  {
    id: "inv_9",
    invoice_number: "C-3333",
    carrier_name: "Quick Ship",
    total_amount: 1250.00,
    match_type: "perfect",
    has_variance: false,
  },
  {
    id: "inv_10",
    invoice_number: "C-2222",
    carrier_name: "Swift Carriers",
    total_amount: 2100.00,
    match_type: "bol_approved",
    has_variance: true,
    variance_note: "BOL matches, PO variance",
  },
  {
    id: "inv_11",
    invoice_number: "C-1111",
    carrier_name: "Rapid Transit",
    total_amount: 750.00,
    match_type: "perfect",
    has_variance: false,
  },
];

export function ReadyToApproveCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RiCheckboxCircleFill className="h-5 w-5 text-green-600" />
              Ready to Approve
              <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100">
                {mockReadyInvoices.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Invoices cleared for payment approval
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mockReadyInvoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RiCheckboxCircleFill className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No invoices ready to approve</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mockReadyInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className={`flex items-start justify-between p-4 rounded-lg border transition-colors ${
                  invoice.has_variance
                    ? "border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/10 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                    : "border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/10 hover:bg-green-50 dark:hover:bg-green-950/20"
                }`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {!invoice.has_variance && (
                      <RiCheckboxCircleFill className="h-4 w-4 text-green-600" />
                    )}
                    {invoice.has_variance && (
                      <RiErrorWarningFill className="h-4 w-4 text-blue-600" />
                    )}
                    <span className="font-semibold">{invoice.invoice_number}</span>
                    <Badge variant="outline" className="text-xs">
                      {invoice.carrier_name}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ${invoice.total_amount.toFixed(2)}
                  </p>
                  {!invoice.has_variance && (
                    <p className="text-xs text-green-700 dark:text-green-400">
                      Perfect 3-way match
                    </p>
                  )}
                  {invoice.has_variance && (
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      {invoice.variance_note}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {!invoice.has_variance ? (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <RiCheckLine className="h-3.5 w-3.5 mr-1.5" />
                      Approve
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline">
                      Review & Approve
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
