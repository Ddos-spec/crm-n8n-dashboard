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
  Move
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

interface Material {
  id: string;
  name: string;
  thickness: number[];
  pricePerMeter: number;
  cuttingSpeed: number; // mm/min
}

interface NestingResult {
  sheetWidth: number;
  sheetHeight: number;
  utilization: number;
  positions: { x: number; y: number; rotation: number }[];
  quantity: number;
}

interface EstimationResult {
  totalCuttingLength: number;
  cuttingTime: number;
  materialCost: number;
  laborCost: number;
  totalCost: number;
  pricePerPiece: number;
}

interface SettingsData {
  laborCostPerMinute: number;
  machineType: string;
  defaultSheetWidth: number;
  defaultSheetHeight: number;
  materials: Material[];
}

const DEFAULT_MATERIALS: Material[] = [
  { id: 'ss304', name: 'Stainless Steel 304', thickness: [0.5, 1, 1.5, 2, 3], pricePerMeter: 15000, cuttingSpeed: 3000 },
  { id: 'ss316', name: 'Stainless Steel 316', thickness: [0.5, 1, 1.5, 2, 3], pricePerMeter: 20000, cuttingSpeed: 2800 },
  { id: 'ms', name: 'Mild Steel', thickness: [1, 2, 3, 4, 5, 6], pricePerMeter: 8000, cuttingSpeed: 4000 },
  { id: 'aluminum', name: 'Aluminium', thickness: [1, 2, 3, 4, 5], pricePerMeter: 12000, cuttingSpeed: 5000 },
  { id: 'galvanized', name: 'Galvanized Steel', thickness: [0.5, 1, 1.5, 2], pricePerMeter: 10000, cuttingSpeed: 3500 },
];

const DEFAULT_SETTINGS: SettingsData = {
  laborCostPerMinute: 1500,
  machineType: 'Fiber Laser 1500W',
  defaultSheetWidth: 1220,
  defaultSheetHeight: 2440,
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

export default function Estimator() {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<FileData[]>([]);
  const [, setSelectedPaths] = useState<string[]>([]);
  const [scale, setScale] = useState({ value: 1, unit: 'mm' as 'mm' | 'cm' | 'inch' });
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('estimator-settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: SettingsData) => {
    setSettings(newSettings);
    localStorage.setItem('estimator-settings', JSON.stringify(newSettings));
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
      // Send all files to backend for processing
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

  // Calculate nesting (simple grid layout)
  const calculateNesting = () => {
    if (files.length === 0) return;

    const file = files[0];
    const dims = file.dimensions || { width: 100, height: 100 };
    const scaledWidth = dims.width * scale.value * (scale.unit === 'cm' ? 10 : scale.unit === 'inch' ? 25.4 : 1);
    const scaledHeight = dims.height * scale.value * (scale.unit === 'cm' ? 10 : scale.unit === 'inch' ? 25.4 : 1);

    const sheetW = settings.defaultSheetWidth;
    const sheetH = settings.defaultSheetHeight;
    const gap = 5; // 5mm gap between parts

    const cols = Math.floor(sheetW / (scaledWidth + gap));
    const rows = Math.floor(sheetH / (scaledHeight + gap));

    const positions = [];
    for (let r = 0; r < Math.min(rows, Math.ceil(quantity / cols)); r++) {
      for (let c = 0; c < Math.min(cols, quantity - r * cols); c++) {
        positions.push({
          x: c * (scaledWidth + gap) + gap,
          y: r * (scaledHeight + gap) + gap,
          rotation: 0,
        });
      }
    }

    const usedArea = positions.length * scaledWidth * scaledHeight;
    const utilization = (usedArea / (sheetW * sheetH)) * 100;

    setNestingResult({
      sheetWidth: sheetW,
      sheetHeight: sheetH,
      utilization,
      positions,
      quantity: positions.length,
    });
  };

  // Calculate estimation
  const calculateEstimation = () => {
    if (!selectedMaterial || !nestingResult) return;

    const material = settings.materials.find(m => m.id === selectedMaterial);
    if (!material) return;

    // Calculate total cutting length
    let totalLength = 0;
    files.forEach(f => {
      f.paths?.forEach(p => {
        if (p.selected) {
          const scaleFactor = scale.value * (scale.unit === 'cm' ? 10 : scale.unit === 'inch' ? 25.4 : 1);
          totalLength += p.length * scaleFactor;
        }
      });
    });
    totalLength *= quantity; // Multiply by quantity

    // Calculate cutting time (in minutes)
    const cuttingSpeed = material.cuttingSpeed * (1 - selectedThickness * 0.1); // Slower for thicker material
    const cuttingTime = totalLength / cuttingSpeed;

    // Calculate costs
    const materialCost = (totalLength / 1000) * material.pricePerMeter; // Convert mm to m
    const laborCost = cuttingTime * settings.laborCostPerMinute;
    const totalCost = materialCost + laborCost;
    const pricePerPiece = totalCost / quantity;

    setEstimation({
      totalCuttingLength: totalLength,
      cuttingTime,
      materialCost,
      laborCost,
      totalCost,
      pricePerPiece,
    });
  };

  // Navigation
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return files.length > 0;
      case 2: return files.some(f => f.paths && f.paths.some(p => p.selected));
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
    setSelectedPaths([]);
    setScale({ value: 1, unit: 'mm' });
    setSelectedMaterial('');
    setSelectedThickness(0);
    setQuantity(1);
    setNestingResult(null);
    setEstimation(null);
    setError(null);
    setZoom(1);
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
                      <button className="file-remove" onClick={() => removeFile(idx)}>
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

      case 2:
        return (
          <div className="step-content">
            <h2 className="step-title">Preview & Seleksi</h2>
            <p className="step-description">Tinjau dan pilih path yang akan di-cut</p>

            <div className="preview-container">
              <div className="preview-toolbar">
                <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} title="Zoom Out">
                  <ZoomOut size={18} />
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} title="Zoom In">
                  <ZoomIn size={18} />
                </button>
                <button onClick={() => setZoom(1)} title="Reset Zoom">
                  <Move size={18} />
                </button>
              </div>

              <div className="preview-canvas" style={{ transform: `scale(${zoom})` }}>
                {files.map((f, idx) => (
                  <div key={idx} className="preview-item">
                    {f.preview ? (
                      <img src={f.preview} alt={f.file.name} />
                    ) : (
                      <div className="dxf-preview">
                        <p>Memproses file...</p>
                        {f.dimensions && (
                          <p>{f.dimensions.width.toFixed(1)} x {f.dimensions.height.toFixed(1)} unit</p>
                        )}
                      </div>
                    )}
                    {f.dimensions && f.dimensions.width > 0 && (
                      <div className="preview-dimensions">
                        {f.dimensions.width.toFixed(1)} x {f.dimensions.height.toFixed(1)} unit
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {files[0]?.paths && files[0].paths.length > 0 && (
                <div className="path-selection">
                  <h4>Path yang terdeteksi: {files[0].paths.length}</h4>
                  <div className="path-list">
                    {files[0].paths.map((path, idx) => (
                      <label key={path.id} className="path-item">
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
                        <span>Path {idx + 1}</span>
                        <span className="path-length">{path.length.toFixed(1)} unit</span>
                      </label>
                    ))}
                  </div>
                  <div className="path-actions">
                    <button onClick={() => {
                      const newFiles = [...files];
                      newFiles[0].paths?.forEach(p => p.selected = true);
                      setFiles(newFiles);
                    }}>Pilih Semua</button>
                    <button onClick={() => {
                      const newFiles = [...files];
                      newFiles[0].paths?.forEach(p => p.selected = false);
                      setFiles(newFiles);
                    }}>Hapus Semua</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <h2 className="step-title">Atur Skala & Unit</h2>
            <p className="step-description">Tentukan skala dan satuan ukuran desain Anda</p>

            <div className="scale-settings">
              <div className="setting-group">
                <label>Skala</label>
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
                <label>Jumlah Potongan</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="quantity-input"
                />
              </div>

              {files[0]?.dimensions && (
                <div className="dimension-preview">
                  <h4>Dimensi Hasil</h4>
                  <div className="dimension-values">
                    <div>
                      <span>Lebar:</span>
                      <strong>
                        {(files[0].dimensions.width * scale.value).toFixed(2)} {scale.unit}
                      </strong>
                    </div>
                    <div>
                      <span>Tinggi:</span>
                      <strong>
                        {(files[0].dimensions.height * scale.value).toFixed(2)} {scale.unit}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <h2 className="step-title">Pilih Material</h2>
            <p className="step-description">Pilih jenis material dan ketebalan yang akan digunakan</p>

            <div className="material-selection">
              <div className="material-grid">
                {settings.materials.map(material => (
                  <div
                    key={material.id}
                    className={`material-card ${selectedMaterial === material.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedMaterial(material.id);
                      setSelectedThickness(0);
                    }}
                  >
                    <div className="material-icon">
                      <Layers size={24} />
                    </div>
                    <h4>{material.name}</h4>
                    <p className="material-price">Rp {material.pricePerMeter.toLocaleString()}/m</p>
                    {selectedMaterial === material.id && (
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
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="step-content">
            <h2 className="step-title">Simulasi Nesting</h2>
            <p className="step-description">Lihat layout pemotongan pada sheet material</p>

            {nestingResult && (
              <div className="nesting-preview">
                <div className="nesting-info">
                  <div className="info-item">
                    <span>Ukuran Sheet</span>
                    <strong>{nestingResult.sheetWidth} x {nestingResult.sheetHeight} mm</strong>
                  </div>
                  <div className="info-item">
                    <span>Jumlah Part</span>
                    <strong>{nestingResult.quantity} pcs</strong>
                  </div>
                  <div className="info-item">
                    <span>Utilisasi Material</span>
                    <strong className={nestingResult.utilization > 70 ? 'good' : 'warning'}>
                      {nestingResult.utilization.toFixed(1)}%
                    </strong>
                  </div>
                </div>

                <div className="nesting-canvas">
                  <svg
                    viewBox={`0 0 ${nestingResult.sheetWidth} ${nestingResult.sheetHeight}`}
                    className="nesting-svg"
                  >
                    {/* Sheet background */}
                    <rect
                      x="0"
                      y="0"
                      width={nestingResult.sheetWidth}
                      height={nestingResult.sheetHeight}
                      fill="#f8fafc"
                      stroke="#e2e8f0"
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
                        stroke="#e2e8f0"
                        strokeDasharray="4"
                      />
                    ))}
                    {Array.from({ length: Math.floor(nestingResult.sheetHeight / 100) }).map((_, i) => (
                      <line
                        key={`h-${i}`}
                        x1="0"
                        y1={(i + 1) * 100}
                        x2={nestingResult.sheetWidth}
                        y2={(i + 1) * 100}
                        stroke="#e2e8f0"
                        strokeDasharray="4"
                      />
                    ))}

                    {/* Parts */}
                    {nestingResult.positions.map((pos, idx) => {
                      const dims = files[0]?.dimensions || { width: 100, height: 100 };
                      const scaleFactor = scale.value * (scale.unit === 'cm' ? 10 : scale.unit === 'inch' ? 25.4 : 1);
                      const w = dims.width * scaleFactor;
                      const h = dims.height * scaleFactor;
                      return (
                        <g key={idx} transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.rotation})`}>
                          <rect
                            width={w}
                            height={h}
                            fill="#3b82f6"
                            fillOpacity="0.2"
                            stroke="#3b82f6"
                            strokeWidth="1"
                          />
                          <text
                            x={w / 2}
                            y={h / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="12"
                            fill="#3b82f6"
                          >
                            {idx + 1}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {quantity > nestingResult.quantity && (
                  <div className="nesting-warning">
                    <AlertCircle size={16} />
                    <span>
                      Hanya {nestingResult.quantity} dari {quantity} part yang muat dalam 1 sheet.
                      Dibutuhkan {Math.ceil(quantity / nestingResult.quantity)} sheet.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="step-content">
            <h2 className="step-title">Hasil Estimasi</h2>
            <p className="step-description">Ringkasan biaya pemotongan laser</p>

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
                  <h4>Detail Perhitungan</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span>Total Panjang Cutting</span>
                      <strong>{(estimation.totalCuttingLength / 1000).toFixed(2)} m</strong>
                    </div>
                    <div className="detail-item">
                      <span>Estimasi Waktu Cutting</span>
                      <strong>{estimation.cuttingTime.toFixed(1)} menit</strong>
                    </div>
                    <div className="detail-item">
                      <span>Biaya Material</span>
                      <strong>Rp {estimation.materialCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Biaya Jasa</span>
                      <strong>Rp {estimation.laborCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</strong>
                    </div>
                  </div>
                </div>

                <div className="result-summary">
                  <h4>Ringkasan Order</h4>
                  <table className="summary-table">
                    <tbody>
                      <tr>
                        <td>Material</td>
                        <td>{settings.materials.find(m => m.id === selectedMaterial)?.name}</td>
                      </tr>
                      <tr>
                        <td>Ketebalan</td>
                        <td>{selectedThickness} mm</td>
                      </tr>
                      <tr>
                        <td>Jumlah</td>
                        <td>{quantity} pcs</td>
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
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Pengaturan</h2>
              <button className="modal-close" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
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
              </div>

              <div className="setting-section">
                <h3>Biaya</h3>
                <div className="setting-row">
                  <label>Biaya Jasa per Menit (Rp)</label>
                  <input
                    type="number"
                    value={settings.laborCostPerMinute}
                    onChange={(e) => saveSettings({ ...settings, laborCostPerMinute: parseInt(e.target.value) || 0 })}
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

              <div className="setting-section">
                <h3>Material</h3>
                <p className="setting-hint">Klik material untuk edit harga per meter</p>
                {settings.materials.map((mat, idx) => (
                  <div key={mat.id} className="material-setting">
                    <span>{mat.name}</span>
                    <div className="material-price-input">
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
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
