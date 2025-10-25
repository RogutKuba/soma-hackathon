"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiErrorWarningFill, RiArrowRightLine } from "@remixicon/react";

// Mock data - replace with actual API call
const mockFlaggedInvoices = [
  {
    id: "inv_4",
    invoice_number: "C-7777",
    carrier_name: "ACME Trucking",
    total_amount: 1020.00,
    flags: [
      { code: "INVOICE_BOL_MISMATCH", severity: "high", message: "BOL/Invoice mismatch" },
      { code: "UNEXPECTED_CHARGE", severity: "high", message: "+$100 unexpected charge" },
    ],
  },
  {
    id: "inv_5",
    invoice_number: "C-6666",
    carrier_name: "Fast Freight",
    total_amount: 2450.00,
    flags: [
      { code: "PO_BOL_VARIANCE", severity: "med", message: "PO variance: +$200" },
    ],
  },
  {
    id: "inv_6",
    invoice_number: "C-5555",
    carrier_name: "Quick Ship",
    total_amount: 850.00,
    flags: [
      { code: "CHARGE_VARIANCE", severity: "low", message: "Fuel surcharge differs" },
    ],
  },
];

function getSeverityColor(severity: string) {
  switch (severity) {
    case "high":
      return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20";
    case "med":
      return "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20";
    case "low":
      return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20";
    default:
      return "text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/20";
  }
}

export function FlaggedItemsCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RiErrorWarningFill className="h-5 w-5 text-red-600" />
              Flagged Items
              <Badge variant="destructive">{mockFlaggedInvoices.length}</Badge>
            </CardTitle>
            <CardDescription>
              Invoices with discrepancies requiring review
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mockFlaggedInvoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RiErrorWarningFill className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No flagged invoices</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mockFlaggedInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-start justify-between p-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{invoice.invoice_number}</span>
                    <Badge variant="outline" className="text-xs">
                      {invoice.carrier_name}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ${invoice.total_amount.toFixed(2)}
                  </p>
                  <div className="space-y-1">
                    {invoice.flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${getSeverityColor(
                          flag.severity
                        )}`}
                      >
                        <RiErrorWarningFill className="h-3.5 w-3.5" />
                        <span>{flag.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline">
                    Review
                    <RiArrowRightLine className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
