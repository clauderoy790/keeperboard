'use client';

import { useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface ImportScore {
  player_name: string;
  score: number;
  player_guid?: string;
}

interface ImportWizardProps {
  gameId: string;
  leaderboardId: string;
  onComplete: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'import';
type ImportFormat = 'csv' | 'json';

export default function ImportWizard({
  gameId,
  leaderboardId,
  onComplete,
}: ImportWizardProps) {
  const [step, setStep] = useState<Step>('upload');
  const [format, setFormat] = useState<ImportFormat>('csv');
  const [rawData, setRawData] = useState('');
  const [parsedScores, setParsedScores] = useState<ImportScore[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    player_name: 0,
    score: 1,
    player_guid: -1, // Optional column
  });
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update'>(
    'skip'
  );
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV
  const parseCSV = (csv: string): string[][] => {
    const lines = csv.trim().split('\n');
    return lines.map((line) =>
      line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
    );
  };

  // Parse JSON
  const parseJSON = (json: string): any[] => {
    return JSON.parse(json);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawData(content);
    };
    reader.readAsText(file);
  };

  const handleNextFromUpload = () => {
    if (!rawData.trim()) {
      alert('Please paste or upload data first');
      return;
    }

    try {
      if (format === 'csv') {
        const rows = parseCSV(rawData);
        if (rows.length < 2) {
          throw new Error('CSV must have at least a header row and one data row');
        }
        // Skip to preview for CSV (assume first column is player_name, second is score)
        const scores: ImportScore[] = rows.slice(1).map((row) => ({
          player_name: row[columnMapping.player_name] || '',
          score: parseFloat(row[columnMapping.score]) || 0,
          player_guid:
            columnMapping.player_guid >= 0
              ? row[columnMapping.player_guid]
              : undefined,
        }));
        setParsedScores(scores);
        setStep('preview');
      } else {
        // JSON format
        const data = parseJSON(rawData);
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('JSON must be an array with at least one item');
        }
        // Check if data has player_name and score fields
        const firstItem = data[0];
        if (!firstItem.player_name || typeof firstItem.score !== 'number') {
          throw new Error(
            'JSON objects must have "player_name" (string) and "score" (number) fields'
          );
        }
        setParsedScores(data);
        setStep('preview');
      }
    } catch (error: any) {
      alert(`Failed to parse ${format.toUpperCase()}: ${error.message}`);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const response = await fetch(
        `/api/games/${gameId}/leaderboards/${leaderboardId}/import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scores: parsedScores,
            duplicateHandling,
            importSource: format,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResult(result);
      setStep('import');
    } catch (error: any) {
      alert(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setRawData('');
    setParsedScores([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Step 1: Upload
  if (step === 'upload') {
    return (
      <Card title="Import Scores" description="Step 1: Choose format and paste/upload data">
        <div className="space-y-6">
          {/* Format tabs */}
          <div className="flex gap-2 border-b border-cyan-500/20 pb-4">
            <button
              onClick={() => setFormat('csv')}
              className={`px-4 py-2 font-mono text-sm transition-all ${
                format === 'csv'
                  ? 'text-cyan-400 border-b-2 border-cyan-500'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              CSV
            </button>
            <button
              onClick={() => setFormat('json')}
              className={`px-4 py-2 font-mono text-sm transition-all ${
                format === 'json'
                  ? 'text-cyan-400 border-b-2 border-cyan-500'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              JSON
            </button>
          </div>

          {/* Format instructions */}
          <div className="bg-neutral-800/50 border border-cyan-500/20 p-4 rounded">
            <h4 className="text-sm font-mono text-cyan-400 font-semibold mb-2">
              Expected Format:
            </h4>
            {format === 'csv' ? (
              <pre className="text-xs font-mono text-neutral-300 overflow-x-auto">
{`player_name,score
Champion,5000
Runner,4500
ThirdPlace,4000`}
              </pre>
            ) : (
              <pre className="text-xs font-mono text-neutral-300 overflow-x-auto">
{`[
  { "player_name": "Champion", "score": 5000 },
  { "player_name": "Runner", "score": 4500 },
  { "player_name": "ThirdPlace", "score": 4000 }
]`}
              </pre>
            )}
            <p className="text-xs font-mono text-neutral-500 mt-2">
              Optional: Include <code className="text-cyan-400">player_guid</code> field to link scores to existing players
            </p>
          </div>

          {/* Text area */}
          <div>
            <label className="block text-xs font-mono text-neutral-400 uppercase tracking-wider mb-2">
              Paste Data
            </label>
            <textarea
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              placeholder={`Paste your ${format.toUpperCase()} data here...`}
              rows={10}
              className="w-full bg-neutral-800 border border-cyan-500/30 text-neutral-200 font-mono text-sm p-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-xs font-mono text-neutral-400 uppercase tracking-wider mb-2">
              Or Upload File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={format === 'csv' ? '.csv' : '.json'}
              onChange={handleFileUpload}
              className="block w-full text-sm text-neutral-400 font-mono
                file:mr-4 file:py-2 file:px-4
                file:border-0
                file:text-sm file:font-mono file:font-semibold
                file:bg-cyan-500 file:text-black
                hover:file:bg-cyan-400
                file:cursor-pointer cursor-pointer"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleNextFromUpload} className="flex-1">
              Next: Preview Data →
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Step 3: Preview
  if (step === 'preview') {
    const previewCount = Math.min(parsedScores.length, 10);
    return (
      <Card
        title="Import Scores"
        description={`Step 2: Preview data (showing first ${previewCount} of ${parsedScores.length} scores)`}
      >
        <div className="space-y-6">
          {/* Preview table */}
          <div className="overflow-x-auto">
            <table className="w-full border border-cyan-500/20">
              <thead className="bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-mono text-cyan-400 uppercase tracking-wider border-b border-cyan-500/20">
                    Player Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-mono text-cyan-400 uppercase tracking-wider border-b border-cyan-500/20">
                    Score
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-mono text-cyan-400 uppercase tracking-wider border-b border-cyan-500/20">
                    Player GUID
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsedScores.slice(0, previewCount).map((score, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-cyan-500/10 hover:bg-neutral-800/30"
                  >
                    <td className="px-4 py-2 text-sm font-mono text-neutral-300">
                      {score.player_name}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono text-neutral-300">
                      {score.score}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono text-neutral-500">
                      {score.player_guid || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Duplicate handling */}
          <div>
            <label className="block text-xs font-mono text-neutral-400 uppercase tracking-wider mb-2">
              Duplicate Handling
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="duplicate"
                  value="skip"
                  checked={duplicateHandling === 'skip'}
                  onChange={() => setDuplicateHandling('skip')}
                  className="text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm font-mono text-neutral-300">
                  Skip existing players (recommended)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="duplicate"
                  value="update"
                  checked={duplicateHandling === 'update'}
                  onChange={() => setDuplicateHandling('update')}
                  className="text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm font-mono text-neutral-300">
                  Update existing players with new scores
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={handleReset} className="flex-1">
              ← Back
            </Button>
            <Button
              onClick={handleImport}
              loading={importing}
              className="flex-1"
            >
              Import {parsedScores.length} Scores
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Step 4: Import complete
  if (step === 'import' && importResult) {
    return (
      <Card title="Import Complete" description="Score import finished">
        <div className="space-y-6">
          {/* Results summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded">
              <div className="text-3xl font-mono font-bold text-green-400">
                {importResult.successCount}
              </div>
              <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider mt-1">
                Imported
              </div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded">
              <div className="text-3xl font-mono font-bold text-yellow-400">
                {importResult.skipCount}
              </div>
              <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider mt-1">
                Skipped
              </div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded">
              <div className="text-3xl font-mono font-bold text-red-400">
                {importResult.errorCount}
              </div>
              <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider mt-1">
                Errors
              </div>
            </div>
          </div>

          {/* Error messages */}
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded">
              <h4 className="text-sm font-mono text-red-400 font-semibold mb-2">
                Errors:
              </h4>
              <ul className="space-y-1">
                {importResult.errors.map((error: string, idx: number) => (
                  <li key={idx} className="text-xs font-mono text-red-300">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={handleReset} className="flex-1">
              Import More Scores
            </Button>
            <Button onClick={onComplete} className="flex-1">
              View Leaderboard
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return null;
}
