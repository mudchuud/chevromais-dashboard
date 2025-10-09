// Precificador.jsx
import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import LinePricer from "./LinePricer";
import { getDatabase, ref, update, get } from "firebase/database";
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
	const costInputRefs = useRef({});
	const fileInputRef = useRef(null);
	const firstModeloInputRef = useRef(null);

	// -----------------------------
	// Helpers
	// -----------------------------
	const formatMargin = (value) => {
		const digits = value.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
		let integer = digits.slice(0, 2);
		let decimal = digits.slice(2, 4);
		if (parseInt(integer) < 10) integer = parseInt(integer).toString();
		return `${integer},${decimal}`;
	};

	const getFormattedMargin = () => formatMargin(rawMargin);

	// -----------------------------
	// File Handler
	// -----------------------------
	const handleFile = async (event) => {
		const file = event.target.files[0];
		if (!file) return;
		setFileName(file.name);

		const data = await file.arrayBuffer();
		const workbook = XLSX.read(data);
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
		const rows = json.slice(1);

		const parsedRows = rows.map(([lote, item, ref, qtde], index) => ({
			index,
			lote,
			item,
			refValue: typeof ref === "string" ? parseFloat(ref.replace(",", ".")) : Number(ref),
			qtde: qtde || 1,
			marca: null,
			modelo: null,
			valorCalculado: 0,
			switchChecked: false,
			custoBase: 0,
		}));

		// Detecta lotes duplicados e ativa globalSwitch
		const lotesCount = {};
		parsedRows.forEach((r) => {
			lotesCount[r.lote] = (lotesCount[r.lote] || 0) + 1;
		});
		const newGlobals = {};
		Object.entries(lotesCount).forEach(([lote, count]) => {
			if (count > 1) newGlobals[lote] = true;
		});

		const updatedRows = parsedRows.map((line) => ({
			...line,
			switchChecked: !!newGlobals[line.lote],
		}));

		setCheckedGlobalLotes(newGlobals);
		setLineData(updatedRows);
	};

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

	const handleReset = () => window.location.reload();

	const toggleGlobalLote = (lote) => {
		setCheckedGlobalLotes((prev) => {
			const newState = !prev[lote];
			setLineData((prevLines) => prevLines.map((line) => (line.lote === lote ? { ...line, switchChecked: newState } : line)));
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

	// -----------------------------
	// LOG DE DIAGNÓSTICO
	// -----------------------------
	useEffect(() => {
		console.clear();
		console.log("📊 lineData atualizado:", JSON.parse(JSON.stringify(lineData)));
	}, [lineData]);

	// -----------------------------
	// Validação
	// -----------------------------
	const validateBeforeExport = () => {
		const errors = [];

		Object.entries(checkedGlobalLotes).forEach(([lote, active]) => {
			if (!active) return;
			const linhasLote = lineData.filter((l) => l.lote === Number(lote));
			const incompletas = linhasLote.filter((l) => !l.marca?.name || !l.modelo?.name || !l.custoBase || l.custoBase <= 0);
			if (incompletas.length > 0) {
				errors.push(`Lote ${lote} tem linhas incompletas.`);
			}
		});

		if (errors.length > 0) {
			alert(`Erros encontrados:\n${errors.join("\n")}`);
			return false;
		}
		return true;
	};

	// -----------------------------
	// Exportação PROPOSTA
	// -----------------------------
	const handleExportProposta = () => {
		const data = [["Lote", "Item", "", "Marca", "Modelo", "", "Valor"]];
		console.clear();
		console.log("🧾 Exportando PROPOSTA...");
		console.log("LineData atual:", lineData);

		const agg = {};
		lineData.forEach((line) => {
			const { lote, valorCalculado, refValue, qtde, marca, modelo } = line;
			if (!marca?.name || !modelo?.name) return;
			const v = parseFloat(valorCalculado) || 0;
			const r = parseFloat(refValue) || 0;
			const q = parseFloat(qtde) || 1;

			if (!agg[lote]) {
				agg[lote] = { count: 0, sumVal: 0, sumRef: 0, sumValQty: 0, sumRefQty: 0 };
			}
			agg[lote].count += 1;
			agg[lote].sumVal += v;
			agg[lote].sumRef += r;
			agg[lote].sumValQty += v * q;
			agg[lote].sumRefQty += r * q;
		});

		lineData.forEach((line) => {
			const { lote, item, marca, modelo, valorCalculado, refValue } = line;
			if (!marca?.name || !modelo?.name) return;
			const valorNum = parseFloat(valorCalculado) || 0;
			const refNum = parseFloat(refValue) || 0;
			if (valorNum === 0) return;

			const isSingle = (agg[lote]?.count || 0) === 1;
			const rawRefNum = refNum;
			const exportCalcNum = valorNum;
			let include = false;
			let outVal = 0;

			if (!refNum) {
				include = true;
				outVal = exportCalcNum * 3;
			} else {
				if (isSingle) {
					if (valorNum > refNum * 1.1) return;
				} else {
					if (agg[lote].sumVal > agg[lote].sumRef * 1.1) return;
				}
				include = true;
				outVal = valorNum < refNum ? rawRefNum : exportCalcNum;
			}

			if (include) data.push([lote, item, "", marca.name, modelo.name, "", outVal.toFixed(2).replace(".", ",")]);
		});

		if (data.length <= 1) {
			alert("Nenhum dado válido encontrado para exportar PROPOSTA.");
			return false;
		}

		const ws = XLSX.utils.aoa_to_sheet(data);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Proposta");
		XLSX.writeFile(wb, `${fileName.replace(/\.xlsx$/, "")}-proposta.xlsx`);
		return true;
	};

	// -----------------------------
	// Exportação DISPUTA
	// -----------------------------
	const handleExportDisputa = () => {
		console.clear();
		console.log("🧾 Exportando DISPUTA...");
		console.log("LineData atual:", lineData);

		const data = [["Lote", "", "Unitário", "", "", "", "Total"]];
		const agg = {};

		lineData.forEach((line) => {
			const { lote, marca, modelo, valorCalculado, refValue, qtde, switchChecked } = line;
			if (!marca?.name || !modelo?.name) return;
			const v = parseFloat(valorCalculado) || 0;
			const r = parseFloat(refValue) || 0;
			const q = parseFloat(qtde) || 1;
			if (v === 0) return;

			const mult = switchChecked ? q : 1;

			if (!agg[lote]) agg[lote] = { sumVal: 0, sumRef: 0 };
			agg[lote].sumVal += v * mult;
			agg[lote].sumRef += r * mult;
		});

		Object.entries(agg).forEach(([lote, { sumVal, sumRef }]) => {
			if (sumVal > sumRef * 1.1) return;
			const s = Number(sumVal.toFixed(2));
			data.push([lote, "", s, "", "", "", s]);
		});

		if (data.length <= 1) {
			alert("Nenhum dado válido encontrado para exportar DISPUTA.");
			return false;
		}

		const ws = XLSX.utils.aoa_to_sheet(data);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Disputa");
		XLSX.writeFile(wb, `${fileName.replace(/\.xlsx$/, "")}-disputa.xlsx`);
		return true;
	};

	// -----------------------------
	// Exportação AMBOS + Firebase
	// -----------------------------
	const handleExportAmbos = async () => {
		if (!validateBeforeExport()) return;

		const ok1 = handleExportProposta();
		const ok2 = handleExportDisputa();
		if (!ok1 || !ok2) return;

		const db = getDatabase(app);
		const snapshot = await get(ref(db));
		if (!snapshot.exists()) return;

		const brandsData = snapshot.val().brands || {};
		const modelsData = snapshot.val().models || {};

		lineData.forEach((line) => {
			const updateUsage = (type, data, value) => {
				if (!value) return;
				const found = Object.entries(data).find(([, obj]) => obj.name === value);
				if (!found) return;
				const [id, obj] = found;
				const newUsage = (obj.usage || 0) + 1;
				update(ref(db, `${type}/${id}`), { usage: newUsage });
			};

			updateUsage("brands", brandsData, line.marca?.name);
			updateUsage("models", modelsData, line.modelo?.name);
		});
	};

	// -----------------------------
	// Effects
	// -----------------------------
	useEffect(() => {
		const handleBeforeUnload = (e) => {
			e.preventDefault();
			e.returnValue = "";
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, []);

	useEffect(() => {
		const handleFocus = (e) => {
			if (e.target.tagName === "INPUT" && e.target.type === "text") e.target.select();
		};
		document.addEventListener("focusin", handleFocus);
		return () => document.removeEventListener("focusin", handleFocus);
	}, []);

	// -----------------------------
	// Render
	// -----------------------------
	return (
		<div className="p-4">
			{!fileName && (
				<div className="flex flex-col min-h-[calc(100vh-120px)] justify-center items-center p-5 gap-4">
					<SingleCalculator rawMargin={rawMargin} setRawMargin={setRawMargin} />
					<div className="flex items-center">
						<label className="inline-block p-3 text-center bg-slate-500 text-white rounded-lg text-xs uppercase cursor-pointer hover:bg-slate-700 transition duration-200 select-none">
							Escolher arquivo
							<input type="file" accept=".xlsx" onChange={handleFile} ref={fileInputRef} className="hidden" />
						</label>
						<p className="text-sm text-gray-600 ml-4 max-w-[200px] truncate overflow-hidden whitespace-nowrap select-none">{fileName || "Nenhum arquivo selecionado"}</p>
					</div>
					<div className="shadow-md p-4 bg-slate-100 rounded-lg w-100 space-y-2">
						<h2 className="uppercase text-xs font-bold text-slate-700 border-b-2">Últimos carregamentos</h2>
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between w-full text-sm">
								<span className="flex-1">12/2025</span>
								<span className="flex-1 text-center">08/10/2025 16:33</span>
								<div className="flex gap-3 justify-end flex-1">
									<FaEdit className="cursor-pointer" />
									<FaTrash className="cursor-pointer" />
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{lineData.length > 0 && (
				<>
					<div className="grid grid-cols-3 gap-1 shadow-md p-4 bg-slate-100 rounded-lg">
						<div>
							<h2 className="text-sm font-bold uppercase text-slate-800 select-none">› Margem</h2>
							<div className="flex mt-2">
								<input type="text" name="margin" id="margin" className="w-full border border-e-0 border-slate-400 p-1 px-2 text-xl rounded-l-lg focus:outline-none focus:border-slate-600 font-bold text-right" value={getFormattedMargin()} onChange={handleMarginChange} onKeyDown={handleMarginKey} maxLength={5} placeholder="00,00" />
								<div className="border border-slate-600 bg-slate-500 rounded-r-lg text-white p-2 font-bold select-none">%</div>
							</div>
						</div>

						<div>
							<h2 className="text-sm font-bold uppercase text-slate-800 select-none">› Exportar</h2>
							<div className="flex gap-1 mt-2">
								<Button label="Proposta + Disputa" onClick={handleExportAmbos} />
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
