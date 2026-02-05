import { useState } from 'react';
import { FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface MappingSummary {
  totalOrders: number;
  matchedOrders: number;
  unmatchedOrders: number;
  matchedByKarigar: Map<string, number>;
  unmatchedDesigns: string[];
}

interface MappingApplyPanelProps {
  summary: MappingSummary | null;
  isApplying: boolean;
  onApply: (overwriteExisting: boolean) => void;
}

export default function MappingApplyPanel({ summary, isApplying, onApply }: MappingApplyPanelProps) {
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  if (!summary) {
    return null;
  }

  const karigars = Array.from(summary.matchedByKarigar.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4" />
          Mapping Summary
        </CardTitle>
        <CardDescription>Review and apply karigar assignments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="text-2xl font-bold">{summary.totalOrders}</div>
            <div className="text-xs text-muted-foreground">Total Orders</div>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.matchedOrders}</div>
            <div className="text-xs text-muted-foreground">Matched</div>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{summary.unmatchedOrders}</div>
            <div className="text-xs text-muted-foreground">Unmatched</div>
          </div>
        </div>

        {/* Matched by Karigar */}
        {karigars.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Matched by Karigar</Label>
            <ScrollArea className="h-32 rounded-md border p-2">
              <div className="space-y-1">
                {karigars.map(([karigar, count]) => (
                  <div key={karigar} className="flex items-center justify-between py-1">
                    <span className="text-sm">{karigar}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Unmatched Designs */}
        {summary.unmatchedDesigns.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <div className="font-medium mb-1">Unmatched Designs ({summary.unmatchedDesigns.length})</div>
              <ScrollArea className="h-20">
                <div className="text-muted-foreground">
                  {summary.unmatchedDesigns.slice(0, 10).join(', ')}
                  {summary.unmatchedDesigns.length > 10 && ` and ${summary.unmatchedDesigns.length - 10} more...`}
                </div>
              </ScrollArea>
            </AlertDescription>
          </Alert>
        )}

        {/* Overwrite Option */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="overwrite-mode" className="text-sm font-medium">
              Overwrite Existing
            </Label>
            <div className="text-xs text-muted-foreground">
              Replace existing assignments with mapping
            </div>
          </div>
          <Switch
            id="overwrite-mode"
            checked={overwriteExisting}
            onCheckedChange={setOverwriteExisting}
          />
        </div>

        {/* Apply Button */}
        <Button
          className="w-full"
          onClick={() => onApply(overwriteExisting)}
          disabled={isApplying || summary.matchedOrders === 0}
        >
          {isApplying ? (
            <>Applying Mapping...</>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Apply Mapping ({summary.matchedOrders} orders)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
