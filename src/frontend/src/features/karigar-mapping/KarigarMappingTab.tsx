import { useState } from 'react';
import { FileSpreadsheet, Upload, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSaveKarigarMappingWorkbook, useGetKarigarMappingWorkbook } from '@/hooks/useQueries';
import { parseKarigarMapping } from '../daily-orders/excel/parseKarigarMapping';

export default function KarigarMappingTab() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const { data: mappingWorkbook = [] } = useGetKarigarMappingWorkbook();
  const saveMappingWorkbook = useSaveKarigarMappingWorkbook();

  const handleMappingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const parsedMapping = await parseKarigarMapping(file);
      
      // Convert to backend format: Array<[sheetName, Array<[design, data]>]>
      // data format: "karigar|genericName" or just "karigar"
      const workbookData: Array<[string, Array<[string, string]>]> = Object.entries(parsedMapping).map(
        ([sheetName, sheetData]) => {
          const entriesArray = Array.from(sheetData.entries).map(([design, entry]) => {
            const data = entry.genericName 
              ? `${entry.karigar}|${entry.genericName}`
              : entry.karigar;
            return [design, data] as [string, string];
          });
          return [sheetName, entriesArray];
        }
      );

      await saveMappingWorkbook.mutateAsync(workbookData);
      setUploadSuccess(true);
      
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload mapping file');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Calculate statistics
  const totalMappings = mappingWorkbook.reduce((sum, [, entries]) => sum + entries.length, 0);
  const sheetCount = mappingWorkbook.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Karigar Mapping</h2>
        <p className="text-muted-foreground">
          Upload and manage the standard karigar mapping workbook
        </p>
      </div>

      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {uploadSuccess && (
        <Alert className="border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>Karigar mapping uploaded successfully!</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Mapping Workbook
            </CardTitle>
            <CardDescription>
              Upload an Excel (.xlsx, .xls) or PDF file with design code, generic name, and karigar name
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="mapping-upload" className="cursor-pointer">
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-muted-foreground/50">
                <div className="text-center">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center">
                    <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
                    <FileText className="h-6 w-6 text-muted-foreground -ml-2" />
                  </div>
                  <p className="mt-2 text-sm font-medium">
                    {isUploading ? 'Uploading...' : 'Click to upload mapping file'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Excel or PDF files
                  </p>
                </div>
              </div>
              <Input
                id="mapping-upload"
                type="file"
                accept=".xlsx,.xls,.pdf"
                onChange={handleMappingUpload}
                disabled={isUploading}
                className="hidden"
              />
            </Label>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                The mapping file should contain design/product code, generic product name (optional), and karigar name columns. 
                For Excel files, sheets 1, 2, and 3 are supported (sheets 1 and 3 take priority). 
                For PDF files, the parser will extract tabular data automatically.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Current Mapping Status
            </CardTitle>
            <CardDescription>
              Overview of the currently stored karigar mapping
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalMappings === 0 ? (
              <div className="flex h-32 items-center justify-center text-center text-muted-foreground">
                <div>
                  <p className="font-medium">No mapping uploaded yet</p>
                  <p className="text-xs">Upload a mapping file to get started</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">Total Mappings</span>
                  <span className="text-2xl font-bold">{totalMappings}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">Sheets</span>
                  <span className="text-2xl font-bold">{sheetCount}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Sheet Details:</p>
                  {mappingWorkbook.map(([sheetName, entries]) => (
                    <div key={sheetName} className="flex items-center justify-between rounded border bg-muted/50 px-3 py-2 text-sm">
                      <span>Sheet {sheetName}</span>
                      <span className="font-medium">{entries.length} entries</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
