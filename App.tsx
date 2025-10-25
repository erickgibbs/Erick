
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { editImageWithGemini } from './services/geminiService';
import type { ImageData } from './types';
import Spinner from './components/Spinner';
import { ArrowsPointingInIcon, BrushIcon, DownloadIcon, EraserIcon, LogoIcon, MagicWandIcon, MinusIcon, PlusIcon, RedoIcon, ToolsIcon, TrashIcon, UndoIcon, UploadIcon } from './components/icons';

const interiorQuickEdits = [
  { label: 'Virtual Staging', prompt: 'Virtually stage this empty room with modern and stylish furniture that complements the space.' },
  { label: 'Remove Clutter', prompt: 'Remove all clutter and personal items, making the space look clean, tidy, and depersonalized.' },
  { label: 'Modernize Kitchen', prompt: 'Modernize the kitchen with sleek quartz countertops, a new backsplash, and stainless steel appliances.' },
  { label: 'Change Flooring', prompt: 'Replace the current flooring with wide-plank, light oak colored hardwood floors.' },
  { label: 'Add Warm Lighting', prompt: 'Add warm, inviting ambient lighting to the room, making it feel bright and cozy.' },
  { label: 'Add Light Fixtures', prompt: 'Add stylish, modern light fixtures, such as recessed lighting or a contemporary chandelier.' },
  { label: 'Change Wall Color', prompt: 'Paint the walls a neutral and popular light gray color (Agreeable Gray).' },
  { label: 'Add Artwork', prompt: 'Add a single, large piece of tasteful and modern abstract art to the main wall.' },
  { label: 'Add Plants', prompt: 'Add a few elegant indoor plants, like a fiddle leaf fig or snake plant, to bring life to the room.' },
  { label: 'Update Hardware', prompt: 'Update cabinet and door hardware to a sleek, modern matte black finish.' },
];

const exteriorQuickEdits = [
    { label: 'Enhance Landscaping', prompt: 'Enhance the landscaping with lush, colorful flower beds, manicured shrubs, and fresh dark mulch.' },
    { label: 'Make Lawn Green', prompt: 'Replace the lawn with a vibrant, healthy, and perfectly manicured green grass carpet.' },
    { label: 'Clean Driveway/Walkway', prompt: 'Power wash the driveway and all walkways to remove stains, weeds, and grime, making them look brand new.' },
    { label: 'Make Sky Blue', prompt: 'Replace the overcast or dull sky with a clear, beautiful, and realistic blue sky with a few wispy clouds.' },
    { label: 'Twilight Conversion', prompt: 'Convert this daytime photo to a dramatic twilight scene, with a beautiful sunset sky, glowing interior lights, and exterior accent lighting.' },
    { label: 'Modernize Paint', prompt: 'Paint the house exterior a modern and popular neutral color like a warm off-white or light gray, including the trim.' },
    { label: 'Add a Pool', prompt: 'Add a modern, rectangular in-ground swimming pool with a clean stone patio and lounge chairs to the backyard.' },
    { label: 'Update Front Door', prompt: 'Paint the front door a bold, attractive color like navy blue or black and update the hardware.' },
    { label: 'Repair Fence', prompt: 'Repair and paint the fence to make it look brand new and in perfect condition.' },
    { label: 'Clean Roof', prompt: 'Clean the roof, removing all dark streaks, moss, and debris to improve the home\'s curb appeal.' },
]

const Header = () => (
    <header className="w-full flex justify-center md:justify-start items-center p-4 md:px-8 border-b border-gray-700">
        <div className="flex items-center gap-3">
            <LogoIcon className="w-10 h-10" />
            <h1 className="text-2xl font-bold text-white tracking-tight">RealtyAI Photo Editor</h1>
        </div>
    </header>
);

const App: React.FC = () => {
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = useState<number>(40);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState('quick-interior');
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  // Zoom/Pan State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const startPanPosition = useRef({ x: 0, y: 0 });

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentImage = history[historyIndex] || null;

  const resetZoomAndPan = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const handleStartOver = () => {
    if (history.length > 0) {
        setHistory(history.slice(0, 1));
        setHistoryIndex(0);
    }
    setPrompt('');
    setError(null);
    setIsLoading(false);
    clearCanvas();
    resetZoomAndPan();
  };
  
  const resetForNewUpload = () => {
    setHistory([]);
    setHistoryIndex(0);
    setPrompt('');
    setError(null);
    setIsLoading(false);
    clearCanvas();
    resetZoomAndPan();
  }

  useEffect(() => {
    const setCanvasSize = () => {
      const image = imageRef.current;
      const canvas = maskCanvasRef.current;
      if (image && canvas && image.naturalWidth > 0) {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
      }
    };

    const imageEl = imageRef.current;
    if (imageEl) {
      imageEl.addEventListener('load', setCanvasSize);
      if (imageEl.complete) setCanvasSize();
    }
    return () => {
      if (imageEl) imageEl.removeEventListener('load', setCanvasSize);
    };
  }, [currentImage]);

  const getCursorPosition = (event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement> | React.WheelEvent): [number, number] => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return [0, 0];

    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in event ? event.touches[0] : event;
    
    // Transform screen coordinates to canvas coordinates
    const screenX = touch.clientX - rect.left;
    const screenY = touch.clientY - rect.top;
    
    const canvasX = (screenX - position.x) / scale;
    const canvasY = (screenY - position.y) / scale;

    return [canvasX, canvasY];
  };


  const startDrawing = (event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    if ('button' in event && event.button !== 0) return;
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    setIsDrawing(true);
    const [x, y] = getCursorPosition(event);
    context.beginPath();
    context.moveTo(x, y);
  };
  
  const draw = (event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
  
    context.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out';
    context.fillStyle = 'rgba(79, 209, 197, 0.5)';
    
    const [x, y] = getCursorPosition(event);
    context.lineTo(x, y);
    context.strokeStyle = 'rgba(79, 209, 197, 0.5)';
    context.lineWidth = brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
    context.beginPath();
    context.moveTo(x, y);
  };

  const stopDrawing = () => {
    if(isDrawing) {
        const canvas = maskCanvasRef.current?.getContext('2d');
        if (canvas) canvas.closePath();
        setIsDrawing(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      resetForNewUpload();
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage: ImageData = {
            base64: (reader.result as string).split(',')[1],
            mimeType: file.type,
            name: file.name,
        };
        setHistory([newImage]);
        setHistoryIndex(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const getMaskData = async (): Promise<{ base64: string; mimeType: string } | undefined> => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return undefined;
  
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return undefined;
    const pixelBuffer = new Uint32Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    if (!pixelBuffer.some(pixel => pixel !== 0)) return undefined;

    const dataUrl = canvas.toDataURL('image/png');
    return { base64: dataUrl.split(',')[1], mimeType: 'image/png' };
  };

  const handleEnhance = async (promptToUse: string) => {
    if (!currentImage || !promptToUse) {
      setError("Please upload an image and provide a prompt.");
      return;
    }
    setIsLoading(true);
    setError(null);
    if (isToolsOpen) setIsToolsOpen(false);

    try {
      const maskData = await getMaskData();
      const newImageBase64 = await editImageWithGemini(currentImage, promptToUse, maskData);
      
      const newEditData: ImageData = {
        base64: newImageBase64,
        mimeType: 'image/png',
        name: `${currentImage.name.split('.')[0]}_edit_${history.length}.png`,
      };

      const newHistory = [...history.slice(0, historyIndex + 1), newEditData];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      clearCanvas();
      resetZoomAndPan();

    // Fix: Corrected the malformed try-catch block which caused numerous scope errors.
    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickEdit = (quickPrompt: string) => {
    setPrompt(quickPrompt);
    handleEnhance(quickPrompt);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      resetZoomAndPan();
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      resetZoomAndPan();
    }
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${currentImage.base64}`;
    link.download = `${currentImage.name.split('.')[0]}_edited.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Zoom/Pan Handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const [x, y] = getCursorPosition(e);
    const zoomFactor = 1.1;
    const newScale = e.deltaY > 0 ? scale / zoomFactor : scale * zoomFactor;
    const minScale = 0.2, maxScale = 10;
    const clampedScale = Math.max(minScale, Math.min(newScale, maxScale));

    const newX = position.x + (x - (x - position.x) / scale) * (scale - clampedScale);
    const newY = position.y + (y - (y - position.y) / scale) * (scale - clampedScale);

    setScale(clampedScale);
    setPosition({ x: newX, y: newY });
  };
  
  const startPan = (e: React.MouseEvent) => {
    if(e.button !== 0) return;
    e.preventDefault();
    isPanning.current = true;
    startPanPosition.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const pan = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    e.preventDefault();
    setPosition({
        x: e.clientX - startPanPosition.current.x,
        y: e.clientY - startPanPosition.current.y
    });
  };

  const endPan = () => {
    isPanning.current = false;
  };
  
  const handleZoom = (direction: 'in' | 'out') => {
    const zoomFactor = 1.5;
    const newScale = direction === 'in' ? scale * zoomFactor : scale / zoomFactor;
    const minScale = 0.2, maxScale = 10;
    const clampedScale = Math.max(minScale, Math.min(newScale, maxScale));
    setScale(clampedScale);
  };

  const EditorTools = () => (
    <div className="flex flex-col gap-4 p-4">
        {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md text-sm relative">
                <p className="font-bold pr-6">Error</p>
                <p>{error}</p>
                <button onClick={() => setError(null)} className="absolute top-2 right-2 text-red-300 hover:text-white">&times;</button>
            </div>
        )}
        
        <button 
            onClick={triggerFileUpload} 
            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 transition-colors text-white font-semibold py-2.5 px-4 rounded-lg">
            <UploadIcon className="w-5 h-5"/> {currentImage ? 'Upload New' : 'Upload Image'}
        </button>
        
        <div className="border-b border-gray-700">
            <nav className="-mb-px flex gap-4" aria-label="Tabs">
                <button onClick={() => setActiveTab('quick-interior')} className={`${activeTab === 'quick-interior' ? 'border-teal-400 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>Interior</button>
                <button onClick={() => setActiveTab('quick-exterior')} className={`${activeTab === 'quick-exterior' ? 'border-teal-400 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>Exterior</button>
                <button onClick={() => setActiveTab('magic-brush')} className={`${activeTab === 'magic-brush' ? 'border-teal-400 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>Magic Brush</button>
            </nav>
        </div>

        {activeTab === 'quick-interior' && (
            <div className="grid grid-cols-2 gap-2">
                {interiorQuickEdits.map((item) => (
                    <button key={item.label} onClick={() => handleQuickEdit(item.prompt)} disabled={!currentImage || isLoading} className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors text-white text-xs font-semibold py-2 px-2 rounded-md text-center h-12">
                        {item.label}
                    </button>
                ))}
            </div>
        )}
        {activeTab === 'quick-exterior' && (
            <div className="grid grid-cols-2 gap-2">
                {exteriorQuickEdits.map((item) => (
                    <button key={item.label} onClick={() => handleQuickEdit(item.prompt)} disabled={!currentImage || isLoading} className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors text-white text-xs font-semibold py-2 px-2 rounded-md text-center h-12">
                        {item.label}
                    </button>
                ))}
            </div>
        )}
        {activeTab === 'magic-brush' && (
            <div className="flex flex-col gap-4">
                <div className="bg-gray-900/50 p-3 rounded-lg flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setTool('brush')} className={`p-2 rounded-md transition-colors ${tool === 'brush' ? 'bg-teal-500' : 'bg-gray-700 hover:bg-gray-600'}`} title="Brush"><BrushIcon className="w-5 h-5" /></button>
                        <button onClick={() => setTool('eraser')} className={`p-2 rounded-md transition-colors ${tool === 'eraser' ? 'bg-teal-500' : 'bg-gray-700 hover:bg-gray-600'}`} title="Eraser"><EraserIcon className="w-5 h-5" /></button>
                    </div>
                    <div className="flex items-center gap-2 flex-grow sm:flex-grow-0 justify-center">
                        <label htmlFor="brushSize" className="text-sm">Size:</label>
                        <input type="range" id="brushSize" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-24"/>
                    </div>
                    <button onClick={clearCanvas} className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors" title="Clear Mask"><TrashIcon className="w-5 h-5" /></button>
                </div>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., 'make this sofa blue'" className="bg-gray-700 border border-gray-600 rounded-md p-2 w-full h-24 resize-none focus:ring-2 focus:ring-teal-500 focus:outline-none" disabled={!currentImage}/>
                <button onClick={() => handleEnhance(prompt)} disabled={!currentImage || !prompt || isLoading} className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-white font-bold py-3 px-4 rounded-md text-lg">
                    <MagicWandIcon className="w-6 h-6"/> Generate
                </button>
            </div>
        )}
    </div>
);

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex flex-col antialiased">
      {isLoading && <Spinner />}
      <Header />
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel: Controls */}
        <aside className="hidden md:block w-96 bg-gray-800 border-r border-gray-700 overflow-y-auto">
            <EditorTools />
        </aside>

        {/* Right Panel: Image Viewer */}
        <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
          <div className="w-full flex justify-between items-center p-2 border-b border-gray-700 bg-gray-800/50">
            <div className="flex items-center gap-2">
                <button onClick={handleStartOver} disabled={history.length <= 1} className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-gray-700 disabled:text-gray-500 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors" title="Start Over"><TrashIcon className="w-4 h-4"/>Start Over</button>
                <div className="flex items-center gap-1 bg-gray-700/50 rounded-md p-0.5">
                    <button onClick={() => handleZoom('out')} className="p-1 rounded-md hover:bg-gray-600 transition-colors"><MinusIcon className="w-4 h-4" /></button>
                    <button onClick={resetZoomAndPan} className="p-1 rounded-md hover:bg-gray-600 transition-colors"><ArrowsPointingInIcon className="w-4 h-4" /></button>
                    <button onClick={() => handleZoom('in')} className="p-1 rounded-md hover:bg-gray-600 transition-colors"><PlusIcon className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={handleUndo} disabled={historyIndex === 0} className="p-2 rounded-md hover:bg-gray-700 disabled:text-gray-500 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors" title="Undo"><UndoIcon className="w-5 h-5" /></button>
                <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-md hover:bg-gray-700 disabled:text-gray-500 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors" title="Redo"><RedoIcon className="w-5 h-5" /></button>
            </div>
             <div className="flex items-center gap-2">
                {history.length > 1 && <button onClick={handleDownload} className="flex items-center gap-2 text-sm bg-teal-600 hover:bg-teal-700 text-white font-semibold py-1.5 px-3 rounded-md transition-colors"><DownloadIcon className="w-4 h-4"/>Download</button>}
             </div>
          </div>
          
          <div 
            ref={imageContainerRef} 
            className="flex-1 flex items-center justify-center p-4 relative overflow-hidden"
            onWheel={handleWheel}
            onMouseDown={startPan}
            onMouseMove={pan}
            onMouseUp={endPan}
            onMouseLeave={endPan}
            style={{ cursor: isPanning.current ? 'grabbing' : 'grab' }}
            >
            {currentImage ? (
              <div className="relative" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transformOrigin: 'top left' }}>
                <img
                  ref={imageRef}
                  src={`data:${currentImage.mimeType};base64,${currentImage.base64}`}
                  alt="Current"
                  className="max-w-none max-h-none object-contain select-none"
                  style={{ userSelect: 'none', display: 'block' }}
                />
                <canvas
                  ref={maskCanvasRef}
                  className="absolute top-0 left-0"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{
                    width: imageRef.current?.clientWidth,
                    height: imageRef.current?.clientHeight, 
                    cursor: 'crosshair',
                    touchAction: 'none' 
                  }}
                />
              </div>
            ) : (
                <div className="text-center text-gray-400 p-4 flex flex-col items-center gap-4">
                    <LogoIcon className="w-24 h-24 opacity-10" />
                    <h2 className="text-xl font-semibold text-gray-300">Welcome to RealtyAI</h2>
                    <p className="max-w-sm">Upload a property photo to get started. Enhance lighting, stage rooms, or clean up exteriors with the power of AI.</p>
                    <button onClick={triggerFileUpload} className="mt-4 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 transition-colors text-white font-bold py-3 px-6 rounded-lg text-lg">
                        <UploadIcon className="w-6 h-6"/> Upload Your First Photo
                    </button>
                </div>
            )}
          </div>
        </div>

        {/* Mobile Tools Panel */}
        <div className={`md:hidden fixed bottom-0 left-0 right-0 z-20 bg-gray-800 border-t border-gray-700 transform transition-transform duration-300 ease-in-out ${isToolsOpen ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
                <EditorTools />
            </div>
        </div>

        {/* Mobile Bottom Bar */}
        <div className="md:hidden flex items-center justify-between p-2 bg-gray-800 border-t border-gray-700">
            <button onClick={() => setIsToolsOpen(!isToolsOpen)} className="flex items-center gap-2 p-2 rounded-md text-teal-400 hover:bg-gray-700">
                <ToolsIcon className="w-5 h-5"/>
                <span className="font-semibold">{isToolsOpen ? 'Close' : 'Tools'}</span>
            </button>
             <button onClick={() => handleEnhance(prompt)} disabled={!currentImage || !prompt || isLoading} className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-md">
                <MagicWandIcon className="w-5 h-5"/> Generate
            </button>
        </div>

      </main>
    </div>
  );
};

export default App;
