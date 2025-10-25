"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiAlertFill, RiSearchLine, RiFlashlightFill } from "@remixicon/react";

// Mock data - replace with actual API call
const mockInvoices = [
  {
    id: "inv_1",
    invoice_number: "C-9999",
    carrier_name: "ACME Trucking",
    total_amount: 1234.00,
    issue: "Missing PO/BOL reference",
    confidence: null,
  },
  {
    id: "inv_2",
    invoice_number: "C-8888",
    carrier_name: "Fast Freight",
    total_amount: 890.00,
    issue: "Low confidence (62%)",
    confidence: 62,
  },
  {
    id: "inv_3",
    invoice_number: "C-7777",
    carrier_name: "Quick Ship",
    total_amount: 1550.00,
    issue: "Multiple BOL candidates",
    confidence: null,
  },
];

export function UnmatchedInvoicesCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RiAlertFill className="h-5 w-5 text-yellow-600" />
              Unmatched Invoices
              <Badge variant="secondary">{mockInvoices.length}</Badge>
            </CardTitle>
            <CardDescription>
              Invoices pending BOL or PO matching
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mockInvoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RiAlertFill className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No unmatched invoices</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mockInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{invoice.invoice_number}</span>
                    <Badge variant="outline" className="text-xs">
                      {invoice.carrier_name}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ${invoice.total_amount.toFixed(2)}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-yellow-700 dark:text-yellow-400">
                    <RiAlertFill className="h-3.5 w-3.5" />
                    <span>{invoice.issue}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {invoice.confidence !== null && invoice.confidence < 70 ? (
                    <Button size="sm" variant="outline">
                      <RiSearchLine className="h-3.5 w-3.5 mr-1.5" />
                      Manual Match
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline">
                      <RiFlashlightFill className="h-3.5 w-3.5 mr-1.5" />
                      Try Match
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
