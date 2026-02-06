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
      const mappingData: KarigarMappingData = {};
      for (const [sheetName, sheet] of Object.entries(parsedMapping)) {
        mappingData[sheetName] = {
          entries: Array.from(sheet.entries.values()),
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
          <AlertDescription>
            <div>
              <p className="font-medium">Backend connection error</p>
              <p className="text-sm">{getUserFacingError(error)}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Actor loading state */}
      {!isReady && !isError && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Connecting to backend...</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Mapping File
            </CardTitle>
            <CardDescription>
              Upload Excel (.xlsx, .xls) or PDF file containing karigar mappings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="mapping-upload" className="cursor-pointer">
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-muted-foreground/50">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isUploading ? 'Uploading...' : !isReady ? 'Connecting...' : 'Click to upload'}
                  </p>
                </div>
              </div>
              <Input
                id="mapping-upload"
                type="file"
                accept=".xlsx,.xls,.pdf"
                onChange={handleMappingUpload}
                disabled={isUploading || !isReady}
                className="hidden"
              />
            </Label>

            {isUploading && uploadProgress > 0 && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  {uploadProgress < 30 && 'Parsing file...'}
                  {uploadProgress >= 30 && uploadProgress < 90 && 'Uploading to backend...'}
                  {uploadProgress >= 90 && 'Saving...'}
                </p>
              </div>
            )}

            {existingMapping && !isUploading && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Mapping file uploaded
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status and Info */}
        <div className="space-y-6">
          {uploadSuccess && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Karigar mapping uploaded successfully! Orders in the Order List will now show enriched data.
              </AlertDescription>
            </Alert>
          )}

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {saveError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div>
                  <p className="font-medium">Failed to save mapping</p>
                  <p className="text-sm">{saveError}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Upload a karigar mapping file (Excel or PDF) containing design codes, generic names, and karigar assignments.
              </p>
              <p>
                The system will automatically match orders in the Order List with the mapping data based on design codes.
              </p>
              <p>
                Matched orders will display the generic product name and assigned karigar, making it easier to organize and export orders.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expected File Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium">Excel files:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Sheets named "1", "2", or "3"</li>
                <li>Columns: Design Code, Generic Name, Karigar</li>
                <li>Headers detected automatically</li>
              </ul>
              <p className="font-medium mt-3">PDF files:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Tabular data with design codes</li>
                <li>Generic names and karigar assignments</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
