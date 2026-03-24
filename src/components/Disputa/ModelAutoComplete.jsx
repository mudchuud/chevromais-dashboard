import React, { useState, useEffect, useRef, useMemo } from "react";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { app } from "../firebase-config";

// --- Cache e listeners globais ---
let cachedMarcas = [];
let cachedModelos = [];
let marcasListeners = new Set();
let modelosListeners = new Set();
let listenersInitialized = false;

function initGlobalListeners() {
	if (listenersInitialized) return;
	const db = getDatabase(app);

	const brandsRef = ref(db, "brands");
	const modelsRef = ref(db, "models");

	onValue(brandsRef, (snap) => {
		const data = snap.val() || {};
		cachedMarcas = Object.entries(data).map(([id, item]) => ({
			id,
			name: item.name,
			usage: item.usage || 0,
		}));
		cachedMarcas.sort((a, b) => b.usage - a.usage || a.name.localeCompare(b.name));
		marcasListeners.forEach((cb) => cb(cachedMarcas));
	});

	onValue(modelsRef, (snap) => {
		const data = snap.val() || {};
		cachedModelos = Object.entries(data).map(([id, item]) => ({
			id,
			name: item.name,
			brandID: item.brandID ? String(item.brandID) : "",
			usage: item.usage || 0,
		}));
		modelosListeners.forEach((cb) => cb(cachedModelos));
	});

	listenersInitialized = true;

	// cleanup global
	return () => {
		off(brandsRef);
		off(modelsRef);
	};
}

function subscribeMarcas(cb) {
	marcasListeners.add(cb);
	cb(cachedMarcas);
	return () => marcasListeners.delete(cb);
}

function subscribeModelos(cb) {
	modelosListeners.add(cb);
	cb(cachedModelos);
	return () => modelosListeners.delete(cb);
}

export default function ModelAutocomplete({ index, onSelectMarca, onSelectModelo }) {
	const [marcaInput, setMarcaInput] = useState("");
	const [marcas, setMarcas] = useState([]);
	const [showMarcaSuggestions, setShowMarcaSuggestions] = useState(false);
	const [selectedMarca, setSelectedMarca] = useState(null);

	const [modeloInput, setModeloInput] = useState("");
	const [modelos, setModelos] = useState([]);
	const [showModeloSuggestions, setShowModeloSuggestions] = useState(false);
	const [selectedModelo, setSelectedModelo] = useState(null);

	const [marcaHighlightIndex, setMarcaHighlightIndex] = useState(-1);
	const [modeloHighlightIndex, setModeloHighlightIndex] = useState(-1);

	const marcaRef = useRef(null);
	const modeloRef = useRef(null);

	useEffect(() => {
		const cleanup = initGlobalListeners();
		const unsubMarcas = subscribeMarcas(setMarcas);
		const unsubModelos = subscribeModelos(setModelos);
		return () => {
			unsubMarcas();
			unsubModelos();
			cleanup && cleanup();
		};
	}, []);

	const marcaInputLower = marcaInput.toLowerCase();
	const modeloInputLower = modeloInput.toLowerCase();

	const getModeloSuggestions = useMemo(() => {
        const lowercasedInput = modeloInput.toLowerCase();
        const filtered = modelos.filter((m) => m.name.toLowerCase().startsWith(lowercasedInput));
        
        const grouped = filtered.reduce((acc, current) => {
            const existing = acc.find(item => item.name.toLowerCase() === current.name.toLowerCase());
            if (existing) {
                existing.usage += current.usage;
                if(current.brandID) {
                    existing.brandIDs.add(current.brandID);
                }
            } else {
                acc.push({
                    ...current,
                    brandIDs: new Set(current.brandID ? [current.brandID] : []),
                });
            }
            return acc;
        }, []);

		if (modeloInput.trim() !== "" && !modelos.some((m) => m.name.toLowerCase() === modeloInputLower)) {
			grouped.push({
				id: "__custom_modelo__",
				name: modeloInput.trim(),
				custom: true,
				usage: -1,
                brandIDs: new Set(),
			});
		}
		return grouped.sort((a, b) => b.usage - a.usage || a.name.localeCompare(b.name));
	}, [modeloInput, modelos]);

	const getMarcaSuggestions = useMemo(() => {
        if (!selectedModelo) return [];
    
        const brandIdsOfSelectedModel = selectedModelo.brandIDs ? Array.from(selectedModelo.brandIDs) : [];
        
        let filtered = marcas;

        if (brandIdsOfSelectedModel.length > 0) {
            filtered = marcas.filter(m => brandIdsOfSelectedModel.includes(String(m.id)));
        }

        if (marcaInput.trim() !== '') {
            filtered = filtered.filter(m => m.name.toLowerCase().startsWith(marcaInputLower));
        }

		if (marcaInput.trim() !== "" && !marcas.some((m) => m.name.toLowerCase() === marcaInputLower)) {
			filtered.push({
				id: "__custom_marca__",
				name: marcaInput.trim(),
				custom: true,
				usage: -1,
			});
		}
		return filtered.sort((a, b) => b.usage - a.usage || a.name.localeCompare(b.name));
	}, [marcaInputLower, marcas, selectedModelo]);

	const isModeloCustom = modeloInput.trim() !== "" && !modelos.some((m) => m.name.toLowerCase() === modeloInputLower);
	const isMarcaCustom = marcaInput.trim() !== "" && !marcas.some((m) => m.name.toLowerCase() === marcaInputLower);

	const handleSelectModelo = (modelo) => {
		setModeloInput(modelo.name);
		setSelectedModelo(modelo);
		setShowModeloSuggestions(false);
		setModeloHighlightIndex(-1);
		onSelectModelo?.(modelo);

		if (modeloRef.current) {
			modeloRef.current.setAttribute("data-usage", modelo.usage || 0);
			if (modelo.id && !modelo.custom) modeloRef.current.setAttribute("data-model-id", modelo.id);
			else modeloRef.current.removeAttribute("data-model-id");
		}

		const brandIds = modelo.brandIDs ? Array.from(modelo.brandIDs) : [];

		if (brandIds.length === 1) {
			const marca = marcas.find((m) => String(m.id) === brandIds[0]);
			if (marca) {
				handleSelectMarca(marca, true);
                setTimeout(() => {
				    const next = document.querySelector(`[data-modelo-index="${index + 1}"]`);
				    next?.focus();
			    }, 10);
			}
		} else {
			setMarcaInput("");
			setSelectedMarca(null);
			if (marcaRef.current) {
				marcaRef.current.setAttribute("data-usage", 0);
				marcaRef.current.removeAttribute("data-brand-id");
			}
			setTimeout(() => {
				setShowMarcaSuggestions(true);
				marcaRef.current?.focus();
			}, 10);
		}
	};

	const handleSelectMarca = (marca, autoSelected = false) => {
		setMarcaInput(marca.name);
		setSelectedMarca(marca);
		setShowMarcaSuggestions(false);
		setMarcaHighlightIndex(-1);
		onSelectMarca?.(marca);

		if (marcaRef.current) {
			marcaRef.current.setAttribute("data-usage", marca.usage || 0);
			if (marca.id && !marca.custom) marcaRef.current.setAttribute("data-brand-id", marca.id);
			else marcaRef.current.removeAttribute("data-brand-id");
		}

		if (!autoSelected) {
			setTimeout(() => {
				const next = document.querySelector(`[data-modelo-index="${index + 1}"]`);
				next?.focus();
			}, 10);
		}
	};

	const handleModeloChange = (e) => {
		const value = e.target.value;
		setModeloInput(value);
		setShowModeloSuggestions(value.trim() !== "");
		setMarcaInput("");
		setSelectedMarca(null);
		setModeloHighlightIndex(-1);
		modeloRef.current?.setAttribute("data-usage", 0);

		if (value.trim() === "") setSelectedModelo(null);
		else {
			const customModelo = { id: null, name: value.trim(), custom: true, usage: 0 };
			setSelectedModelo(customModelo);
			onSelectModelo?.(customModelo);
		}
	};

	const handleMarcaChange = (e) => {
		const value = e.target.value;
		setMarcaInput(value);
		setShowMarcaSuggestions(value.trim() !== "" || (!!selectedModelo && value.trim() === ""));
		setSelectedMarca(null);
		setMarcaHighlightIndex(-1);
		marcaRef.current?.setAttribute("data-usage", 0);

		if (value.trim()) {
			const match = marcas.find((m) => m.name.toLowerCase() === value.toLowerCase());
			if (!match) onSelectMarca?.({ id: null, name: value.trim(), custom: true, usage: 0 });
		}
	};

	const handleModeloKeyDown = (e) => {
		if (getModeloSuggestions.length === 0) return;
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			setModeloHighlightIndex((prev) => (e.key === "ArrowDown" ? (prev + 1) % getModeloSuggestions.length : (prev - 1 + getModeloSuggestions.length) % getModeloSuggestions.length));
		} else if (e.key === "Enter" || e.key === "Tab") {
			e.preventDefault();
			const selected = getModeloSuggestions[modeloHighlightIndex] || getModeloSuggestions.find((m) => m.name.toLowerCase().startsWith(modeloInputLower));
			handleSelectModelo(selected || { id: null, name: modeloInput.trim(), custom: true, usage: 0 });
		}
	};

	const handleMarcaKeyDown = (e) => {
		if (getMarcaSuggestions.length === 0) return;
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			setMarcaHighlightIndex((prev) => (e.key === "ArrowDown" ? (prev + 1) % getMarcaSuggestions.length : (prev - 1 + getMarcaSuggestions.length) % getMarcaSuggestions.length));
		} else if (e.key === "Enter" || e.key === "Tab") {
			e.preventDefault();
			const selected = getMarcaSuggestions[marcaHighlightIndex] || getMarcaSuggestions.find((m) => m.name.toLowerCase().startsWith(marcaInputLower));
			handleSelectMarca(selected || { id: null, name: marcaInput.trim(), custom: true, usage: 0 });
		}
	};

    const handleModeloFocus = (e) => {
        requestAnimationFrame(() => e.target.scrollIntoView({ block: "center" }));
        if (modeloInput.trim() !== '') {
            setShowModeloSuggestions(true);
        }
    }

    const handleMarcaFocus = (e) => {
        requestAnimationFrame(() => e.target.scrollIntoView({ block: "center" }));
        if (marcaInput.trim() !== '' || (selectedModelo && modeloInput.trim() !== '')) {
            setShowMarcaSuggestions(true);
        }
    }

    const handleBlur = (setter) => {
        setTimeout(() => setter(false), 200); // 200ms delay to allow click on suggestion
    }


	return (
		<div className="flex gap-6 w-full">
			{/* Modelo */}
			<div className="relative">
				<label className="text-sm font-medium text-gray-600">Modelo</label>
				<input ref={modeloRef} data-modelo-index={index} value={modeloInput} onChange={handleModeloChange} onKeyDown={handleModeloKeyDown} onFocus={handleModeloFocus} onBlur={() => handleBlur(setShowModeloSuggestions)} placeholder="Digite o modelo" className={`w-full border border-black/20 p-1 px-2 rounded-md text-lg font-semibold bg-slate-100 placeholder:font-normal uppercase placeholder:normal-case ${isModeloCustom ? "italic text-gray-600" : ""}`} />
				{showModeloSuggestions && getModeloSuggestions.length > 0 && (
					<ul className="absolute bg-white border border-black/20 rounded-md max-h-40 overflow-auto w-full mt-1 text-sm z-10">
						{getModeloSuggestions.map((m, i) => (
							<React.Fragment key={m.id}>
								{m.custom && <li className="border-t border-gray-300 my-1" />}
								<li className={`px-2 py-1 cursor-pointer hover:bg-gray-700 hover:text-white ${i === modeloHighlightIndex ? "bg-gray-200" : ""}`} onMouseDown={() => handleSelectModelo(m)}>
									{m.custom ? (
										<span className="italic uppercase">
											{m.name} <span className="text-[.7rem] font-bold lowercase opacity-70">(novo)</span>
										</span>
									) : (
										m.name
									)}
								</li>
							</React.Fragment>
						))}
					</ul>
				)}
			</div>

			{/* Marca */}
			<div className="relative">
				<label className="text-sm font-medium text-gray-600">Marca</label>
				<input ref={marcaRef} data-marca-index={index} value={marcaInput} onChange={handleMarcaChange} onKeyDown={handleMarcaKeyDown} onFocus={handleMarcaFocus} onBlur={() => handleBlur(setShowMarcaSuggestions)} placeholder="Digite a marca" disabled={!selectedModelo || modeloInput.trim() === ""} className={`w-full border border-black/20 p-1 px-2 rounded-md text-lg font-semibold bg-slate-100 placeholder:font-normal uppercase placeholder:normal-case disabled:bg-slate-600/25 ${!selectedModelo || modeloInput.trim() === "" ? "bg-gray-100 cursor-not-allowed" : ""} ${isMarcaCustom ? "italic text-gray-600" : ""}`} />
				{showMarcaSuggestions && getMarcaSuggestions.length > 0 && (
					<ul className="absolute bg-white border border-black/20 rounded-md max-h-40 overflow-auto w-full mt-1 text-sm z-10">
						{getMarcaSuggestions.map((m, i) => (
							<React.Fragment key={m.id}>
								{m.custom && <li className="border-t border-gray-300 my-1" />}
								<li className={`px-2 py-1 cursor-pointer hover:bg-gray-700 hover:text-white ${i === marcaHighlightIndex ? "bg-gray-200" : ""}`} onMouseDown={() => handleSelectMarca(m)}>
									{m.custom ? (
										<span className="italic uppercase">
											{m.name} <span className="text-[.7rem] font-bold lowercase opacity-70">(novo)</span>
										</span>
									) : (
										m.name
									)}
								</li>
							</React.Fragment>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}