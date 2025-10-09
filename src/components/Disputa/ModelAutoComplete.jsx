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

	const modelosFiltradosPorMarca = useMemo(() => {
		if (!selectedMarca) return [];
		return modelos.filter((m) => String(m.brandID) === String(selectedMarca.id));
	}, [modelos, selectedMarca]);

	const marcaInputLower = marcaInput.toLowerCase();
	const modeloInputLower = modeloInput.toLowerCase();

	const getMarcaSuggestions = useMemo(() => {
		const filtered = marcas.filter((m) => m.name.toLowerCase().startsWith(marcaInputLower)).sort((a, b) => b.usage - a.usage || a.name.localeCompare(b.name));

		if (marcaInput.trim() !== "" && !marcas.some((m) => m.name.toLowerCase() === marcaInputLower)) {
			filtered.push({
				id: "__custom_marca__",
				name: marcaInput.trim(),
				custom: true,
				usage: -1,
			});
		}
		return filtered;
	}, [marcaInputLower, marcas]);

	const getModeloSuggestions = useMemo(() => {
		const filtered = modelosFiltradosPorMarca.filter((m) => m.name.toLowerCase().startsWith(modeloInputLower)).sort((a, b) => b.usage - a.usage || a.name.localeCompare(b.name));

		if (modeloInput.trim() !== "" && !modelosFiltradosPorMarca.some((m) => m.name.toLowerCase() === modeloInputLower)) {
			filtered.push({
				id: "__custom_modelo__",
				name: modeloInput.trim(),
				custom: true,
				usage: -1,
			});
		}
		return filtered;
	}, [modeloInputLower, modelosFiltradosPorMarca]);

	const isMarcaCustom = marcaInput.trim() !== "" && !marcas.some((m) => m.name.toLowerCase() === marcaInputLower);
	const isModeloCustom = modeloInput.trim() !== "" && !modelosFiltradosPorMarca.some((m) => m.name.toLowerCase() === modeloInputLower);

	const handleSelectMarca = (marca) => {
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

		const modelosDaMarca = modelos.filter((m) => String(m.brandID) === String(marca.id));
		if (modelosDaMarca.length === 1) handleSelectModelo(modelosDaMarca[0]);
		else {
			setModeloInput("");
			setSelectedModelo(null);
			if (modeloRef.current) {
				modeloRef.current.setAttribute("data-usage", 0);
				modeloRef.current.removeAttribute("data-model-id");
			}
			setTimeout(() => {
				setShowModeloSuggestions(true);
				modeloRef.current?.focus();
			}, 10);
		}
	};

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

		setTimeout(() => {
			const next = document.querySelector(`[data-marca-index="${index + 1}"]`);
			next?.focus();
		}, 10);
	};

	const handleMarcaChange = (e) => {
		const value = e.target.value;
		setMarcaInput(value);
		setShowMarcaSuggestions(value.trim() !== "");
		setModeloInput("");
		setSelectedModelo(null);
		setMarcaHighlightIndex(-1);
		marcaRef.current?.setAttribute("data-usage", 0);

		if (value.trim() === "") setSelectedMarca(null);
		else {
			const customMarca = { id: null, name: value.trim(), custom: true, usage: 0 };
			setSelectedMarca(customMarca);
			onSelectMarca?.(customMarca);
		}
	};

	const handleModeloChange = (e) => {
		const value = e.target.value;
		setModeloInput(value);
		setShowModeloSuggestions(value.trim() !== "" || (!!selectedMarca && value.trim() === ""));
		setSelectedModelo(null);
		setModeloHighlightIndex(-1);
		modeloRef.current?.setAttribute("data-usage", 0);

		if (value.trim()) {
			const match = modelosFiltradosPorMarca.find((m) => m.name.toLowerCase() === value.toLowerCase());
			if (!match) onSelectModelo?.({ id: null, name: value.trim(), custom: true, usage: 0 });
		}
	};

	const handleMarcaKeyDown = (e) => {
		if (getMarcaSuggestions.length === 0) return;
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			setMarcaHighlightIndex((prev) => (e.key === "ArrowDown" ? (prev + 1) % getMarcaSuggestions.length : (prev - 1 + getMarcaSuggestions.length) % getMarcaSuggestions.length));
		} else if (e.key === "Enter") {
			e.preventDefault();
			const selected = getMarcaSuggestions[marcaHighlightIndex] || getMarcaSuggestions.find((m) => m.name.toLowerCase().startsWith(marcaInputLower));
			handleSelectMarca(selected || { id: null, name: marcaInput.trim(), custom: true, usage: 0 });
		}
	};

	const handleModeloKeyDown = (e) => {
		if (getModeloSuggestions.length === 0) return;
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			setModeloHighlightIndex((prev) => (e.key === "ArrowDown" ? (prev + 1) % getModeloSuggestions.length : (prev - 1 + getModeloSuggestions.length) % getModeloSuggestions.length));
		} else if (e.key === "Enter") {
			e.preventDefault();
			const selected = getModeloSuggestions[modeloHighlightIndex] || getModeloSuggestions.find((m) => m.name.toLowerCase().startsWith(modeloInputLower));
			handleSelectModelo(selected || { id: null, name: modeloInput.trim(), custom: true, usage: 0 });
		}
	};

	return (
		<div className="flex gap-6 w-full">
			{/* Marca */}
			<div className="relative">
				<label className="text-sm font-medium text-gray-600">Marca</label>
				<input ref={marcaRef} data-marca-index={index} value={marcaInput} onChange={handleMarcaChange} onKeyDown={handleMarcaKeyDown} onFocus={(e) => requestAnimationFrame(() => e.target.scrollIntoView({ block: "center" }))} placeholder="Digite a marca" className={`w-full border border-black/20 p-1 px-2 rounded-md text-lg font-semibold bg-slate-100 placeholder:font-normal uppercase placeholder:normal-case ${isMarcaCustom ? "italic text-gray-600" : ""}`} />
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

			{/* Modelo */}
			<div className="relative">
				<label className="text-sm font-medium text-gray-600">Modelo</label>
				<input ref={modeloRef} data-modelo-index={index} value={modeloInput} onChange={handleModeloChange} onKeyDown={handleModeloKeyDown} onFocus={(e) => requestAnimationFrame(() => e.target.scrollIntoView({ block: "center" }))} placeholder="Digite o modelo" disabled={!selectedMarca || marcaInput.trim() === ""} className={`w-full border border-black/20 p-1 px-2 rounded-md text-lg font-semibold bg-slate-100 placeholder:font-normal uppercase placeholder:normal-case disabled:bg-slate-600/25 ${!selectedMarca || marcaInput.trim() === "" ? "bg-gray-100 cursor-not-allowed" : ""} ${isModeloCustom ? "italic text-gray-600" : ""}`} />
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
		</div>
	);
}
