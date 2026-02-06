import { useState, useEffect } from 'react';
import { Upload, AlertCircle, FileText, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useGetKarigarMappingWorkbook, useSaveKarigarMappingWorkbook } from '@/hooks/useQueries';
import { useActorWithStatus } from '@/hooks/useActorWithStatus';
import { parseKarigarMapping } from '../daily-orders/excel/parseKarigarMapping';
import { encodeMappingToBlob, type KarigarMappingData } from './karigarMappingBlobCodec';
import { getUserFacingError } from '@/utils/userFacingError';
import { useKarigarMappingSummary } from './useKarigarMappingSummary';

export default function KarigarMappingTab() {
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [lastUploadSummary, setLastUploadSummary] = useState<{ totalEntries: number; sheetNames: string[] } | null>(null);

  const { isReady, isError, error } = useActorWithStatus();
  const { data: existingMapping } = useGetKarigarMappingWorkbook();
  const saveMappingWorkbook = useSaveKarigarMappingWorkbook();
  
  // Get summary of existing mapping
  const { data: existingSummary } = useKarigarMappingSummary(existingMapping);

  // Clear last upload summary when new mapping is loaded
  useEffect(() => {
    if (existingMapping && !isUploading) {
      setLastUploadSummary(null);
    }
  }, [existingMapping, isUploading]);

  const handleMappingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isReady) {
      setParseError('Backend not ready. Please wait a moment and try again.');
      e.target.value = '';
      return;
    }

    // Validate file type before parsing
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isPdf = fileName.endsWith('.pdf');
    const fileType = file.type.toLowerCase();
    
    if (!isExcel && !isPdf && !fileType.includes('spreadsheet') && !fileType.includes('pdf')) {
      // Check if it's an image/screenshot
      if (fileType.includes('image') || fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
        setParseError(
          'Screenshots and images cannot be parsed.\n\n' +
          'Please upload:\n' +
          '  • Excel files (.xlsx or .xls)\n' +
          '  • PDF files with tabular data\n\n' +
          'Images and screenshots are not supported for mapping upload.'
        );
        e.target.value = '';
        return;
      }
      
      // Generic unsupported format
      setParseError(
        'Unsupported file format.\n\n' +
        'Please upload:\n' +
        '  • Excel files (.xlsx or .xls)\n' +
        '  • PDF files with tabular data'
      );
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setParseError(null);
    setSaveError(null);
    setUploadSuccess(false);
    setLastUploadSummary(null);
    setUploadProgress(0);

    try {
      // Parse the mapping file
      const parsedMapping = await parseKarigarMapping(file);
      setUploadProgress(30);

      // Convert ParsedKarigarMapping (with Map) to KarigarMappingData (with Array)
      // Include designNormalized in persisted format
      const mappingData: KarigarMappingData = {};
      for (const [sheetName, sheet] of Object.entries(parsedMapping)) {
        mappingData[sheetName] = {
          entries: Array.from(sheet.entries.values()).map(entry => ({
            design: entry.design,
            designNormalized: entry.designNormalized, // Persist normalized key
            karigar: entry.karigar,
            genericName: entry.genericName,
          })),
        };
      }

      // Compute summary for display
      const sheetNames = Object.keys(mappingData);
      const totalEntries = Object.values(mappingData).reduce(
        (sum, sheet) => sum + sheet.entries.length,
        0
      );

      // Encode to blob with upload progress tracking
      const blob = encodeMappingToBlob(mappingData).withUploadProgress((percentage) => {
        // Map 30-90% to blob upload progress
        setUploadProgress(30 + (percentage * 0.6));
      });

      setUploadProgress(90);

      // Save to backend
      try {
        await saveMappingWorkbook.mutateAsync(blob);
        setUploadProgress(100);
        setUploadSuccess(true);
        setLastUploadSummary({ totalEntries, sheetNames });
        
        // Clear success message after 5 seconds
        setTimeout(() => setUploadSuccess(false), 5000);
      } catch (saveErr: any) {
        setSaveError(getUserFacingError(saveErr));
      }
    } catch (parseErr: any) {
      setParseError(getUserFacingError(parseErr));
    } finally {
      setIsUploading(false);
      e.target.value = '';
      // Reset progress after a delay
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Determine which summary to show
  const summaryToShow = lastUploadSummary || existingSummary;
  const showSummary = !isUploading && summaryToShow && summaryToShow.totalEntries > 0;

  return (
    <div className="space-y-6">
      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Karigar Mapping</h2>
        <p className="text-muted-foreground">
          Upload karigar mapping file to enrich orders with generic names and karigar assignments
        </p>
      </div>

      {/* Actor error state */}
      {isError && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Parse error */}
      {parseError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-wrap">{parseError}</AlertDescription>
        </Alert>
      )}

      {/* Save error */}
      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Success message */}
      {uploadSuccess && (
        <Alert className="border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription>Karigar mapping uploaded successfully!</AlertDescription>
        </Alert>
      )}

      {/* Mapping summary */}
      {showSummary && (
        <Alert className="border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Current Mapping Summary</div>
              <div className="text-sm">
                <span className="font-semibold">{summaryToShow.totalEntries}</span> design-karigar mappings loaded
                {summaryToShow.sheetNames.length > 0 && (
                  <span className="ml-2 text-muted-foreground">
                    (from sheet{summaryToShow.sheetNames.length > 1 ? 's' : ''}: {summaryToShow.sheetNames.join(', ')})
                  </span>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload Mapping File</CardTitle>
          <CardDescription>
            Upload an Excel file (.xlsx/.xls) or PDF containing design codes and karigar assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mapping-file">Select File</Label>
            <Input
              id="mapping-file"
              type="file"
              accept=".xlsx,.xls,.pdf"
              onChange={handleMappingUpload}
              disabled={isUploading || !isReady}
            />
          </div>

          {isUploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {existingMapping && !isUploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>A mapping file is currently loaded</span>
            </div>
          )}

          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <h4 className="font-medium text-sm">File Format Requirements</h4>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Excel files:</strong> Can use any sheet name (e.g., "Sheet1") as long as it contains the required columns.
                If your file has sheets named "1", "2", or "3", those will be checked first in priority order (1 → 3 → 2).
              </p>
              <p>
                <strong>Required columns:</strong>
              </p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><strong>Design Code</strong> (or "Design", "Product Code", "Item Code")</li>
                <li><strong>Karigar</strong> (or "Artisan", "Worker", "Craftsman")</li>
              </ul>
              <p>
                <strong>Optional columns:</strong>
              </p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><strong>Name</strong> (or "Generic Name", "Product Name", "Description") - for generic product names</li>
              </ul>
              <p className="text-xs mt-2">
                <strong>Note:</strong> Screenshots and images cannot be parsed. Please use Excel or PDF files only.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
