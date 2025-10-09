// Precificador.jsx
import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import LinePricer from "./LinePricer";
import { getDatabase, ref, update, get, push, onValue, remove } from "firebase/database";
import { app } from "../firebase-config";
import SingleCalculator from "./SingleCalculator";
import ImportQuantity from "./ImportQuantity";
import Button from "../Editais/Button";
import { FaEdit, FaTrash } from "react-icons/fa";

export default function Precificador() {
	const [lineData, setLineData] = useState([]);
	const [fileName, setFileName] = useState("");
	const [rawMargin, setRawMargin] = useState("");
	const [checkedGlobalLotes, setCheckedGlobalLotes] = useState({});
	const [historic, setHistoric] = useState([]);
	const [loadingHistoric, setLoadingHistoric] = useState(true);
	const [activeSessionId, setActiveSessionId] = useState(null);
	const [readyToSync, setReadyToSync] = useState(false);
	const [lastFocusedIndex, setLastFocusedIndex] = useState(null);
	const db = getDatabase(app);

	const costInputRefs = useRef({});
	const fileInputRef = useRef(null);
	const firstModeloInputRef = useRef(null);

	// --------------------------------
	// Helpers
	// --------------------------------
	const formatMargin = (value) => {
		const digits = value.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
		let integer = digits.slice(0, 2);
		let decimal = digits.slice(2, 4);
		if (parseInt(integer) < 10) integer = parseInt(integer).toString();
		return `${integer},${decimal}`;
	};
	const getFormattedMargin = () => formatMargin(rawMargin);

	// --------------------------------
	// Histórico + skeleton loader
	// --------------------------------
	useEffect(() => {
		const histRef = ref(db, "/precificar/historic");
		const unsub = onValue(histRef, (snap) => {
			const data = snap.val() || {};
			const arr = Object.entries(data)
				.map(([id, v]) => ({ id, ...(v || {}) }))
				.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
			setHistoric(arr);
			setLoadingHistoric(false);
		});
		return () => unsub();
	}, [db]);

	// --------------------------------
	// Monitorar troca de linha (div) e salvar
	// --------------------------------
	useEffect(() => {
		if (!activeSessionId || !readyToSync) return;

		const handleFocusChange = (e) => {
			const el = e.target.closest("[data-index]");
			if (!el) return;
			const newIndex = parseInt(el.getAttribute("data-index"));
			if (newIndex !== lastFocusedIndex && lastFocusedIndex !== null) {
				saveToDatabase(); // salva ao mudar de linha
			}
			setLastFocusedIndex(newIndex);
		};

		document.addEventListener("focusin", handleFocusChange);
		return () => document.removeEventListener("focusin", handleFocusChange);
	}, [activeSessionId, readyToSync, lastFocusedIndex, lineData, rawMargin, checkedGlobalLotes, fileName]);

	// --------------------------------
	// Função de salvamento central
	// --------------------------------
	const saveToDatabase = async () => {
		if (!activeSessionId || !readyToSync) return;
		const payload = {
			fileName,
			rawMargin,
			checkedGlobalLotes,
			lineData,
			timestamp: Date.now(),
		};
		await update(ref(db, `/precificar/historic/${activeSessionId}`), payload);
		console.log("💾 Salvamento disparado (mudança de linha):", payload);
	};

	// --------------------------------
	// Carregar novo arquivo .xlsx
	// --------------------------------
	const handleFile = async (event) => {
		const file = event.target.files[0];
		if (!file) return;
		const name = file.name || "Arquivo";
		setFileName(name);

		const data = await file.arrayBuffer();
		const workbook = XLSX.read(data);
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
		const rows = json.slice(1);

		const parsedRows = rows.map(([lote, item, refValue, qtde], index) => ({
			index,
			lote,
			item,
			refValue: typeof refValue === "string" ? parseFloat(refValue.replace(",", ".")) : Number(refValue),
			qtde: qtde || 1,
			marca: null,
			modelo: null,
			valorCalculado: 0,
			switchChecked: false,
			custoBase: 0,
		}));

		const lotesCount = {};
		parsedRows.forEach((r) => (lotesCount[r.lote] = (lotesCount[r.lote] || 0) + 1));
		const newGlobals = {};
		Object.entries(lotesCount).forEach(([lote, count]) => {
			if (count > 1) newGlobals[lote] = true;
		});

		const updatedRows = parsedRows.map((line) => ({
			...line,
			switchChecked: !!newGlobals[line.lote],
		}));

		const newRef = push(ref(db, "/precificar/historic"));
		await update(newRef, {
			fileName: name,
			rawMargin,
			checkedGlobalLotes: newGlobals,
			lineData: updatedRows,
			timestamp: Date.now(),
		});

		setActiveSessionId(newRef.key);
		setCheckedGlobalLotes(newGlobals);
		setLineData(updatedRows);
		setReadyToSync(true);
	};

	// --------------------------------
	// Editar sessão existente (com trava)
	// --------------------------------
	const handleLoadHistoric = async (entry) => {
		try {
			setReadyToSync(false);
			const snap = await get(ref(db, `/precificar/historic/${entry.id}`));
			if (!snap.exists()) return alert("Registro não encontrado.");

			const data = snap.val();
			setActiveSessionId(entry.id);
			setFileName(data.fileName || "Sessão carregada");
			setRawMargin(data.rawMargin || "");
			setCheckedGlobalLotes(data.checkedGlobalLotes || {});
			setLineData(Array.isArray(data.lineData) ? data.lineData : []);

			console.log("📂 Sessão carregada:", data);
			setTimeout(() => setReadyToSync(true), 700); // libera autosave depois
		} catch (err) {
			console.error("Erro ao carregar histórico:", err);
			alert("Falha ao carregar dados.");
			setReadyToSync(true);
		}
	};

	// --------------------------------
	// Deletar sessão
	// --------------------------------
	const handleDeleteHistoric = async (id) => {
		if (!window.confirm("Remover este registro do histórico?")) return;
		await remove(ref(db, `/precificar/historic/${id}`));
		if (id === activeSessionId) {
			setActiveSessionId(null);
			setLineData([]);
		}
	};

	// --------------------------------
	// Handlers gerais
	// --------------------------------
	const handleReset = () => window.location.reload();
	const handleMarginChange = (e) => {
		const onlyDigits = e.target.value.replace(/\D/g, "");
		setRawMargin(onlyDigits);
	};
	const handleMarginKey = (e) => {
		if (e.key === "Enter" || e.key === "Tab") {
			e.preventDefault();
			costInputRefs.current[0]?.focus();
		}
	};
	const toggleGlobalLote = (lote) => {
		setCheckedGlobalLotes((prev) => {
			const newState = !prev[lote];
			return { ...prev, [lote]: newState };
		});
	};
	const handleCostKeyDown = (e, index) => {
		if (e.key === "Enter") {
			e.preventDefault();
			const targetIndex = e.shiftKey ? index - 1 : index + 1;
			costInputRefs.current[targetIndex]?.focus();
		}
	};
	const handleLineChange = (index, updatedFields) => {
		setLineData((prev) => {
			const copy = [...prev];
			copy[index] = { ...copy[index], ...updatedFields };
			return copy;
		});
	};

	// --------------------------------
	// Render
	// --------------------------------
	return (
		<div className="p-4">
			{/* Tela inicial */}
			{lineData.length === 0 && (
				<div className="flex flex-col min-h-[calc(100vh-120px)] justify-center items-center p-5 gap-4">
					<SingleCalculator rawMargin={rawMargin} setRawMargin={setRawMargin} />

					<div className="flex items-center">
						<label className="inline-block p-3 text-center bg-slate-500 text-white rounded-lg text-xs uppercase cursor-pointer hover:bg-slate-700 transition duration-200 select-none">
							Escolher arquivo
							<input type="file" accept=".xlsx" onChange={handleFile} ref={fileInputRef} className="hidden" />
						</label>
						<p className="text-sm text-gray-600 ml-4 max-w-[200px] truncate overflow-hidden whitespace-nowrap select-none">{fileName || "Nenhum arquivo selecionado"}</p>
					</div>

					{/* Histórico */}
					<div className="shadow-md p-4 bg-slate-100 rounded-lg w-full space-y-2">
						<h2 className="uppercase text-xs font-bold text-slate-700 border-b-2">Últimos carregamentos</h2>

						{loadingHistoric ? (
							<div className="w-full h-3 bg-slate-400 animate-pulse rounded-full"></div>
						) : (
							<div className="flex flex-col gap-2">
								{historic.length === 0 && <p className="text-xs text-slate-500">Nenhum registro encontrado.</p>}
								{historic.map((h) => (
									<div key={h.id} className="flex items-center justify-between w-full text-sm border-b border-slate-200 pb-1">
										<span className="flex-1">{h.fileName || "Sem nome"}</span>
										<span className="flex-1 text-center">{h.timestamp ? new Date(h.timestamp).toLocaleString("pt-BR") : "-"}</span>
										<div className="flex gap-3 justify-end flex-1">
											<FaEdit className="cursor-pointer" onClick={() => handleLoadHistoric(h)} />
											<FaTrash className="cursor-pointer" onClick={() => handleDeleteHistoric(h.id)} />
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Tela principal */}
			{lineData.length > 0 && (
				<>
					<div className="grid grid-cols-3 gap-1 shadow-md p-4 bg-slate-100 rounded-lg">
						<div>
							<h2 className="text-sm font-bold uppercase text-slate-800 select-none">› Margem</h2>
							<div className="flex mt-2">
								<input type="text" className="w-full border border-e-0 border-slate-400 p-1 px-2 text-xl rounded-l-lg focus:outline-none focus:border-slate-600 font-bold text-right" value={getFormattedMargin()} onChange={handleMarginChange} onKeyDown={handleMarginKey} maxLength={5} placeholder="00,00" />
								<div className="border border-slate-600 bg-slate-500 rounded-r-lg text-white p-2 font-bold select-none">%</div>
							</div>
						</div>

						<div>
							<h2 className="text-sm font-bold uppercase text-slate-800 select-none">› Exportar</h2>
							<div className="flex gap-1 mt-2">
								<Button label="Proposta + Disputa" onClick={() => console.log("Exportar")} />
							</div>
						</div>

						<div>
							<h2 className="text-sm font-bold uppercase text-slate-800 select-none">› Opções</h2>
							<div className="flex gap-1 mt-2">
								<Button label="Limpar" onClick={handleReset} />
								<ImportQuantity lines={lineData} onImport={(updatedLines) => setLineData(updatedLines)} />
							</div>
						</div>
					</div>

					<div className="mt-6 rounded-lg">
						{lineData.map((line, index) => (
							<LinePricer key={line.index} data-index={index} {...line} inputRef={index === 0 ? firstModeloInputRef : null} margin={getFormattedMargin()} globalChecked={!!checkedGlobalLotes[line.lote]} onToggleGlobal={() => toggleGlobalLote(line.lote)} costInputRef={(el) => (costInputRefs.current[index] = el)} onCostKeyDown={(e) => handleCostKeyDown(e, index)} onChange={(updatedFields) => handleLineChange(index, updatedFields)} />
						))}
					</div>
				</>
			)}
		</div>
	);
}
