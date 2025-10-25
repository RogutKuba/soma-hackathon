'use client';

import { useState } from 'react';
import {
  useGetAllMatchingResultsQuery,
  type MatchingResult,
} from '@/query/match.query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiAlertLine,
  RiCloseCircleLine,
  RiMoneyDollarCircleLine,
  RiPercentLine,
  RiFlagLine,
  RiEyeLine,
  RiFileList3Line,
} from '@remixicon/react';

type MatchStatus =
  | 'perfect_match'
  | 'minor_variance'
  | 'major_variance'
  | 'no_match';

const matchStatusColors: Record<MatchStatus, string> = {
  perfect_match: 'bg-green-100 text-green-800 border-green-200',
  minor_variance: 'bg-blue-100 text-blue-800 border-blue-200',
  major_variance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  no_match: 'bg-red-100 text-red-800 border-red-200',
};

const matchStatusLabels: Record<MatchStatus, string> = {
  perfect_match: 'Perfect Match',
  minor_variance: 'Minor Variance',
  major_variance: 'Major Variance',
  no_match: 'No Match',
};

const matchStatusIcons: Record<MatchStatus, typeof RiCheckboxCircleLine> = {
  perfect_match: RiCheckboxCircleLine,
  minor_variance: RiAlertLine,
  major_variance: RiErrorWarningLine,
  no_match: RiCloseCircleLine,
};

export function MatchingView() {
  const [selectedResult, setSelectedResult] = useState<MatchingResult | null>(
    null
  );
  const { data, isLoading, error } = useGetAllMatchingResultsQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Matching Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <div className='text-muted-foreground'>
              Loading matching results...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Matching Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <div className='text-destructive'>
              Failed to load matching results
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const matchingResults = data || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <RiCheckboxCircleLine className='h-5 w-5' />
              3-Way Matching Results
            </CardTitle>
            <Badge variant='secondary'>{matchingResults.length} Total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {matchingResults.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <RiCheckboxCircleLine className='h-12 w-12 text-muted-foreground mb-4' />
              <p className='text-muted-foreground text-sm'>
                No matching results yet. Upload invoices to start 3-way
                matching.
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b'>
                    <th className='text-left py-3 px-4 font-medium text-sm'>
                      Status
                    </th>
                    <th className='text-left py-3 px-4 font-medium text-sm'>
                      Documents
                    </th>
                    <th className='text-center py-3 px-4 font-medium text-sm'>
                      Confidence
                    </th>
                    <th className='text-right py-3 px-4 font-medium text-sm'>
                      PO Total
                    </th>
                    <th className='text-right py-3 px-4 font-medium text-sm'>
                      BOL Total
                    </th>
                    <th className='text-right py-3 px-4 font-medium text-sm'>
                      Invoice Total
                    </th>
                    <th className='text-right py-3 px-4 font-medium text-sm'>
                      Variance
                    </th>
                    <th className='text-center py-3 px-4 font-medium text-sm'>
                      Flags
                    </th>
                    <th className='text-center py-3 px-4 font-medium text-sm'>
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matchingResults.map((result) => {
                    const StatusIcon = matchStatusIcons[result.match_status];
                    return (
                      <tr
                        key={result.id}
                        className='border-b hover:bg-muted/50 transition-colors'
                      >
                        {/* Status */}
                        <td className='py-4 px-4'>
                          <Badge
                            variant='outline'
                            className={`${
                              matchStatusColors[result.match_status]
                            } flex items-center gap-1 w-fit`}
                          >
                            <StatusIcon className='h-3 w-3' />
                            {matchStatusLabels[result.match_status]}
                          </Badge>
                        </td>

                        {/* Documents */}
                        <td className='py-4 px-4'>
                          <div className='flex flex-col gap-1 text-xs'>
                            <div className='flex items-center gap-1'>
                              <span className='text-muted-foreground'>PO:</span>
                              <span className='font-mono'>{result.po_id}</span>
                            </div>
                            <div className='flex items-center gap-1'>
                              <span className='text-muted-foreground'>
                                Invoice:
                              </span>
                              <span className='font-mono'>
                                {result.invoice_id}
                              </span>
                            </div>
                            {result.bol_id && (
                              <div className='flex items-center gap-1'>
                                <span className='text-muted-foreground'>
                                  BOL:
                                </span>
                                <span className='font-mono'>
                                  {result.bol_id}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Confidence */}
                        <td className='py-4 px-4 text-center'>
                          <div className='flex items-center justify-center gap-1'>
                            <RiPercentLine className='h-3 w-3 text-muted-foreground' />
                            <span className='font-semibold'>
                              {(result.confidence_score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>

                        {/* PO Total */}
                        <td className='py-4 px-4 text-right'>
                          <div className='flex items-center justify-end gap-1 text-sm'>
                            <RiMoneyDollarCircleLine className='h-3 w-3 text-muted-foreground' />
                            <span>
                              {result.comparison.po_total.toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </span>
                          </div>
                        </td>

                        {/* BOL Total */}
                        <td className='py-4 px-4 text-right'>
                          <div className='flex items-center justify-end gap-1 text-sm'>
                            <RiMoneyDollarCircleLine className='h-3 w-3 text-muted-foreground' />
                            <span>
                              {result.comparison.bol_total
                                ? result.comparison.bol_total.toLocaleString(
                                    'en-US',
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    }
                                  )
                                : '-'}
                            </span>
                          </div>
                        </td>

                        {/* Invoice Total */}
                        <td className='py-4 px-4 text-right'>
                          <div className='flex items-center justify-end gap-1 text-sm'>
                            <RiMoneyDollarCircleLine className='h-3 w-3 text-muted-foreground' />
                            <span>
                              {result.comparison.invoice_total.toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Variance */}
                        <td className='py-4 px-4 text-right'>
                          <div className='flex flex-col gap-0.5'>
                            <div
                              className={`text-sm font-semibold ${
                                result.comparison.variance === 0
                                  ? 'text-green-600'
                                  : result.comparison.variance_pct < 5
                                  ? 'text-blue-600'
                                  : result.comparison.variance_pct < 10
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              ${Math.abs(result.comparison.variance).toFixed(2)}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              ({result.comparison.variance_pct.toFixed(1)}%)
                            </div>
                          </div>
                        </td>

                        {/* Flags */}
                        <td className='py-4 px-4 text-center'>
                          <div className='flex items-center justify-center gap-2'>
                            {result.flags_count > 0 ? (
                              <>
                                <div className='flex items-center gap-1'>
                                  <RiFlagLine className='h-4 w-4 text-muted-foreground' />
                                  <span className='text-sm font-medium'>
                                    {result.flags_count}
                                  </span>
                                </div>
                                {result.high_severity_flags > 0 && (
                                  <Badge
                                    variant='destructive'
                                    className='text-xs'
                                  >
                                    {result.high_severity_flags} high
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className='text-xs text-muted-foreground'>
                                None
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Details Button */}
                        <td className='py-4 px-4 text-center'>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => setSelectedResult(result)}
                              >
                                <RiEyeLine className='h-4 w-4' />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className='sm:max-w-4xl max-h-[90vh] overflow-y-auto'>
                              <DialogHeader>
                                <DialogTitle className='flex items-center gap-2'>
                                  <RiFileList3Line className='h-5 w-5' />
                                  Matching Details
                                </DialogTitle>
                                <DialogDescription>
                                  Detailed 3-way comparison between PO, BOL, and
                                  Invoice
                                </DialogDescription>
                              </DialogHeader>

                              {selectedResult && (
                                <div className='space-y-6'>
                                  {/* Status Section */}
                                  <div>
                                    <h3 className='text-sm font-semibold mb-2'>
                                      Match Status
                                    </h3>
                                    <div className='flex items-center gap-4'>
                                      <Badge
                                        variant='outline'
                                        className={`${
                                          matchStatusColors[
                                            selectedResult.match_status
                                          ]
                                        } flex items-center gap-1`}
                                      >
                                        <StatusIcon className='h-3 w-3' />
                                        {
                                          matchStatusLabels[
                                            selectedResult.match_status
                                          ]
                                        }
                                      </Badge>
                                      <div className='text-sm'>
                                        <span className='text-muted-foreground'>
                                          Confidence:
                                        </span>{' '}
                                        <span className='font-semibold'>
                                          {(
                                            selectedResult.confidence_score *
                                            100
                                          ).toFixed(0)}
                                          %
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Totals Comparison */}
                                  <div>
                                    <h3 className='text-sm font-semibold mb-2'>
                                      Total Comparison
                                    </h3>
                                    <div className='grid grid-cols-4 gap-4'>
                                      <div className='bg-muted/50 p-3 rounded-lg'>
                                        <div className='text-xs text-muted-foreground mb-1'>
                                          PO Total
                                        </div>
                                        <div className='text-lg font-semibold'>
                                          $
                                          {selectedResult.comparison.po_total.toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                            }
                                          )}
                                        </div>
                                      </div>
                                      <div className='bg-muted/50 p-3 rounded-lg'>
                                        <div className='text-xs text-muted-foreground mb-1'>
                                          BOL Total
                                        </div>
                                        <div className='text-lg font-semibold'>
                                          {selectedResult.comparison.bol_total
                                            ? `$${selectedResult.comparison.bol_total.toLocaleString(
                                                'en-US',
                                                {
                                                  minimumFractionDigits: 2,
                                                }
                                              )}`
                                            : '-'}
                                        </div>
                                      </div>
                                      <div className='bg-muted/50 p-3 rounded-lg'>
                                        <div className='text-xs text-muted-foreground mb-1'>
                                          Invoice Total
                                        </div>
                                        <div className='text-lg font-semibold'>
                                          $
                                          {selectedResult.comparison.invoice_total.toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                            }
                                          )}
                                        </div>
                                      </div>
                                      <div className='bg-muted/50 p-3 rounded-lg'>
                                        <div className='text-xs text-muted-foreground mb-1'>
                                          Variance
                                        </div>
                                        <div
                                          className={`text-lg font-semibold ${
                                            selectedResult.comparison
                                              .variance === 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          $
                                          {Math.abs(
                                            selectedResult.comparison.variance
                                          ).toFixed(2)}{' '}
                                          <span className='text-sm'>
                                            (
                                            {selectedResult.comparison.variance_pct.toFixed(
                                              1
                                            )}
                                            %)
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Charge Comparison */}
                                  {selectedResult.comparison.charge_comparison
                                    ?.length > 0 && (
                                    <div>
                                      <h3 className='text-sm font-semibold mb-2'>
                                        Line Item Comparison
                                      </h3>
                                      <div className='border rounded-lg overflow-hidden'>
                                        <table className='w-full text-sm'>
                                          <thead className='bg-muted/50'>
                                            <tr>
                                              <th className='text-left py-2 px-3 font-medium'>
                                                Description
                                              </th>
                                              <th className='text-right py-2 px-3 font-medium'>
                                                PO Value
                                              </th>
                                              <th className='text-right py-2 px-3 font-medium'>
                                                BOL Value
                                              </th>
                                              <th className='text-right py-2 px-3 font-medium'>
                                                Invoice Value
                                              </th>
                                              <th className='text-center py-2 px-3 font-medium'>
                                                Status
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {selectedResult.comparison.charge_comparison.map(
                                              (charge, idx) => (
                                                <tr
                                                  key={idx}
                                                  className='border-t'
                                                >
                                                  <td className='py-2 px-3'>
                                                    {charge.description}
                                                  </td>
                                                  <td className='py-2 px-3 text-right font-mono'>
                                                    {charge.po_amount !== null
                                                      ? `${charge.po_amount}`
                                                      : '-'}
                                                  </td>
                                                  <td className='py-2 px-3 text-right font-mono'>
                                                    {charge.bol_amount !== null
                                                      ? `${charge.bol_amount}`
                                                      : '-'}
                                                  </td>
                                                  <td className='py-2 px-3 text-right font-mono'>
                                                    {charge.invoice_amount !==
                                                    null
                                                      ? `${charge.invoice_amount}`
                                                      : '-'}
                                                  </td>
                                                  <td className='py-2 px-3 text-center'>
                                                    <Badge
                                                      variant='outline'
                                                      className={
                                                        charge.status ===
                                                        'match'
                                                          ? 'bg-green-100 text-green-800'
                                                          : charge.status ===
                                                            'variance'
                                                          ? 'bg-yellow-100 text-yellow-800'
                                                          : charge.status ===
                                                            'missing'
                                                          ? 'bg-orange-100 text-orange-800'
                                                          : 'bg-red-100 text-red-800'
                                                      }
                                                    >
                                                      {charge.status}
                                                    </Badge>
                                                  </td>
                                                </tr>
                                              )
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {/* LLM Reasoning */}
                                  {selectedResult.comparison.llm_reasoning && (
                                    <div>
                                      <h3 className='text-sm font-semibold mb-2'>
                                        AI Analysis
                                      </h3>
                                      <div className='bg-muted/50 p-4 rounded-lg text-sm'>
                                        {
                                          selectedResult.comparison
                                            .llm_reasoning
                                        }
                                      </div>
                                    </div>
                                  )}

                                  {/* Metadata */}
                                  <div className='text-xs text-muted-foreground border-t pt-4'>
                                    <div className='flex justify-between'>
                                      <span>Match ID: {selectedResult.id}</span>
                                      <span>
                                        Created:{' '}
                                        {new Date(
                                          selectedResult.created_at
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
