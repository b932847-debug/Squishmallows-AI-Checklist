
import React, { useState, useMemo } from 'react';
import type { Squishmallow, Status } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { fetchMasterList, fetchItemDetails } from './services/fandomService';
import { SquishCard } from './components/SquishCard';
import { CameraModal } from './components/CameraModal';
import { CameraIcon, DownloadIcon, LoaderIcon } from './components/icons';

const STORAGE_KEY = 'squish_master_check_v2';

const App: React.FC = () => {
    const [items, setItems] = useLocalStorage<Squishmallow[]>(STORAGE_KEY, []);
    const [filter, setFilter] = useState('');
    const [statusText, setStatusText] = useState('Ready to start! Click "Load Master List" to fetch names from the wiki.');
    const [progress, setProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    const uid = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

    const filteredItems = useMemo(() => {
        if (!filter) return items;
        return items.filter(it => it.name.toLowerCase().includes(filter.toLowerCase()));
    }, [items, filter]);

    const handleLoadMasterList = async () => {
        setIsProcessing(true);
        setStatusText('Fetching master list...');
        setProgress(10);
        try {
            const names = await fetchMasterList();
            setProgress(50);
            let newCount = 0;
            const newItems = [...items];
            names.forEach(name => {
                if (!newItems.some(x => x.name === name)) {
                    newItems.push({
                        id: uid(),
                        name,
                        identified: false,
                        image: null,
                        extract: null,
                        status: 'untracked',
                        source: `https://squishmallowsquad.fandom.com/wiki/${encodeURIComponent(name)}`
                    });
                    newCount++;
                }
            });
            setItems(newItems);
            setStatusText(`Master list loaded. ${names.length} total names, ${newCount} new items added.`);
        } catch (error) {
            console.error(error);
            setStatusText('Failed to load master list. See console for details.');
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const handleAutoIdentifyAll = async () => {
        const toIdentify = items.filter(i => !i.identified);
        if (toIdentify.length === 0) {
            setStatusText('All items are already identified.');
            return;
        }
        setIsProcessing(true);
        setStatusText('Starting auto-identification...');
        const batchSize = 20;
        let done = 0;

        for (let i = 0; i < toIdentify.length; i += batchSize) {
            const batch = toIdentify.slice(i, i + batchSize);
            try {
                const updatedBatch = await fetchItemDetails(batch);
                setItems(currentItems => {
                    const newItems = [...currentItems];
                    updatedBatch.forEach(updatedItem => {
                        const index = newItems.findIndex(item => item.id === updatedItem.id);
                        if (index !== -1) {
                            newItems[index] = updatedItem;
                        }
                    });
                    return newItems;
                });
            } catch (e) {
                console.warn('A batch failed during identification', e);
            }
            done += batch.length;
            const percent = Math.round((done / toIdentify.length) * 100);
            setProgress(percent);
            setStatusText(`Auto-identifying: ${done}/${toIdentify.length}`);
            await new Promise(r => setTimeout(r, 800)); // Rate limit
        }
        setStatusText('Auto-identification complete.');
        setIsProcessing(false);
        setProgress(100);
        setTimeout(() => setProgress(0), 2000);
    };

    const handleExport = () => {
        const data = JSON.stringify(items, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'squishmallows_checklist.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleStatusChange = (id: string, status: Status) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    };
    
    const handleSetImage = (id: string) => {
        const url = prompt('Enter image URL for this Squishmallow:');
        if (url) {
            setItems(prev => prev.map(item => item.id === id ? { ...item, image: url } : item));
        }
    };

    const handleSelectionChange = (id: string, isSelected: boolean) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    };

    const handleSelectAllVisible = () => {
        const visibleIds = new Set(filteredItems.map(item => item.id));
        setSelectedItems(visibleIds);
    };
    
    const handleClearSelection = () => {
        setSelectedItems(new Set());
    };

    const handleBulkMark = (status: Status) => {
        setItems(prev => prev.map(item => selectedItems.has(item.id) ? { ...item, status } : item));
        handleClearSelection();
    };
    
    const handleIdentifiedFromCamera = (name: string) => {
        const item = items.find(it => it.name === name);
        if(item) {
            handleStatusChange(item.id, 'there');
            // Scroll to item
            const element = document.getElementById(`item-${item.id}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight it temporarily
            element?.classList.add('ring-2', 'ring-pink-500', 'transition-all', 'duration-1000');
            setTimeout(() => element?.classList.remove('ring-2', 'ring-pink-500'), 3000);
        }
        setIsCameraOpen(false);
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-300">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <header className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-amber-400">Squishmallows AI Checklist</h1>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setIsCameraOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg glass transition hover:text-[var(--accent)]">
                                <CameraIcon className="w-5 h-5" /> Identify
                            </button>
                            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg glass transition hover:text-[var(--accent)]">
                                <DownloadIcon className="w-5 h-5" /> Export
                            </button>
                        </div>
                    </div>
                </header>
                
                {/* Controls Panel */}
                <div className="glass rounded-xl p-4 mb-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <input
                            type="text"
                            placeholder="Filter by name..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="w-full bg-transparent border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
                        />
                         <button onClick={handleLoadMasterList} disabled={isProcessing} className="btn-accent px-4 py-2 text-sm font-semibold rounded-lg transition disabled:opacity-50 flex items-center justify-center">
                            {isProcessing && statusText.includes('Fetching') ? <LoaderIcon className="w-5 h-5 mr-2 animate-spin"/> : null}
                            Load Master List
                        </button>
                        <button onClick={handleAutoIdentifyAll} disabled={isProcessing} className="btn-accent px-4 py-2 text-sm font-semibold rounded-lg transition disabled:opacity-50 flex items-center justify-center">
                            {isProcessing && statusText.includes('identifying') ? <LoaderIcon className="w-5 h-5 mr-2 animate-spin"/> : null}
                            Auto-Identify All
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-[var(--border-color)]">
                        <div className="text-xs text-[var(--muted-text)] flex-1">{statusText}</div>
                        <div className="w-full sm:w-1/3 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-pink-500 to-amber-400 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-color)]">
                        <button onClick={handleSelectAllVisible} className="px-3 py-1.5 text-xs font-medium rounded-md glass hover:text-[var(--accent)] transition">Select Visible ({selectedItems.size})</button>
                        <button onClick={handleClearSelection} className="px-3 py-1.5 text-xs font-medium rounded-md glass hover:text-[var(--accent)] transition">Clear Selection</button>
                        <div className="flex-grow" />
                        <button onClick={() => handleBulkMark('there')} className="px-3 py-1.5 text-xs font-medium rounded-md glass hover:text-[var(--ok)] transition">Mark Selected 'There'</button>
                        <button onClick={() => handleBulkMark('arriving')} className="px-3 py-1.5 text-xs font-medium rounded-md glass hover:text-[var(--arr)] transition">Mark Selected 'Arriving'</button>
                        <button onClick={() => handleBulkMark('notthere')} className="px-3 py-1.5 text-xs font-medium rounded-md glass hover:text-[var(--no)] transition">Mark Selected 'Not There'</button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredItems.map(item => (
                        <div key={item.id} id={`item-${item.id}`} className="rounded-xl">
                            <SquishCard 
                                item={item} 
                                isSelected={selectedItems.has(item.id)}
                                onSelect={handleSelectionChange}
                                onStatusChange={handleStatusChange}
                                onSetImage={handleSetImage}
                            />
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {items.length === 0 && !isProcessing && (
                    <div className="text-center py-20">
                        <h2 className="text-xl font-semibold text-[var(--muted-text)]">Your checklist is empty.</h2>
                        <p className="text-[var(--muted-text)] mt-2">Click "Load Master List" to get started!</p>
                    </div>
                )}
            </div>
            <CameraModal 
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onIdentified={handleIdentifiedFromCamera}
                allItems={items.map(i => i.name)}
            />
        </div>
    );
};

export default App;
