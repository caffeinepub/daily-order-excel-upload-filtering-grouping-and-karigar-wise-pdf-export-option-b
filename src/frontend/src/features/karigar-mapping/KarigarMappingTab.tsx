import { useState } from 'react';
import { Upload, AlertCircle, FileText, CheckCircle } from 'lucide-react';
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

export default function KarigarMappingTab() {
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const { isReady, isError, error } = useActorWithStatus();
  const { data: existingMapping } = useGetKarigarMappingWorkbook();
  const saveMappingWorkbook = useSaveKarigarMappingWorkbook();

  const handleMappingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isReady) {
      setParseError('Backend not ready. Please wait a moment and try again.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setParseError(null);
    setSaveError(null);
    setUploadSuccess(false);
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
        
        // Clear success message after 3 seconds
        setTimeout(() => setUploadSuccess(false), 3000);
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

      <Card>
        <CardHeader>
          <CardTitle>Upload Mapping File</CardTitle>
          <CardDescription>
            Upload an Excel file (.xlsx) or PDF with sheets named "1", "2", or "3" containing design codes and karigar assignments
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
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
              <FileText className="h-4 w-4" />
              <span>A mapping file is currently loaded</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>File Format Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>The mapping file should contain sheets named "1", "2", or "3" with the following columns:</p>
          <ul className="list-inside list-disc space-y-1 pl-4">
            <li><strong>Design Code / Product Code</strong> - The design identifier</li>
            <li><strong>Karigar / Artisan</strong> - The karigar name</li>
            <li><strong>Name / Generic Name</strong> (optional) - The generic product name</li>
          </ul>
          <p className="pt-2">
            The parser will automatically detect these columns based on header names. Sheets 1 and 3 take priority over sheet 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
