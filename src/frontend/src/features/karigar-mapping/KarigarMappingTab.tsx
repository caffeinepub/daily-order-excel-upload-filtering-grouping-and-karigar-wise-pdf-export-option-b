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

  const { isReady, isError } = useActorWithStatus();
  const { data: existingMapping } = useGetKarigarMappingWorkbook();
  const saveMappingWorkbook = useSaveKarigarMappingWorkbook();
  
  // Get summary of existing mapping
  const { summary: existingSummary } = useKarigarMappingSummary(existingMapping || null);

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
        // Map 30-90% to upload progress
        setUploadProgress(30 + (percentage * 0.6));
      });

      setUploadProgress(90);

      // Save to backend
      await saveMappingWorkbook.mutateAsync(blob);
      
      setUploadProgress(100);
      setUploadSuccess(true);
      setLastUploadSummary({ totalEntries, sheetNames });

      // Clear the input
      e.target.value = '';

      // Clear success message after 5 seconds
      setTimeout(() => {
        setUploadSuccess(false);
      }, 5000);
    } catch (error: any) {
      console.error('Mapping upload error:', error);
      const userError = getUserFacingError(error);
      setParseError(userError);
      e.target.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Master Design File</CardTitle>
          <CardDescription>
            Upload an Excel or PDF file containing design-to-karigar mappings with three required columns:
            Design Code, Generic Name, and Karigar Name
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Backend connection error. Please refresh the page and try again.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="mapping-file">Master Design File (.xlsx, .xls, or .pdf)</Label>
            <Input
              id="mapping-file"
              type="file"
              accept=".xlsx,.xls,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf"
              onChange={handleMappingUpload}
              disabled={isUploading || !isReady}
            />
          </div>

          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {uploadProgress < 30 && 'Parsing file...'}
                {uploadProgress >= 30 && uploadProgress < 90 && 'Uploading...'}
                {uploadProgress >= 90 && 'Saving...'}
              </p>
            </div>
          )}

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-wrap">
                {parseError}
              </AlertDescription>
            </Alert>
          )}

          {saveError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-wrap">
                {saveError}
              </AlertDescription>
            </Alert>
          )}

          {uploadSuccess && lastUploadSummary && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <div className="font-medium mb-1">Mapping uploaded successfully!</div>
                <div className="text-sm">
                  Total entries: {lastUploadSummary.totalEntries}
                  {lastUploadSummary.sheetNames.length > 0 && (
                    <div className="mt-1">
                      Sheets: {lastUploadSummary.sheetNames.join(', ')}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {existingSummary && !uploadSuccess && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Current mapping loaded</div>
                <div className="text-sm">
                  Total entries: {existingSummary.totalEntries}
                  {existingSummary.sheetNames.length > 0 && (
                    <div className="mt-1">
                      Sheets: {existingSummary.sheetNames.join(', ')}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>File Format Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Required Columns (all three must be present):</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                <li><strong>Design Code</strong> - The unique design identifier</li>
                <li><strong>Generic Name</strong> - The product name or description</li>
                <li><strong>Karigar Name</strong> - The artisan assigned to this design</li>
              </ul>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Supported Formats:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                <li>Excel files (.xlsx, .xls) - Multiple sheets supported</li>
                <li>PDF files with tabular data</li>
              </ul>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">
                The file will be scanned for sheets containing all three required columns.
                Sheets missing any required column will be skipped with a detailed error message.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
