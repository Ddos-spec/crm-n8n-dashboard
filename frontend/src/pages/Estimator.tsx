import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Eye,
  Ruler,
  Package,
  LayoutGrid,
  Calculator,
  RotateCcw,
  Settings,
  Layers,
  ChevronRight,
  ChevronLeft,
  X,
  FileImage,
  Check,
  AlertCircle,
  Download,
  ZoomIn,
  ZoomOut,
  Move,
  Fuel,
  Clock,
  Percent,
  FileDown,
  Square,
  MousePointer,
  Trash2,
  SkipForward
} from 'lucide-react';
import { api } from '../lib/api';
import './Estimator.css';

// Types
interface FileData {
  file: File;
  preview: string;
  type: 'svg' | 'dxf' | 'image';
  dimensions?: { width: number; height: number };
  paths?: PathData[];
}

interface PathData {
  id: string;
  d: string;
  length: number;
  selected: boolean;
}

interface SelectionArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
}

interface Material {
  id: string;
  name: string;
  thickness: number[];
  pricePerMeter: number;
  cuttingSpeed: number; // mm/min for 1mm thickness
  gasType: 'oxygen' | 'nitrogen' | 'air';
}

interface NestingResult {
  sheetWidth: number;
  sheetHeight: number;
  utilization: number;
  wastePercent: number;
  positions: { x: number; y: number; rotation: number }[];
  partsPerSheet: number;
  totalSheets: number;
}

interface EstimationResult {
  totalCuttingLength: number;
  cuttingTime: number;
  materialCost: number;
  laborCost: number;
  gasCost: number;
  totalCost: number;
  pricePerPiece: number;
  gasUsage: number; // m³
  processedArea: number; // mm²
  totalSheets: number;
  wastePercent: number;
}

interface SettingsData {
  laborCostPerMinute: number;
  machineType: string;
  machinePower: number; // Watt
  defaultSheetWidth: number;
  defaultSheetHeight: number;
  sheetPricePerM2: number;
  gasPrice: number; // per m³
  gasTankVolume: number; // m³
  gasFlowRate: number; // L/min
  materials: Material[];
}

// Cutting speeds for Fiber Laser 1500W (mm/min) based on material and thickness
const CUTTING_SPEEDS: Record<string, Record<number, number>> = {
  ss304: { 0.5: 35000, 1: 25000, 1.5: 18000, 2: 12000, 3: 6000 },
  ss316: { 0.5: 32000, 1: 22000, 1.5: 16000, 2: 10000, 3: 5000 },
  ms: { 1: 28000, 2: 18000, 3: 12000, 4: 8000, 5: 5000, 6: 3500 },
  aluminum: { 1: 30000, 2: 20000, 3: 12000, 4: 7000, 5: 4000 },
  galvanized: { 0.5: 35000, 1: 25000, 1.5: 18000, 2: 12000 },
};

const DEFAULT_MATERIALS: Material[] = [
  { id: 'ms', name: 'Besi (Mild Steel)', thickness: [1, 2, 3, 4, 5, 6], pricePerMeter: 8000, cuttingSpeed: 4000, gasType: 'oxygen' },
  { id: 'ss304', name: 'Stainless Steel 304', thickness: [0.5, 1, 1.5, 2, 3], pricePerMeter: 15000, cuttingSpeed: 3000, gasType: 'nitrogen' },
  { id: 'galvanized', name: 'Galvanis', thickness: [0.5, 1, 1.5, 2], pricePerMeter: 10000, cuttingSpeed: 3500, gasType: 'oxygen' },
  { id: 'aluminum', name: 'Aluminium', thickness: [1, 2, 3, 4, 5], pricePerMeter: 12000, cuttingSpeed: 5000, gasType: 'nitrogen' },
];

const DEFAULT_SETTINGS: SettingsData = {
  laborCostPerMinute: 1500,
  machineType: 'Fiber Laser 1500W',
  machinePower: 1500,
  defaultSheetWidth: 1220,
  defaultSheetHeight: 2440,
  sheetPricePerM2: 150000, // Rp per m²
  gasPrice: 50000, // Rp per m³
  gasTankVolume: 6, // m³ per tank
  gasFlowRate: 20, // L/min
  materials: DEFAULT_MATERIALS,
};

const STEPS = [
  { id: 1, name: 'Upload', subtitle: 'Unggah file desain', icon: Upload },
  { id: 2, name: 'Preview', subtitle: 'Pratinjau & seleksi', icon: Eye },
  { id: 3, name: 'Skala', subtitle: 'Atur skala & unit', icon: Ruler },
  { id: 4, name: 'Material', subtitle: 'Pilih material', icon: Package },
  { id: 5, name: 'Nesting', subtitle: 'Simulasi layout', icon: LayoutGrid },
  { id: 6, name: 'Hasil', subtitle: 'Estimasi biaya', icon: Calculator },
];

const GAS_NAMES: Record<string, string> = {
  oxygen: 'Oksigen (O₂)',
  nitrogen: 'Nitrogen (N₂)',
  air: 'Udara Kompresi',
};

export default function Estimator() {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<FileData[]>([]);
  const [scale, setScale] = useState({ value: 1, unit: 'mm' as 'mm' | 'cm' | 'inch' });
  const [scaleBarLength, setScaleBarLength] = useState(100); // mm
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [selectedThickness, setSelectedThickness] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [nestingResult, setNestingResult] = useState<NestingResult | null>(null);
  const [estimation, setEstimation] = useState<EstimationResult | null>(null);
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // Area selection state
  const [selections, setSelections] = useState<SelectionArea[]>([]);
  const [selectionMode, setSelectionMode] = useState<'select' | 'pan'>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [, setUseAreaSelection] = useState(false); // Track if user chose to use area selection

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLDivElement>(null);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('estimator-settings-v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: SettingsData) => {
    setSettings(newSettings);
    localStorage.setItem('estimator-settings-v2', JSON.stringify(newSettings));
  };

  // File handling
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add('drag-over');
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('drag-over');
    }
  }, []);

  const processFile = async (file: File): Promise<FileData | null> => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !['svg', 'dxf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      setError('Format file tidak didukung. Gunakan SVG, DXF, atau gambar (PNG, JPG).');
      return null;
    }

    const type: FileData['type'] = ext === 'svg' ? 'svg' : ext === 'dxf' ? 'dxf' : 'image';

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await api.uploadEstimatorFile(formData);

      if (result.success) {
        setIsProcessing(false);
        return {
          file,
          preview: result.preview || '',
          type,
          dimensions: result.dimensions || { width: 100, height: 100 },
          paths: result.paths || [],
        };
      } else {
        setError(result.error || 'Gagal memproses file');
        setIsProcessing(false);
        return null;
      }
    } catch (err) {
      console.error('File processing failed', err);
      setError('Gagal memproses file. Silakan coba lagi.');
      setIsProcessing(false);
      return null;
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('drag-over');
    }

    const droppedFiles = Array.from(e.dataTransfer.files);
    setError(null);

    for (const file of droppedFiles) {
      const processed = await processFile(file);
      if (processed) {
        setFiles(prev => [...prev, processed]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError(null);

    for (const file of selectedFiles) {
      const processed = await processFile(file);
      if (processed) {
        setFiles(prev => [...prev, processed]);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Get cutting speed based on material and thickness
  const getCuttingSpeed = (materialId: string, thickness: number): number => {
    const speeds = CUTTING_SPEEDS[materialId];
    if (speeds && speeds[thickness]) {
      return speeds[thickness];
    }
    // Fallback: estimate based on default speed with thickness factor
    const material = settings.materials.find(m => m.id === materialId);
    const baseSpeed = material?.cuttingSpeed || 3000;
    return baseSpeed * (1 / Math.sqrt(thickness));
  };

  // Calculate nesting with improved algorithm
  const calculateNesting = () => {
    if (files.length === 0) return;

    const file = files[0];
    const dims = file.dimensions || { width: 100, height: 100 };
    const unitMultiplier = scale.unit === 'cm' ? 10 : scale.unit === 'inch' ? 25.4 : 1;
    const scaledWidth = dims.width * scale.value * unitMultiplier;
    const scaledHeight = dims.height * scale.value * unitMultiplier;

    const sheetW = settings.defaultSheetWidth;
    const sheetH = settings.defaultSheetHeight;
    const gap = 5; // 5mm gap between parts

    // Check if part is too large for the sheet
    const minPartDim = Math.min(scaledWidth, scaledHeight);
    const maxPartDim = Math.max(scaledWidth, scaledHeight);
    const minSheetDim = Math.min(sheetW, sheetH);
    const maxSheetDim = Math.max(sheetW, sheetH);

    if (minPartDim + gap > minSheetDim || maxPartDim + gap > maxSheetDim) {
      // Part doesn't fit on sheet in any orientation
      setError(`Part terlalu besar (${scaledWidth.toFixed(0)}x${scaledHeight.toFixed(0)} mm) untuk sheet (${sheetW}x${sheetH} mm). Kurangi skala atau gunakan sheet yang lebih besar.`);
      setNestingResult({
        sheetWidth: sheetW,
        sheetHeight: sheetH,
        utilization: 0,
        wastePercent: 100,
        positions: [],
        partsPerSheet: 0,
        totalSheets: 0,
      });
      return;
    }

    // Clear any previous error
    setError(null);

    // Try both orientations
    const cols1 = Math.floor(sheetW / (scaledWidth + gap));
    const rows1 = Math.floor(sheetH / (scaledHeight + gap));
    const perSheet1 = cols1 * rows1;

    const cols2 = Math.floor(sheetW / (scaledHeight + gap));
    const rows2 = Math.floor(sheetH / (scaledWidth + gap));
    const perSheet2 = cols2 * rows2;

    // Choose better orientation
    const useRotated = perSheet2 > perSheet1;
    const cols = useRotated ? cols2 : cols1;
    const rows = useRotated ? rows2 : rows1;
    const partsPerSheet = Math.max(perSheet1, perSheet2);
    const partW = useRotated ? scaledHeight : scaledWidth;
    const partH = useRotated ? scaledWidth : scaledHeight;

    // Safety check - ensure partsPerSheet is at least 1 to prevent division by zero
    const safePartsPerSheet = Math.max(1, partsPerSheet);
    const totalSheets = Math.ceil(quantity / safePartsPerSheet);

    const positions = [];
    const partsToPlace = Math.min(partsPerSheet, quantity);

    for (let r = 0; r < rows && positions.length < partsToPlace; r++) {
      for (let c = 0; c < cols && positions.length < partsToPlace; c++) {
        positions.push({
          x: c * (partW + gap) + gap,
          y: r * (partH + gap) + gap,
          rotation: useRotated ? 90 : 0,
        });
      }
    }

    const usedArea = positions.length * scaledWidth * scaledHeight;
    const sheetArea = sheetW * sheetH;
    const utilization = (usedArea / sheetArea) * 100;
    const wastePercent = 100 - utilization;

    setNestingResult({
      sheetWidth: sheetW,
      sheetHeight: sheetH,
      utilization,
      wastePercent,
      positions,
      partsPerSheet,
      totalSheets,
    });
  };

  // Calculate estimation with gas and more details
  const calculateEstimation = () => {
    if (!selectedMaterial || !nestingResult) return;

    // Don't calculate if parts don't fit on sheet
    if (nestingResult.partsPerSheet === 0 || nestingResult.totalSheets === 0) {
      setEstimation(null);
      return;
    }

    const material = settings.materials.find(m => m.id === selectedMaterial);
    if (!material) return;

    const unitMultiplier = scale.unit === 'cm' ? 10 : scale.unit === 'inch' ? 25.4 : 1;

    // Calculate total cutting length from selected paths
    let totalLengthPerPart = 0;
    files.forEach(f => {
      f.paths?.forEach(p => {
        if (p.selected) {
          totalLengthPerPart += p.length * scale.value * unitMultiplier;
        }
      });
    });
    const totalCuttingLength = totalLengthPerPart * quantity;

    // Calculate cutting time using accurate speeds
    const cuttingSpeed = getCuttingSpeed(selectedMaterial, selectedThickness);
    const cuttingTime = totalCuttingLength / cuttingSpeed;

    // Calculate processed area
    const dims = files[0]?.dimensions || { width: 100, height: 100 };
    const partArea = dims.width * dims.height * scale.value * scale.value * unitMultiplier * unitMultiplier;
    const processedArea = partArea * quantity;

    // Calculate gas usage (L/min * time in min, converted to m³)
    const gasUsage = (settings.gasFlowRate * cuttingTime) / 1000;
    const gasCost = gasUsage * settings.gasPrice;

    // Calculate material cost (sheet cost)
    const sheetArea = (settings.defaultSheetWidth * settings.defaultSheetHeight) / 1000000; // m²
    const sheetCost = sheetArea * settings.sheetPricePerM2;
    const materialCost = sheetCost * nestingResult.totalSheets;

    // Calculate labor cost
    const laborCost = cuttingTime * settings.laborCostPerMinute;

    // Total cost
    const totalCost = materialCost + laborCost + gasCost;
    const pricePerPiece = totalCost / quantity;

    setEstimation({
      totalCuttingLength,
      cuttingTime,
      materialCost,
      laborCost,
      gasCost,
      totalCost,
      pricePerPiece,
      gasUsage,
      processedArea,
      totalSheets: nestingResult.totalSheets,
      wastePercent: nestingResult.wastePercent,
    });
  };

  // Export nesting to DXF
  const exportNestingToDXF = () => {
    if (!nestingResult || !files[0]) return;

    const dims = files[0].dimensions || { width: 100, height: 100 };
    const unitMultiplier = scale.unit === 'cm' ? 10 : scale.unit === 'inch' ? 25.4 : 1;
    const w = dims.width * scale.value * unitMultiplier;
    const h = dims.height * scale.value * unitMultiplier;

    let dxfContent = `0
SECTION
2
ENTITIES
`;

    // Add sheet boundary
    dxfContent += `0
LWPOLYLINE
8
SHEET_BOUNDARY
90
4
70
1
10
0
20
0
10
${nestingResult.sheetWidth}
20
0
10
${nestingResult.sheetWidth}
20
${nestingResult.sheetHeight}
10
0
20
${nestingResult.sheetHeight}
`;

    // Add parts as rectangles
    nestingResult.positions.forEach((pos, idx) => {
      const isRotated = pos.rotation === 90;
      const partW = isRotated ? h : w;
      const partH = isRotated ? w : h;

      dxfContent += `0
LWPOLYLINE
8
PART_${idx + 1}
90
4
70
1
10
${pos.x}
20
${pos.y}
10
${pos.x + partW}
20
${pos.y}
10
${pos.x + partW}
20
${pos.y + partH}
10
${pos.x}
20
${pos.y + partH}
`;
    });

    dxfContent += `0
ENDSEC
0
EOF`;

    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nesting_${files[0].file.name.replace(/\.[^.]+$/, '')}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Navigation
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return files.length > 0;
      case 2: {
        // Step 2 now uses action buttons (skip/apply), not the main nav
        // But we still allow proceeding if there are any paths or selections
        const hasSelectedPaths = files.some(f => f.paths && f.paths.some(p => p.selected));
        const hasSelectedAreas = selections.some(s => s.selected);
        return hasSelectedPaths || hasSelectedAreas || files.length > 0;
      }
      case 3: return scale.value > 0;
      case 4: return selectedMaterial !== '' && selectedThickness > 0;
      case 5: return nestingResult !== null;
      default: return true;
    }
  };

  const nextStep = () => {
    if (currentStep === 4) {
      calculateNesting();
    }
    if (currentStep === 5) {
      calculateEstimation();
    }
    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const reset = () => {
    setCurrentStep(1);
    setFiles([]);
    setScale({ value: 1, unit: 'mm' });
    setScaleBarLength(100);
    setSelectedMaterial('');
    setSelectedThickness(0);
    setQuantity(1);
    setNestingResult(null);
    setEstimation(null);
    setError(null);
    setZoom(1);
    setSelections([]);
    setUseAreaSelection(false);
    setSelectionMode('select');
  };

  // Area selection mouse handlers
  const handlePreviewMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectionMode !== 'select' || !previewCanvasRef.current) return;

    const rect = previewCanvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setIsDrawing(true);
    setDrawStart({ x, y });
    setCurrentSelection({ x, y, width: 0, height: 0 });
  };

  const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart || !previewCanvasRef.current) return;

    const rect = previewCanvasRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / zoom;
    const currentY = (e.clientY - rect.top) / zoom;

    const x = Math.min(drawStart.x, currentX);
    const y = Math.min(drawStart.y, currentY);
    const width = Math.abs(currentX - drawStart.x);
    const height = Math.abs(currentY - drawStart.y);

    setCurrentSelection({ x, y, width, height });
  };

  const handlePreviewMouseUp = () => {
    if (!isDrawing || !currentSelection) {
      setIsDrawing(false);
      return;
    }

    // Only add if selection has meaningful size (at least 10x10 pixels)
    if (currentSelection.width > 10 && currentSelection.height > 10) {
      const newSelection: SelectionArea = {
        id: `sel-${Date.now()}`,
        ...currentSelection,
        selected: true,
      };
      setSelections(prev => [...prev, newSelection]);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentSelection(null);
  };

  const removeSelection = (id: string) => {
    setSelections(prev => prev.filter(s => s.id !== id));
  };

  const toggleSelectionSelected = (id: string) => {
    setSelections(prev =>
      prev.map(s => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const clearAllSelections = () => {
    setSelections([]);
  };

  // Skip selection and use all paths
  const skipSelection = () => {
    setUseAreaSelection(false);
    // Select all paths
    const newFiles = [...files];
    newFiles.forEach(f => {
      f.paths?.forEach(p => (p.selected = true));
    });
    setFiles(newFiles);
    nextStep();
  };

  // Use area selections to filter paths
  const applyAreaSelection = () => {
    if (selections.length === 0) {
      skipSelection();
      return;
    }

    setUseAreaSelection(true);
    // For now, select all paths (in a real implementation, we'd filter paths by area)
    // The selection areas will be used for nesting dimensions
    const newFiles = [...files];
    newFiles.forEach(f => {
      f.paths?.forEach(p => (p.selected = true));
    });
    setFiles(newFiles);
    nextStep();
  };

  // Get selected path count and total length
  const getSelectionStats = () => {
    let count = 0;
    let totalLength = 0;
    files.forEach(f => {
      f.paths?.forEach(p => {
        if (p.selected) {
          count++;
          totalLength += p.length;
        }
      });
    });
    return { count, totalLength };
  };

  // Render steps
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <h2 className="step-title">Unggah File Desain</h2>
            <p className="step-description">Upload file DXF, SVG, atau gambar untuk memulai estimasi</p>

            <div
              ref={dropZoneRef}
              className="drop-zone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,.dxf,.png,.jpg,.jpeg,.webp"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <div className="drop-zone-content">
                <div className="upload-icon">
                  <Upload size={32} />
                </div>
                <p className="drop-zone-text">Drag & drop file di sini</p>
                <p className="drop-zone-subtext">atau klik untuk memilih file</p>
                <p className="drop-zone-formats">Format: SVG, DXF, PNG, JPG</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="uploaded-files">
                <h3>File Terunggah</h3>
                <div className="file-list">
                  {files.map((f, idx) => (
                    <div key={idx} className="file-item">
                      <FileImage size={20} />
                      <span className="file-name">{f.file.name}</span>
                      <span className="file-type">{f.type.toUpperCase()}</span>
                      {f.paths && <span className="file-paths">{f.paths.length} paths</span>}
                      <button className="file-remove" onClick={(e) => { e.stopPropagation(); removeFile(idx); }}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="error-message">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>
        );

      case 2: {
        const stats = getSelectionStats();
        const selectedAreas = selections.filter(s => s.selected);
        return (
          <div className="step-content">
            <h2 className="step-title">Preview & Seleksi Area</h2>
            <p className="step-description">Gambar kotak untuk memilih area yang akan dipotong, atau skip untuk memproses semua.</p>

            <div className="preview-container">
              {/* Toolbar with mode selector */}
              <div className="preview-toolbar">
                <div className="mode-selector">
                  <button
                    className={`mode-btn ${selectionMode === 'select' ? 'active' : ''}`}
                    onClick={() => setSelectionMode('select')}
                    title="Mode Seleksi"
                  >
                    <Square size={16} />
                    <span>Seleksi</span>
                  </button>
                  <button
                    className={`mode-btn ${selectionMode === 'pan' ? 'active' : ''}`}
                    onClick={() => setSelectionMode('pan')}
                    title="Mode Pan/Geser"
                  >
                    <MousePointer size={16} />
                    <span>Pan</span>
                  </button>
                </div>
                <div className="toolbar-divider" />
                <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} title="Zoom Out">
                  <ZoomOut size={18} />
                </button>
                <span className="zoom-label">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} title="Zoom In">
                  <ZoomIn size={18} />
                </button>
                <button onClick={() => setZoom(1)} title="Reset Zoom">
                  <Move size={18} />
                </button>
              </div>

              {/* Preview canvas with selection overlay */}
              <div className="preview-canvas-wrapper">
                <div
                  ref={previewCanvasRef}
                  className={`preview-canvas selection-enabled ${selectionMode === 'select' ? 'crosshair' : ''}`}
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                  onMouseDown={handlePreviewMouseDown}
                  onMouseMove={handlePreviewMouseMove}
                  onMouseUp={handlePreviewMouseUp}
                  onMouseLeave={handlePreviewMouseUp}
                >
                  {files.map((f, idx) => (
                    <div key={idx} className="preview-item">
                      {f.preview ? (
                        <img src={f.preview} alt={f.file.name} draggable={false} />
                      ) : (
                        <div className="dxf-preview">
                          <p>Memproses file...</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Selection rectangles */}
                  {selections.map((sel, idx) => (
                    <div
                      key={sel.id}
                      className={`selection-rect ${sel.selected ? 'selected' : 'deselected'}`}
                      style={{
                        left: sel.x,
                        top: sel.y,
                        width: sel.width,
                        height: sel.height,
                      }}
                    >
                      <span className="selection-label">Area {idx + 1}</span>
                      <button
                        className="selection-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSelection(sel.id);
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Current drawing selection */}
                  {currentSelection && (
                    <div
                      className="selection-rect drawing"
                      style={{
                        left: currentSelection.x,
                        top: currentSelection.y,
                        width: currentSelection.width,
                        height: currentSelection.height,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Selection list */}
              {selections.length > 0 && (
                <div className="area-selection-list">
                  <div className="area-selection-header">
                    <h4>Area Terpilih: {selectedAreas.length}/{selections.length}</h4>
                    <button className="btn-sm btn-outline btn-danger" onClick={clearAllSelections}>
                      <Trash2 size={14} />
                      Hapus Semua
                    </button>
                  </div>
                  <div className="area-list">
                    {selections.map((sel, idx) => (
                      <label key={sel.id} className={`area-item ${sel.selected ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={sel.selected}
                          onChange={() => toggleSelectionSelected(sel.id)}
                        />
                        <span className="area-name">Area {idx + 1}</span>
                        <span className="area-dims">
                          {sel.width.toFixed(0)} × {sel.height.toFixed(0)} px
                        </span>
                        <button
                          className="area-delete"
                          onClick={(e) => {
                            e.preventDefault();
                            removeSelection(sel.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Path list (for files with detected paths) */}
              {files[0]?.paths && files[0].paths.length > 0 && (
                <div className="path-selection">
                  <div className="path-selection-header">
                    <h4>Path Terdeteksi: {files[0].paths.length}</h4>
                    <span className="selection-stats">
                      Terpilih: {stats.count} path ({stats.totalLength.toFixed(1)} unit)
                    </span>
                  </div>
                  <div className="path-list">
                    {files[0].paths.slice(0, 30).map((path, idx) => (
                      <label key={path.id} className={`path-item ${path.selected ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={path.selected}
                          onChange={(e) => {
                            const newFiles = [...files];
                            if (newFiles[0].paths) {
                              newFiles[0].paths[idx].selected = e.target.checked;
                              setFiles(newFiles);
                            }
                          }}
                        />
                        <span className="path-name">Path {idx + 1}</span>
                        <span className="path-length">{path.length.toFixed(1)} unit</span>
                      </label>
                    ))}
                    {files[0].paths.length > 30 && (
                      <p className="path-overflow">...dan {files[0].paths.length - 30} path lainnya</p>
                    )}
                  </div>
                  <div className="path-actions">
                    <button className="btn-sm" onClick={() => {
                      const newFiles = [...files];
                      newFiles[0].paths?.forEach(p => p.selected = true);
                      setFiles(newFiles);
                    }}>Pilih Semua</button>
                    <button className="btn-sm btn-outline" onClick={() => {
                      const newFiles = [...files];
                      newFiles[0].paths?.forEach(p => p.selected = false);
                      setFiles(newFiles);
                    }}>Hapus Semua</button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="selection-actions">
                <button className="btn-secondary" onClick={skipSelection}>
                  <SkipForward size={18} />
                  Skip - Gunakan Semua
                </button>
                {selections.length > 0 && (
                  <button className="btn-primary" onClick={applyAreaSelection}>
                    <Check size={18} />
                    Gunakan {selectedAreas.length} Area Terpilih
                  </button>
                )}
              </div>

              {/* Instructions */}
              <div className="selection-help">
                <AlertCircle size={14} />
                <span>
                  {selectionMode === 'select'
                    ? 'Klik dan drag untuk menggambar kotak seleksi. Anda bisa membuat beberapa area.'
                    : 'Mode Pan aktif. Klik dan drag untuk menggeser preview.'}
                </span>
              </div>
            </div>
          </div>
        );
      }

      case 3:
        return (
          <div className="step-content">
            <h2 className="step-title">Atur Skala & Unit</h2>
            <p className="step-description">Tentukan skala dan satuan ukuran desain Anda</p>

            <div className="scale-settings">
              <div className="scale-row">
                <div className="setting-group">
                  <label>Skala Gambar</label>
                  <div className="scale-input">
                    <span>1 :</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={scale.value}
                      onChange={(e) => setScale(prev => ({ ...prev, value: parseFloat(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                <div className="setting-group">
                  <label>Unit</label>
                  <div className="unit-buttons">
                    {(['mm', 'cm', 'inch'] as const).map(unit => (
                      <button
                        key={unit}
                        className={`unit-btn ${scale.unit === unit ? 'active' : ''}`}
                        onClick={() => setScale(prev => ({ ...prev, unit }))}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-group">
                  <label>Jumlah Potong</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="quantity-input"
                  />
                </div>
              </div>

              {/* Scale Bar Reference */}
              <div className="scale-bar-section">
                <h4>Skala Batang Referensi</h4>
                <p className="hint">Gunakan sebagai referensi untuk memastikan skala sudah benar</p>
                <div className="scale-bar-input">
                  <label>Panjang Referensi:</label>
                  <input
                    type="number"
                    min="1"
                    value={scaleBarLength}
                    onChange={(e) => setScaleBarLength(parseInt(e.target.value) || 100)}
                  />
                  <span>{scale.unit}</span>
                </div>
                <div className="scale-bar-preview">
                  <div
                    className="scale-bar"
                    style={{
                      width: `${Math.min(300, scaleBarLength * (scale.unit === 'cm' ? 10 : scale.unit === 'inch' ? 25.4 : 1) * scale.value / 2)}px`
                    }}
                  >
                    <span className="scale-bar-label">{scaleBarLength} {scale.unit}</span>
                  </div>
                </div>
              </div>

              {files[0]?.dimensions && (
                <div className="dimension-preview">
                  <h4>Dimensi Hasil Akhir</h4>
                  <div className="dimension-values">
                    <div className="dim-item">
                      <span>Lebar:</span>
                      <strong>
                        {(files[0].dimensions.width * scale.value).toFixed(2)} {scale.unit}
                      </strong>
                    </div>
                    <div className="dim-item">
                      <span>Tinggi:</span>
                      <strong>
                        {(files[0].dimensions.height * scale.value).toFixed(2)} {scale.unit}
                      </strong>
                    </div>
                    <div className="dim-item">
                      <span>Area:</span>
                      <strong>
                        {(files[0].dimensions.width * files[0].dimensions.height * scale.value * scale.value).toFixed(2)} {scale.unit}²
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 4: {
        const material = settings.materials.find(m => m.id === selectedMaterial);
        return (
          <div className="step-content">
            <h2 className="step-title">Pilih Material</h2>
            <p className="step-description">Pilih jenis material dan ketebalan yang akan digunakan</p>

            <div className="material-selection">
              <div className="material-grid">
                {settings.materials.map(mat => (
                  <div
                    key={mat.id}
                    className={`material-card ${selectedMaterial === mat.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedMaterial(mat.id);
                      setSelectedThickness(0);
                    }}
                  >
                    <div className="material-icon">
                      <Layers size={24} />
                    </div>
                    <h4>{mat.name}</h4>
                    <p className="material-price">Rp {mat.pricePerMeter.toLocaleString()}/m cutting</p>
                    <p className="material-gas">Gas: {GAS_NAMES[mat.gasType]}</p>
                    {selectedMaterial === mat.id && (
                      <div className="material-check">
                        <Check size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedMaterial && (
                <div className="thickness-selection">
                  <h4>Pilih Ketebalan</h4>
                  <div className="thickness-buttons">
                    {settings.materials
                      .find(m => m.id === selectedMaterial)
                      ?.thickness.map(t => (
                        <button
                          key={t}
                          className={`thickness-btn ${selectedThickness === t ? 'active' : ''}`}
                          onClick={() => setSelectedThickness(t)}
                        >
                          {t} mm
                        </button>
                      ))}
                  </div>
                  {selectedThickness > 0 && (
                    <div className="cutting-speed-info">
                      <span>Kecepatan potong: </span>
                      <strong>{getCuttingSpeed(selectedMaterial, selectedThickness).toLocaleString()} mm/min</strong>
                    </div>
                  )}
                </div>
              )}

              {material && selectedThickness > 0 && (
                <div className="material-summary">
                  <p><strong>{material.name}</strong> - {selectedThickness}mm</p>
                  <p>Gas: {GAS_NAMES[material.gasType]}</p>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 5:
        return (
          <div className="step-content">
            <h2 className="step-title">Simulasi Nesting</h2>
            <p className="step-description">Lihat layout pemotongan pada sheet material</p>

            {nestingResult && (
              <div className="nesting-preview">
                <div className="nesting-info-grid">
                  <div className="info-card">
                    <Package size={20} />
                    <div>
                      <span>Ukuran Sheet</span>
                      <strong>{nestingResult.sheetWidth} x {nestingResult.sheetHeight} mm</strong>
                    </div>
                  </div>
                  <div className="info-card">
                    <LayoutGrid size={20} />
                    <div>
                      <span>Part per Sheet</span>
                      <strong>{nestingResult.partsPerSheet} pcs</strong>
                    </div>
                  </div>
                  <div className="info-card">
                    <Layers size={20} />
                    <div>
                      <span>Total Sheet</span>
                      <strong>{nestingResult.totalSheets} lembar</strong>
                    </div>
                  </div>
                  <div className="info-card">
                    <Percent size={20} />
                    <div>
                      <span>Utilisasi / Waste</span>
                      <strong className={nestingResult.utilization > 70 ? 'text-green' : 'text-orange'}>
                        {nestingResult.utilization.toFixed(1)}% / {nestingResult.wastePercent.toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="nesting-canvas">
                  <svg
                    viewBox={`0 0 ${nestingResult.sheetWidth} ${nestingResult.sheetHeight}`}
                    className="nesting-svg"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* Sheet background */}
                    <rect
                      x="0"
                      y="0"
                      width={nestingResult.sheetWidth}
                      height={nestingResult.sheetHeight}
                      fill="var(--bg-secondary)"
                      stroke="var(--border-color)"
                      strokeWidth="2"
                    />

                    {/* Grid lines */}
                    {Array.from({ length: Math.floor(nestingResult.sheetWidth / 100) }).map((_, i) => (
                      <line
                        key={`v-${i}`}
                        x1={(i + 1) * 100}
                        y1="0"
                        x2={(i + 1) * 100}
                        y2={nestingResult.sheetHeight}
                        stroke="var(--border-color)"
                        strokeDasharray="4"
                        opacity="0.5"
                      />
                    ))}
                    {Array.from({ length: Math.floor(nestingResult.sheetHeight / 100) }).map((_, i) => (
                      <line
                        key={`h-${i}`}
                        x1="0"
                        y1={(i + 1) * 100}
                        x2={nestingResult.sheetWidth}
                        y2={(i + 1) * 100}
                        stroke="var(--border-color)"
                        strokeDasharray="4"
                        opacity="0.5"
                      />
                    ))}

                    {/* Parts */}
                    {nestingResult.positions.map((pos, idx) => {
                      const dims = files[0]?.dimensions || { width: 100, height: 100 };
                      const unitMultiplier = scale.unit === 'cm' ? 10 : scale.unit === 'inch' ? 25.4 : 1;
                      const baseW = dims.width * scale.value * unitMultiplier;
                      const baseH = dims.height * scale.value * unitMultiplier;
                      const isRotated = pos.rotation === 90;
                      const w = isRotated ? baseH : baseW;
                      const h = isRotated ? baseW : baseH;

                      return (
                        <g key={idx}>
                          <rect
                            x={pos.x}
                            y={pos.y}
                            width={w}
                            height={h}
                            fill="#3b82f6"
                            fillOpacity="0.2"
                            stroke="#3b82f6"
                            strokeWidth="2"
                          />
                          <text
                            x={pos.x + w / 2}
                            y={pos.y + h / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={Math.min(w, h) / 3}
                            fill="#3b82f6"
                            fontWeight="bold"
                          >
                            {idx + 1}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="nesting-actions">
                  <button className="btn-secondary" onClick={exportNestingToDXF}>
                    <FileDown size={18} />
                    Export DXF
                  </button>
                </div>

                {nestingResult.partsPerSheet === 0 ? (
                  <div className="nesting-info-note error">
                    <AlertCircle size={16} />
                    <span>
                      Part terlalu besar untuk muat di sheet. Kurangi skala atau gunakan sheet yang lebih besar.
                    </span>
                  </div>
                ) : quantity > nestingResult.partsPerSheet ? (
                  <div className="nesting-info-note">
                    <AlertCircle size={16} />
                    <span>
                      {nestingResult.partsPerSheet} part muat per sheet.
                      Total {nestingResult.totalSheets} sheet untuk {quantity} part.
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );

      case 6: {
        const material = settings.materials.find(m => m.id === selectedMaterial);
        return (
          <div className="step-content">
            <h2 className="step-title">Hasil Estimasi</h2>
            <p className="step-description">Ringkasan lengkap biaya pemotongan laser</p>

            {!estimation && nestingResult?.partsPerSheet === 0 && (
              <div className="estimation-error">
                <AlertCircle size={48} />
                <h3>Tidak dapat menghitung estimasi</h3>
                <p>Part terlalu besar untuk muat di sheet material. Silakan kembali ke langkah sebelumnya dan:</p>
                <ul>
                  <li>Kurangi skala part</li>
                  <li>Atau gunakan ukuran sheet yang lebih besar di pengaturan</li>
                </ul>
              </div>
            )}

            {estimation && (
              <div className="estimation-result">
                <div className="result-header">
                  <div className="result-total">
                    <span>Total Estimasi Biaya</span>
                    <strong>Rp {estimation.totalCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</strong>
                  </div>
                  <div className="result-per-piece">
                    <span>Harga per Piece</span>
                    <strong>Rp {estimation.pricePerPiece.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</strong>
                  </div>
                </div>

                <div className="result-details">
                  <h4>Detail Pemotongan</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-icon"><Ruler size={18} /></div>
                      <div>
                        <span>Total Panjang Cutting</span>
                        <strong>{(estimation.totalCuttingLength / 1000).toFixed(2)} m</strong>
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-icon"><Clock size={18} /></div>
                      <div>
                        <span>Estimasi Waktu</span>
                        <strong>{estimation.cuttingTime.toFixed(1)} menit</strong>
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-icon"><Package size={18} /></div>
                      <div>
                        <span>Luas Area Proses</span>
                        <strong>{(estimation.processedArea / 1000000).toFixed(4)} m²</strong>
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-icon"><Layers size={18} /></div>
                      <div>
                        <span>Kebutuhan Plat</span>
                        <strong>{estimation.totalSheets} lembar</strong>
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-icon"><Percent size={18} /></div>
                      <div>
                        <span>Material Terbuang</span>
                        <strong className={estimation.wastePercent < 30 ? 'text-green' : 'text-orange'}>
                          {estimation.wastePercent.toFixed(1)}%
                        </strong>
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-icon"><Fuel size={18} /></div>
                      <div>
                        <span>Estimasi Gas ({material ? GAS_NAMES[material.gasType] : 'N/A'})</span>
                        <strong>{estimation.gasUsage.toFixed(2)} m³ ({(estimation.gasUsage / settings.gasTankVolume).toFixed(1)} tabung)</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="result-costs">
                  <h4>Rincian Biaya</h4>
                  <div className="cost-breakdown">
                    <div className="cost-row">
                      <span>Biaya Material ({estimation.totalSheets} sheet)</span>
                      <strong>Rp {estimation.materialCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</strong>
                    </div>
                    <div className="cost-row">
                      <span>Biaya Jasa ({estimation.cuttingTime.toFixed(1)} menit × Rp {settings.laborCostPerMinute.toLocaleString()})</span>
                      <strong>Rp {estimation.laborCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</strong>
                    </div>
                    <div className="cost-row">
                      <span>Biaya Gas ({estimation.gasUsage.toFixed(2)} m³ × Rp {settings.gasPrice.toLocaleString()})</span>
                      <strong>Rp {estimation.gasCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</strong>
                    </div>
                    <div className="cost-row total">
                      <span>Total</span>
                      <strong>Rp {estimation.totalCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</strong>
                    </div>
                  </div>
                </div>

                <div className="result-summary">
                  <h4>Ringkasan Order</h4>
                  <table className="summary-table">
                    <tbody>
                      <tr>
                        <td>Material</td>
                        <td>{material?.name}</td>
                      </tr>
                      <tr>
                        <td>Ketebalan</td>
                        <td>{selectedThickness} mm</td>
                      </tr>
                      <tr>
                        <td>Gas Potong</td>
                        <td>{material ? GAS_NAMES[material.gasType] : '-'}</td>
                      </tr>
                      <tr>
                        <td>Jumlah</td>
                        <td>{quantity} pcs</td>
                      </tr>
                      <tr>
                        <td>Sheet Size</td>
                        <td>{settings.defaultSheetWidth} x {settings.defaultSheetHeight} mm</td>
                      </tr>
                      <tr>
                        <td>File</td>
                        <td>{files[0]?.file.name}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="result-actions">
                  <button className="btn-secondary" onClick={() => window.print()}>
                    <Download size={18} />
                    Export PDF
                  </button>
                  <button className="btn-primary" onClick={reset}>
                    <RotateCcw size={18} />
                    Estimasi Baru
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="estimator-page">
      {/* Header */}
      <div className="estimator-header">
        <div className="header-left">
          <div className="header-icon">
            <Layers size={24} />
          </div>
          <div className="header-text">
            <h1>Estimator Laser Cutting</h1>
            <p>{settings.machineType}</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-icon" onClick={() => setShowSettings(true)} title="Pengaturan">
            <Settings size={20} />
          </button>
          <button className="btn-reset" onClick={reset}>
            <RotateCcw size={18} />
            Mulai Ulang
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div key={step.id} className="step-wrapper">
              <div
                className={`step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => isCompleted && setCurrentStep(step.id)}
              >
                <div className="step-circle">
                  {isCompleted ? <Check size={16} /> : step.id}
                </div>
                <div className="step-label">
                  <span className="step-name">{step.name}</span>
                  <span className="step-subtitle">{step.subtitle}</span>
                </div>
              </div>
              {idx < STEPS.length - 1 && <div className="step-line" />}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="estimator-content">
        <div className="content-card">
          {isProcessing ? (
            <div className="processing-state">
              <div className="spinner" />
              <p>Memproses file...</p>
            </div>
          ) : (
            renderStep()
          )}
        </div>
      </div>

      {/* Navigation */}
      {currentStep < 6 && (
        <div className="estimator-nav">
          <button
            className="btn-nav btn-prev"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft size={18} />
            Sebelumnya
          </button>
          <button
            className="btn-nav btn-next"
            onClick={nextStep}
            disabled={!canProceed()}
          >
            Selanjutnya
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Pengaturan Estimator</h2>
              <button className="modal-close" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="settings-grid">
                <div className="setting-section">
                  <h3>Mesin</h3>
                  <div className="setting-row">
                    <label>Tipe Mesin</label>
                    <input
                      type="text"
                      value={settings.machineType}
                      onChange={(e) => saveSettings({ ...settings, machineType: e.target.value })}
                    />
                  </div>
                  <div className="setting-row">
                    <label>Daya (Watt)</label>
                    <input
                      type="number"
                      value={settings.machinePower}
                      onChange={(e) => saveSettings({ ...settings, machinePower: parseInt(e.target.value) || 1500 })}
                    />
                  </div>
                </div>

                <div className="setting-section">
                  <h3>Biaya Operasional</h3>
                  <div className="setting-row">
                    <label>Biaya Jasa per Menit (Rp)</label>
                    <input
                      type="number"
                      value={settings.laborCostPerMinute}
                      onChange={(e) => saveSettings({ ...settings, laborCostPerMinute: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="setting-row">
                    <label>Harga Sheet per m² (Rp)</label>
                    <input
                      type="number"
                      value={settings.sheetPricePerM2}
                      onChange={(e) => saveSettings({ ...settings, sheetPricePerM2: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="setting-section">
                  <h3>Gas</h3>
                  <div className="setting-row">
                    <label>Harga Gas per m³ (Rp)</label>
                    <input
                      type="number"
                      value={settings.gasPrice}
                      onChange={(e) => saveSettings({ ...settings, gasPrice: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="setting-row">
                    <label>Volume Tabung (m³)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.gasTankVolume}
                      onChange={(e) => saveSettings({ ...settings, gasTankVolume: parseFloat(e.target.value) || 6 })}
                    />
                  </div>
                  <div className="setting-row">
                    <label>Flow Rate (L/min)</label>
                    <input
                      type="number"
                      value={settings.gasFlowRate}
                      onChange={(e) => saveSettings({ ...settings, gasFlowRate: parseInt(e.target.value) || 20 })}
                    />
                  </div>
                </div>

                <div className="setting-section">
                  <h3>Default Sheet</h3>
                  <div className="setting-row">
                    <label>Lebar (mm)</label>
                    <input
                      type="number"
                      value={settings.defaultSheetWidth}
                      onChange={(e) => saveSettings({ ...settings, defaultSheetWidth: parseInt(e.target.value) || 1220 })}
                    />
                  </div>
                  <div className="setting-row">
                    <label>Tinggi (mm)</label>
                    <input
                      type="number"
                      value={settings.defaultSheetHeight}
                      onChange={(e) => saveSettings({ ...settings, defaultSheetHeight: parseInt(e.target.value) || 2440 })}
                    />
                  </div>
                </div>
              </div>

              <div className="setting-section full-width">
                <h3>Material & Harga Cutting</h3>
                <p className="setting-hint">Harga per meter panjang pemotongan</p>
                <div className="material-settings-list">
                  {settings.materials.map((mat, idx) => (
                    <div key={mat.id} className="material-setting">
                      <span className="mat-name">{mat.name}</span>
                      <div className="mat-inputs">
                        <div className="mat-input-group">
                          <span>Rp</span>
                          <input
                            type="number"
                            value={mat.pricePerMeter}
                            onChange={(e) => {
                              const newMaterials = [...settings.materials];
                              newMaterials[idx].pricePerMeter = parseInt(e.target.value) || 0;
                              saveSettings({ ...settings, materials: newMaterials });
                            }}
                          />
                          <span>/m</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
