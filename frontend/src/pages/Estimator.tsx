import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
  AlertTriangle,
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
  SkipForward,
  CheckCircle,
  Info
} from 'lucide-react';
import { api } from '../lib/api';
import './Estimator.css';

// ============================================
// VALIDATION HELPERS
// ============================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Safe division - prevents Infinity and NaN
const safeDivide = (numerator: number, denominator: number, fallback: number = 0): number => {
  if (denominator === 0 || !isFinite(denominator) || !isFinite(numerator)) {
    return fallback;
  }
  const result = numerator / denominator;
  return isFinite(result) ? result : fallback;
};

// Clamp number between min and max
const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

// Check if number is valid (not NaN, not Infinity)
const isValidNumber = (value: number): boolean => {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
};

// Safe Math.ceil that returns fallback for invalid inputs
const safeCeil = (value: number, fallback: number = 0): number => {
  if (!isValidNumber(value)) return fallback;
  return Math.ceil(value);
};

// Validate dimensions object
const validateDimensions = (dims: { width: number; height: number } | undefined): { width: number; height: number } => {
  const defaultDims = { width: 100, height: 100 };
  if (!dims) return defaultDims;
  return {
    width: isValidNumber(dims.width) && dims.width > 0 ? dims.width : defaultDims.width,
    height: isValidNumber(dims.height) && dims.height > 0 ? dims.height : defaultDims.height,
  };
};

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

interface ProcessedPart {
  id: string;
  width: number;
  height: number;
  preview: string;
  name: string;
  pathLength?: number;
}

interface SheetLayout {
  partId: string;
  partName: string;
  sheetWidth: number;
  sheetHeight: number;
  utilization: number;
  wastePercent: number;
  positions: { x: number; y: number; rotation: number }[];
  partsPerSheet: number;
  totalSheets: number;
  partWidth: number;
  partHeight: number;
}

interface NestingResult {
  layouts: SheetLayout[];
  totalSheets: number;
  globalUtilization: number;
  totalParts: number;
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
  const [scale, setScale] = useState({ value: 1, unit: 'mm' as 'mm' | 'cm' | 'm' });
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
  const [currentLayoutIndex, setCurrentLayoutIndex] = useState(0);

  // Area selection state
  const [selections, setSelections] = useState<SelectionArea[]>([]);
  const [selectionMode, setSelectionMode] = useState<'select' | 'pan'>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [, setUseAreaSelection] = useState(false); // Track if user chose to use area selection
  // Support multiple cropped previews - one per selection
  const [croppedPreviews, setCroppedPreviews] = useState<string[]>([]);
  const [croppedDimensionsList, setCroppedDimensionsList] = useState<{ width: number; height: number }[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

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

  // ============================================
  // STEP VALIDATION
  // ============================================

  // Validate each step before allowing to proceed
  const stepValidation = useMemo((): Record<number, ValidationResult> => {
    const validations: Record<number, ValidationResult> = {};

    // Step 1: File Upload
    validations[1] = {
      isValid: files.length > 0 && files[0]?.preview !== '',
      errors: files.length === 0 ? ['Silakan upload file desain terlebih dahulu'] : [],
      warnings: [],
    };

    // Step 2: Preview & Selection
    const hasValidSelection = selections.length === 0 || selections.some(s => s.selected && s.width > 10 && s.height > 10);
    validations[2] = {
      isValid: files.length > 0,
      errors: files.length === 0 ? ['File tidak ditemukan'] : [],
      warnings: selections.length > 0 && !hasValidSelection
        ? ['Tidak ada area yang dipilih. Klik "Skip" untuk memproses seluruh gambar.']
        : [],
    };

    // Step 3: Scale & Quantity
    const scaleErrors: string[] = [];
    const scaleWarnings: string[] = [];
    if (scale.value <= 0) scaleErrors.push('Skala harus lebih dari 0');
    if (scale.value > 100) scaleWarnings.push('Skala sangat besar, pastikan nilai sudah benar');
    if (quantity <= 0) scaleErrors.push('Jumlah potong harus minimal 1');
    if (quantity > 10000) scaleWarnings.push('Jumlah potong sangat banyak, pastikan nilai sudah benar');

    validations[3] = {
      isValid: scale.value > 0 && quantity > 0,
      errors: scaleErrors,
      warnings: scaleWarnings,
    };

    // Step 4: Material Selection
    validations[4] = {
      isValid: selectedMaterial !== '' && selectedThickness > 0,
      errors: [
        ...(selectedMaterial === '' ? ['Silakan pilih material'] : []),
        ...(selectedThickness === 0 ? ['Silakan pilih ketebalan'] : []),
      ],
      warnings: [],
    };

    // Step 5: Nesting
    const nestingErrors: string[] = [];
    const nestingWarnings: string[] = [];
    if (nestingResult) {
      if (nestingResult.layouts.length === 0) {
        nestingErrors.push('Tidak ada layout yang berhasil dibuat.');
      }
      
      const lowUtil = nestingResult.layouts.filter(l => l.utilization < 20);
      if (lowUtil.length > 0) {
        nestingWarnings.push(`${lowUtil.length} part memiliki utilisasi rendah (<20%).`);
      }
      
      if (!isFinite(nestingResult.totalSheets) || nestingResult.totalSheets <= 0) {
        nestingErrors.push('Perhitungan jumlah sheet tidak valid');
      }
    }

    validations[5] = {
      isValid: nestingResult !== null && nestingResult.layouts.length > 0 && isFinite(nestingResult.totalSheets),
      errors: nestingErrors,
      warnings: nestingWarnings,
    };

    // Step 6: Results
    const estimationErrors: string[] = [];
    if (estimation) {
      if (!isFinite(estimation.totalCost) || estimation.totalCost < 0) {
        estimationErrors.push('Perhitungan biaya tidak valid');
      }
    }

    validations[6] = {
      isValid: estimation !== null && isFinite(estimation.totalCost) && estimation.totalCost >= 0,
      errors: estimationErrors,
      warnings: [],
    };

    return validations;
  }, [files, selections, scale, quantity, selectedMaterial, selectedThickness, nestingResult, estimation]);

  // Check if can proceed to next step
  const canProceedToNextStep = useMemo(() => {
    const currentValidation = stepValidation[currentStep];
    return currentValidation?.isValid ?? false;
  }, [stepValidation, currentStep]);

  // Get current step validation info
  const currentStepValidation = useMemo(() => {
    return stepValidation[currentStep] || { isValid: true, errors: [], warnings: [] };
  }, [stepValidation, currentStep]);

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

    if (!ext || !['svg', 'dxf', 'png', 'jpg', 'jpeg', 'webp', 'pdf'].includes(ext)) {
      setError('Format file tidak didukung. Gunakan SVG, DXF, PDF, atau gambar (PNG, JPG).');
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

  // Calculate nesting with improved algorithm and robust error handling
  const calculateNesting = () => {
    // 1. Identify parts to process
    let partsToProcess: ProcessedPart[] = [];

    if (selections.length > 0 && croppedPreviews.length > 0) {
      // Priority 1: Use selections (Cropped Areas)
      partsToProcess = selections.map((sel, idx) => {
        const preview = croppedPreviews[idx] || '';
        const dims = croppedDimensionsList[idx] || { width: 100, height: 100 };
        return {
          id: sel.id,
          name: `Area ${idx + 1}`,
          width: dims.width,
          height: dims.height,
          preview,
          // Estimate path length for images (perimeter based)
          pathLength: 2 * (dims.width + dims.height)
        };
      });
    } else if (files.length > 0) {
      // Priority 2: Use uploaded files
      partsToProcess = files.map((f, idx) => {
        const dims = validateDimensions(f.dimensions);
        // Calculate real path length if available
        let length = 0;
        if (f.paths) {
           f.paths.forEach(p => { if(p.selected) length += p.length; });
        }
        if (length === 0) length = 2 * (dims.width + dims.height);

        return {
          id: `file-${idx}`,
          name: f.file.name,
          width: dims.width,
          height: dims.height,
          preview: f.preview,
          pathLength: length
        };
      });
    }

    if (partsToProcess.length === 0) {
      setError('Tidak ada data untuk diproses. Silakan upload file atau seleksi area.');
      return;
    }

    // Settings & Validation
    const safeScale = isValidNumber(scale.value) && scale.value > 0 ? scale.value : 1;
    const unitMultiplier = scale.unit === 'cm' ? 10 : scale.unit === 'm' ? 1000 : 1;
    const sheetW = isValidNumber(settings.defaultSheetWidth) && settings.defaultSheetWidth > 0
      ? settings.defaultSheetWidth : 1220;
    const sheetH = isValidNumber(settings.defaultSheetHeight) && settings.defaultSheetHeight > 0
      ? settings.defaultSheetHeight : 2440;
    const gap = 5;
    const safeQuantity = isValidNumber(quantity) && quantity > 0 ? quantity : 1;

    const layouts: SheetLayout[] = [];
    const errors: string[] = [];

    // 2. Process each part independently
    partsToProcess.forEach(part => {
      // Apply scale
      const scaledWidth = part.width * safeScale * unitMultiplier;
      const scaledHeight = part.height * safeScale * unitMultiplier;

      // Validate dimensions
      if (scaledWidth <= 0 || scaledHeight <= 0) {
        errors.push(`Part ${part.name}: Dimensi tidak valid.`);
        return;
      }

      // Check fit
      const minPart = Math.min(scaledWidth, scaledHeight);
      const maxPart = Math.max(scaledWidth, scaledHeight);
      const minSheet = Math.min(sheetW, sheetH);
      const maxSheet = Math.max(sheetW, sheetH);

      if (minPart + gap > minSheet || maxPart + gap > maxSheet) {
        errors.push(`Part ${part.name} terlalu besar (${scaledWidth.toFixed(0)}x${scaledHeight.toFixed(0)}) untuk sheet.`);
        // Add failed layout
        layouts.push({
          partId: part.id,
          partName: part.name,
          sheetWidth: sheetW,
          sheetHeight: sheetH,
          utilization: 0,
          wastePercent: 100,
          positions: [],
          partsPerSheet: 0,
          totalSheets: 0,
          partWidth: scaledWidth,
          partHeight: scaledHeight
        });
        return;
      }

      // Calculate Orientation 1
      const cols1 = Math.max(0, Math.floor(safeDivide(sheetW, scaledWidth + gap, 0)));
      const rows1 = Math.max(0, Math.floor(safeDivide(sheetH, scaledHeight + gap, 0)));
      const perSheet1 = cols1 * rows1;

      // Calculate Orientation 2 (Rotated)
      const cols2 = Math.max(0, Math.floor(safeDivide(sheetW, scaledHeight + gap, 0)));
      const rows2 = Math.max(0, Math.floor(safeDivide(sheetH, scaledWidth + gap, 0)));
      const perSheet2 = cols2 * rows2;

      // Best orientation
      const useRotated = perSheet2 > perSheet1;
      const cols = useRotated ? cols2 : cols1;
      const rows = useRotated ? rows2 : rows1;
      const partsPerSheet = Math.max(perSheet1, perSheet2);
      const layoutPartW = useRotated ? scaledHeight : scaledWidth;
      const layoutPartH = useRotated ? scaledWidth : scaledHeight;

      const totalSheets = safeCeil(safeDivide(safeQuantity, partsPerSheet, 1), 0);

      // Generate positions
      const positions = [];
      // Just show one sheet sample
      const partsToShow = Math.min(partsPerSheet, 100); // Limit for performance

      for (let r = 0; r < rows && positions.length < partsToShow; r++) {
        for (let c = 0; c < cols && positions.length < partsToShow; c++) {
          positions.push({
            x: c * (layoutPartW + gap) + gap,
            y: r * (layoutPartH + gap) + gap,
            rotation: useRotated ? 90 : 0,
          });
        }
      }

      const usedAreaPerSheet = partsPerSheet * scaledWidth * scaledHeight;
      const sheetArea = sheetW * sheetH;
      const utilization = safeDivide(usedAreaPerSheet, sheetArea, 0) * 100;

      layouts.push({
        partId: part.id,
        partName: part.name,
        sheetWidth: sheetW,
        sheetHeight: sheetH,
        utilization,
        wastePercent: 100 - utilization,
        positions,
        partsPerSheet,
        totalSheets,
        partWidth: scaledWidth,
        partHeight: scaledHeight
      });
    });

    if (errors.length > 0) {
      setError(errors[0]); // Show first error
    } else {
      setError(null);
    }

    // 3. Aggregate results
    const totalGlobalSheets = layouts.reduce((sum, l) => sum + l.totalSheets, 0);
    // Simple average utilization (weighted by sheets would be better but this is estimation)
    const avgUtil = safeDivide(layouts.reduce((sum, l) => sum + l.utilization, 0), layouts.length, 0);

    setNestingResult({
      layouts,
      totalSheets: totalGlobalSheets,
      globalUtilization: avgUtil,
      totalParts: partsToProcess.length
    });
  };

  // Calculate estimation with gas and more details - with robust error handling
  const calculateEstimation = () => {
    if (!selectedMaterial || !nestingResult || nestingResult.layouts.length === 0) {
      setEstimation(null);
      return;
    }

    const material = settings.materials.find(m => m.id === selectedMaterial);
    if (!material) {
      setError('Material tidak ditemukan.');
      setEstimation(null);
      return;
    }

    const safeScale = isValidNumber(scale.value) && scale.value > 0 ? scale.value : 1;
    const unitMultiplier = scale.unit === 'cm' ? 10 : scale.unit === 'm' ? 1000 : 1;
    const safeQuantity = isValidNumber(quantity) && quantity > 0 ? quantity : 1;
    
    // Cutting params
    const cuttingSpeed = getCuttingSpeed(selectedMaterial, selectedThickness);
    const safeCuttingSpeed = isValidNumber(cuttingSpeed) && cuttingSpeed > 0 ? cuttingSpeed : 3000;
    const safeLaborCost = isValidNumber(settings.laborCostPerMinute) ? settings.laborCostPerMinute : 1500;
    const safeGasFlowRate = isValidNumber(settings.gasFlowRate) ? settings.gasFlowRate : 20;
    const safeGasPrice = isValidNumber(settings.gasPrice) ? settings.gasPrice : 50000;
    const safeSheetPrice = isValidNumber(settings.sheetPricePerM2) ? settings.sheetPricePerM2 : 150000;
    const sheetAreaM2 = safeDivide(settings.defaultSheetWidth * settings.defaultSheetHeight, 1000000, 1);

    // Calculate totals across all layouts (parts)
    let totalCuttingLength = 0;
    let totalProcessedArea = 0;
    let totalSheets = 0;

    nestingResult.layouts.forEach(layout => {
        // Perimeter = 2 * (w + h)
        const perimeter = 2 * (layout.partWidth + layout.partHeight);
        
        // Total length for this part type = perimeter * quantity
        totalCuttingLength += perimeter * safeQuantity;
        
        // Processed area
        totalProcessedArea += (layout.partWidth * layout.partHeight) * safeQuantity;
        
        totalSheets += layout.totalSheets;
    });

    // Recalculate cutting length more accurately if we have files/paths and NO cropping
    if (files.length > 0 && selections.length === 0) {
       let realTotalLength = 0;
       files.forEach(f => {
         f.paths?.forEach(p => {
            if (p.selected) realTotalLength += p.length;
         });
       });
       if (realTotalLength > 0) {
           // Replace the perimeter estimation
           totalCuttingLength = realTotalLength * safeScale * unitMultiplier * safeQuantity;
       }
    }

    const cuttingTime = safeDivide(totalCuttingLength, safeCuttingSpeed, 0); // minutes
    const gasUsage = safeDivide(safeGasFlowRate * cuttingTime, 1000, 0); // m3
    
    const laborCost = cuttingTime * safeLaborCost;
    const gasCost = gasUsage * safeGasPrice;
    
    const sheetCostPerSheet = sheetAreaM2 * safeSheetPrice;
    const materialCost = sheetCostPerSheet * totalSheets;

    const totalCost = materialCost + laborCost + gasCost;
    const pricePerPiece = safeDivide(totalCost, safeQuantity * nestingResult.totalParts, 0);

    setEstimation({
      totalCuttingLength,
      cuttingTime,
      materialCost,
      laborCost,
      gasCost,
      totalCost,
      pricePerPiece,
      gasUsage,
      processedArea: totalProcessedArea,
      totalSheets,
      wastePercent: 100 - nestingResult.globalUtilization,
    });
  };
  
  // (Nesting and Estimation functions are here - skipped for brevity in replacement context matching)

  // Export nesting to DXF
  const exportNestingToDXF = () => {
    if (!nestingResult || nestingResult.layouts.length === 0) return;

    let dxfContent = `0
SECTION
2
ENTITIES
`;

    // Iterate all layouts and place them side-by-side
    let offsetX = 0;
    const gap = 200; // Gap between sheets in DXF

    nestingResult.layouts.forEach((layout, lIdx) => {
        // Add sheet boundary
        dxfContent += `0
LWPOLYLINE
8
SHEET_${lIdx + 1}
90
4
70
1
10
${offsetX}
20
0
10
${offsetX + layout.sheetWidth}
20
0
10
${offsetX + layout.sheetWidth}
20
${layout.sheetHeight}
10
${offsetX}
20
${layout.sheetHeight}
`;

        // Add parts
        layout.positions.forEach((pos, pIdx) => {
          const isRotated = pos.rotation === 90;
          const partW = isRotated ? layout.partHeight : layout.partWidth;
          const partH = isRotated ? layout.partWidth : layout.partHeight;
          
          const px = offsetX + pos.x;
          const py = pos.y;

          dxfContent += `0
LWPOLYLINE
8
PART_${lIdx}_${pIdx}
90
4
70
1
10
${px}
20
${py}
10
${px + partW}
20
${py}
10
${px + partW}
20
${py + partH}
10
${px}
20
${py + partH}
`;
        });
        
        // Add Text Label for Sheet
        dxfContent += `0
TEXT
8
LABEL
10
${offsetX + 50}
20
${-50}
40
30
1
Sheet ${lIdx + 1}: ${layout.partName} (${layout.totalSheets} lembar)
`;

        // Move offset for next layout
        offsetX += layout.sheetWidth + gap;
    });

    dxfContent += `0
ENDSEC
0
EOF`;

    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nesting_result_${new Date().getTime()}.dxf`;
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
    setCroppedPreviews([]);
    setCroppedDimensionsList([]);
  };

  // Get image bounds within the preview canvas
  const getImageBounds = () => {
    const imgElement = previewCanvasRef.current?.querySelector('.preview-item img') as HTMLImageElement;
    if (!imgElement) return null;

    const canvasRect = previewCanvasRef.current?.getBoundingClientRect();
    const imgRect = imgElement.getBoundingClientRect();

    if (!canvasRect) return null;

    return {
      x: (imgRect.left - canvasRect.left) / zoom,
      y: (imgRect.top - canvasRect.top) / zoom,
      width: imgRect.width / zoom,
      height: imgRect.height / zoom,
    };
  };

  // Constrain a point to image bounds
  const constrainToImage = (x: number, y: number, bounds: { x: number; y: number; width: number; height: number }) => {
    return {
      x: Math.max(bounds.x, Math.min(x, bounds.x + bounds.width)),
      y: Math.max(bounds.y, Math.min(y, bounds.y + bounds.height)),
    };
  };

  // Area selection mouse handlers
  const handlePreviewMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectionMode !== 'select' || !previewCanvasRef.current) return;

    const rect = previewCanvasRef.current.getBoundingClientRect();
    let x = (e.clientX - rect.left) / zoom;
    let y = (e.clientY - rect.top) / zoom;

    // Constrain to image bounds
    const bounds = getImageBounds();
    if (bounds) {
      const constrained = constrainToImage(x, y, bounds);
      x = constrained.x;
      y = constrained.y;
    }

    setIsDrawing(true);
    setDrawStart({ x, y });
    setCurrentSelection({ x, y, width: 0, height: 0 });
  };

  const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart || !previewCanvasRef.current) return;

    const rect = previewCanvasRef.current.getBoundingClientRect();
    let currentX = (e.clientX - rect.left) / zoom;
    let currentY = (e.clientY - rect.top) / zoom;

    // Constrain to image bounds
    const bounds = getImageBounds();
    if (bounds) {
      const constrained = constrainToImage(currentX, currentY, bounds);
      currentX = constrained.x;
      currentY = constrained.y;
    }

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

    // Validate selection dimensions
    const minSize = 10;
    const maxSelections = 10; // Prevent too many selections

    // Check if we already have max selections
    if (selections.length >= maxSelections) {
      setWarnings([`Maksimal ${maxSelections} area seleksi. Hapus beberapa area untuk menambah yang baru.`]);
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentSelection(null);
      return;
    }

    // Only add if selection has meaningful size
    if (currentSelection.width > minSize && currentSelection.height > minSize) {
      // Auto-fix: ensure selection is within valid bounds
      const bounds = getImageBounds();
      let finalSelection = { ...currentSelection };

      if (bounds) {
        // Clamp selection to image bounds
        const x = clamp(currentSelection.x, bounds.x, bounds.x + bounds.width);
        const y = clamp(currentSelection.y, bounds.y, bounds.y + bounds.height);
        const maxWidth = bounds.x + bounds.width - x;
        const maxHeight = bounds.y + bounds.height - y;

        finalSelection = {
          x,
          y,
          width: Math.min(currentSelection.width, maxWidth),
          height: Math.min(currentSelection.height, maxHeight),
        };
      }

      // Only add if final selection is still valid
      if (finalSelection.width > minSize && finalSelection.height > minSize) {
        const newSelection: SelectionArea = {
          id: `sel-${Date.now()}`,
          ...finalSelection,
          selected: true,
        };
        setSelections(prev => [...prev, newSelection]);
        setWarnings([]); // Clear warnings on successful selection
      } else {
        setWarnings(['Area seleksi terlalu kecil setelah disesuaikan ke batas gambar.']);
      }
    } else {
      setWarnings(['Area seleksi terlalu kecil. Gambar area yang lebih besar (minimal 10x10 pixel).']);
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
    // Clear cropped preview - use full image
    setCroppedPreviews([]);
    setCroppedDimensionsList([]);
    // Select all paths
    const newFiles = [...files];
    newFiles.forEach(f => {
      f.paths?.forEach(p => (p.selected = true));
    });
    setFiles(newFiles);
    nextStep();
  };

  // Generate cropped preview from selection area
  const generateCroppedPreview = async (selection: SelectionArea): Promise<{ dataUrl: string; width: number; height: number } | null> => {
    if (!files[0]?.preview) return null;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = files[0].preview;

    return new Promise((resolve) => {
      img.onload = () => {
        // Get the preview element to calculate scale ratio
        const previewElement = previewCanvasRef.current?.querySelector('.preview-item img') as HTMLImageElement;
        const canvasElement = previewCanvasRef.current;

        if (!previewElement || !canvasElement) {
          console.error('Preview element not found');
          resolve(null);
          return;
        }

        // Calculate Image Bounds manually (similar to getImageBounds but ensuring fresh values)
        const canvasRect = canvasElement.getBoundingClientRect();
        const imgRect = previewElement.getBoundingClientRect();
        
        // Calculate offset of image within the canvas (accounting for zoom)
        // We use the current zoom state which should be stable during this sync operation
        const bounds = {
          x: (imgRect.left - canvasRect.left) / zoom,
          y: (imgRect.top - canvasRect.top) / zoom,
          width: imgRect.width / zoom,
          height: imgRect.height / zoom
        };

        let scaleX = 1;
        let scaleY = 1;

        if (previewElement.clientWidth > 0 && previewElement.clientHeight > 0) {
          // Calculate ratio between actual image size and displayed size (natural vs rendered)
          scaleX = img.naturalWidth / previewElement.clientWidth;
          scaleY = img.naturalHeight / previewElement.clientHeight;
        }

        // Calculate crop area in original image coordinates
        // CRITICAL FIX: Subtract image offset (bounds.x/y) from selection coordinates
        let cropX = (selection.x - bounds.x) * scaleX;
        let cropY = (selection.y - bounds.y) * scaleY;
        let cropWidth = selection.width * scaleX;
        let cropHeight = selection.height * scaleY;

        // Clamp values to image bounds to prevent empty crops
        cropX = Math.max(0, Math.min(cropX, img.naturalWidth - 1));
        cropY = Math.max(0, Math.min(cropY, img.naturalHeight - 1));
        cropWidth = Math.max(1, Math.min(cropWidth, img.naturalWidth - cropX));
        cropHeight = Math.max(1, Math.min(cropHeight, img.naturalHeight - cropY));

        // Create canvas and draw cropped image
        const canvas = document.createElement('canvas');
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );

        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: cropWidth,
          height: cropHeight
        });
      };

      img.onerror = (err) => {
        console.error('Failed to load image for cropping:', err);
        resolve(null);
      };
    });
  };

  // Use area selections to filter paths - with improved error handling
  // Now processes ALL selections, not just the first one
  const applyAreaSelection = async () => {
    if (selections.length === 0) {
      skipSelection();
      return;
    }

    // Show loading state
    setIsProcessing(true);
    setError(null);
    setWarnings([]);

    try {
      setUseAreaSelection(true);

      // Process ALL selections and generate cropped previews for each
      const previews: string[] = [];
      const dimensionsList: { width: number; height: number }[] = [];
      const newWarnings: string[] = [];

      for (let i = 0; i < selections.length; i++) {
        const selection = selections[i];

        // Validate selection before processing
        if (selection.width <= 0 || selection.height <= 0) {
          newWarnings.push(`Area ${i + 1} tidak valid.`);
          continue;
        }

        // Set timeout for cropping operation
        const cropPromise = generateCroppedPreview(selection);
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 5000) // 5 second timeout per selection
        );

        const cropped = await Promise.race([cropPromise, timeoutPromise]);

        if (cropped && cropped.dataUrl && cropped.width > 0 && cropped.height > 0) {
          previews.push(cropped.dataUrl);
          dimensionsList.push({ width: cropped.width, height: cropped.height });
        } else {
          // Fallback: estimate dimensions from selection
          console.warn(`Cropping failed for selection ${i + 1}, using estimated dimensions`);

          const bounds = getImageBounds();
          if (bounds && files[0]?.dimensions) {
            const scaleX = files[0].dimensions.width / bounds.width;
            const scaleY = files[0].dimensions.height / bounds.height;
            const estimatedWidth = Math.round(selection.width * scaleX);
            const estimatedHeight = Math.round(selection.height * scaleY);

            if (estimatedWidth > 0 && estimatedHeight > 0) {
              // Use file preview as fallback
              previews.push(files[0]?.preview || '');
              dimensionsList.push({ width: estimatedWidth, height: estimatedHeight });
            }
          }
        }
      }

      if (newWarnings.length > 0) {
        setWarnings(newWarnings);
      }

      // Store all cropped previews and dimensions
      setCroppedPreviews(previews);
      setCroppedDimensionsList(dimensionsList);

      // For now, select all paths
      const newFiles = [...files];
      newFiles.forEach(f => {
        f.paths?.forEach(p => (p.selected = true));
      });
      setFiles(newFiles);
      nextStep();
    } catch (err) {
      console.error('Error applying selection:', err);
      setError('Gagal memproses seleksi. Silakan coba lagi.');
    } finally {
      setIsProcessing(false);
    }
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
                accept=".svg,.dxf,.png,.jpg,.jpeg,.webp,.pdf"
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
                <p className="drop-zone-formats">Format: SVG, DXF, PDF, PNG, JPG</p>
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
                    {(['mm', 'cm', 'm'] as const).map(unit => (
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
                      width: `${Math.min(300, scaleBarLength * (scale.unit === 'cm' ? 10 : scale.unit === 'm' ? 1000 : 1) * scale.value / 2)}px`
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
        // Helper to get current layout safely
        const currentLayout = nestingResult && nestingResult.layouts.length > 0 
          ? nestingResult.layouts[currentLayoutIndex] || nestingResult.layouts[0]
          : null;

        return (
          <div className="step-content">
            <h2 className="step-title">Simulasi Nesting</h2>
            <p className="step-description">Lihat layout pemotongan pada sheet material</p>

            {nestingResult && currentLayout && (
              <div className="nesting-preview">
                {/* Global Stats Summary */}
                <div className="nesting-global-summary">
                   <div className="global-stat">
                     <span>Total Part:</span> <strong>{nestingResult.totalParts} jenis</strong>
                   </div>
                   <div className="global-stat">
                     <span>Total Sheet Dibutuhkan:</span> <strong>{nestingResult.totalSheets} lembar</strong>
                   </div>
                   <div className="global-stat">
                     <span>Rata-rata Utilisasi:</span> <strong>{nestingResult.globalUtilization.toFixed(1)}%</strong>
                   </div>
                </div>

                {/* Layout Navigation */}
                {nestingResult.layouts.length > 1 && (
                  <div className="layout-navigation">
                    <button 
                      className="btn-icon-sm" 
                      onClick={() => setCurrentLayoutIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentLayoutIndex === 0}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="layout-indicator">
                      Part {currentLayoutIndex + 1} dari {nestingResult.layouts.length}: <strong>{currentLayout.partName}</strong>
                    </span>
                    <button 
                      className="btn-icon-sm" 
                      onClick={() => setCurrentLayoutIndex(prev => Math.min(nestingResult.layouts.length - 1, prev + 1))}
                      disabled={currentLayoutIndex === nestingResult.layouts.length - 1}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}

                <div className="nesting-info-grid">
                  <div className="info-card">
                    <Package size={20} />
                    <div>
                      <span>Ukuran Sheet</span>
                      <strong>{currentLayout.sheetWidth} x {currentLayout.sheetHeight} mm</strong>
                    </div>
                  </div>
                  <div className="info-card">
                    <LayoutGrid size={20} />
                    <div>
                      <span>Part per Sheet</span>
                      <strong>{currentLayout.partsPerSheet} pcs</strong>
                    </div>
                  </div>
                  <div className="info-card">
                    <Layers size={20} />
                    <div>
                      <span>Sheet untuk Part Ini</span>
                      <strong>{currentLayout.totalSheets} lembar</strong>
                    </div>
                  </div>
                  <div className="info-card">
                    <Percent size={20} />
                    <div>
                      <span>Utilisasi / Waste</span>
                      <strong className={currentLayout.utilization > 70 ? 'text-green' : 'text-orange'}>
                        {currentLayout.utilization.toFixed(1)}% / {currentLayout.wastePercent.toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="nesting-canvas">
                  <svg
                    viewBox={`0 0 ${currentLayout.sheetWidth} ${currentLayout.sheetHeight}`}
                    className="nesting-svg"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* Sheet background */}
                    <rect
                      x="0"
                      y="0"
                      width={currentLayout.sheetWidth}
                      height={currentLayout.sheetHeight}
                      fill="var(--bg-secondary)"
                      stroke="var(--border-color)"
                      strokeWidth="2"
                    />

                    {/* Grid lines */}
                    {Array.from({ length: Math.floor(currentLayout.sheetWidth / 100) }).map((_, i) => (
                      <line
                        key={`v-${i}`}
                        x1={(i + 1) * 100}
                        y1="0"
                        x2={(i + 1) * 100}
                        y2={currentLayout.sheetHeight}
                        stroke="var(--border-color)"
                        strokeDasharray="4"
                        opacity="0.5"
                      />
                    ))}
                    {Array.from({ length: Math.floor(currentLayout.sheetHeight / 100) }).map((_, i) => (
                      <line
                        key={`h-${i}`}
                        x1="0"
                        y1={(i + 1) * 100}
                        x2={currentLayout.sheetWidth}
                        y2={(i + 1) * 100}
                        stroke="var(--border-color)"
                        strokeDasharray="4"
                        opacity="0.5"
                      />
                    ))}

                    {/* Parts */}
                    {currentLayout.positions.length === 0 && (
                      <text x="50%" y="50%" textAnchor="middle" fill="#999" fontSize="20">
                        Tidak ada part yang bisa ditampilkan
                      </text>
                    )}
                    {currentLayout.positions.map((pos, idx) => {
                      // Find the original processed part to get the preview
                      // In the new logic, the layouts map 1:1 to processed parts in order?
                      // Wait, we didn't store the preview in SheetLayout.
                      // But we stored partId. 
                      // We can try to look it up from selections or files.
                      // Or just use the one from files[0] as fallback?
                      // Better: Let's assume we can find it by index if we didn't store it.
                      // Since we iterate partsToProcess to create layouts, layout index matches part index.
                      
                      const partPreview = selections.length > 0 && croppedPreviews.length > 0 
                          ? croppedPreviews[currentLayoutIndex] 
                          : files[currentLayoutIndex]?.preview || files[0]?.preview;

                      const isRotated = pos.rotation === 90;
                      const w = isRotated ? currentLayout.partHeight : currentLayout.partWidth;
                      const h = isRotated ? currentLayout.partWidth : currentLayout.partHeight;

                      return (
                        <g key={idx}>
                          {/* Part background */}
                          <rect
                            x={pos.x}
                            y={pos.y}
                            width={w}
                            height={h}
                            fill="white"
                            stroke="#3b82f6"
                            strokeWidth="2"
                          />
                          {/* Part design - use SVG image element */}
                          {partPreview && (
                            <image
                              x={pos.x + 2}
                              y={pos.y + 2}
                              width={w - 4}
                              height={h - 4}
                              xlinkHref={partPreview}
                              href={partPreview}
                              preserveAspectRatio="xMidYMid meet"
                              style={{ pointerEvents: 'none' }}
                            />
                          )}
                          {/* Part number label with background */}
                          <rect
                            x={pos.x + 5}
                            y={pos.y + 5}
                            width={24}
                            height={24}
                            fill="rgba(59, 130, 246, 0.9)"
                            rx="4"
                          />
                          <text
                            x={pos.x + 17}
                            y={pos.y + 22}
                            fontSize="14"
                            fill="white"
                            fontWeight="bold"
                            textAnchor="middle"
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
                    Export DXF (Semua Layout)
                  </button>
                </div>

                {currentLayout.partsPerSheet === 0 ? (
                  <div className="nesting-info-note error">
                    <AlertCircle size={16} />
                    <span>
                      Part terlalu besar untuk muat di sheet. Kurangi skala atau gunakan sheet yang lebih besar.
                    </span>
                  </div>
                ) : quantity > currentLayout.partsPerSheet ? (
                  <div className="nesting-info-note">
                    <AlertCircle size={16} />
                    <span>
                      {currentLayout.partsPerSheet} part muat per sheet.
                      Total {currentLayout.totalSheets} sheet untuk {quantity} pcs part ini.
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
        <div className="estimator-nav-container">
          {/* Validation Messages */}
          {(currentStepValidation.errors.length > 0 || currentStepValidation.warnings.length > 0) && (
            <div className="validation-messages">
              {currentStepValidation.errors.map((error, idx) => (
                <div key={`error-${idx}`} className="validation-message error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              ))}
              {currentStepValidation.warnings.map((warning, idx) => (
                <div key={`warning-${idx}`} className="validation-message warning">
                  <AlertCircle size={16} />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
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
              disabled={!canProceedToNextStep}
              title={!canProceedToNextStep ? currentStepValidation.errors.join(', ') : ''}
            >
              Selanjutnya
              <ChevronRight size={18} />
            </button>
          </div>
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
