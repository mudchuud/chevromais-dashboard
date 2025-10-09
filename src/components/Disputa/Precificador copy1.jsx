// Precificador.jsx
import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import LinePricer from "./LinePricer";
import { getDatabase, ref, update, get } from "firebase/database";
import { app } from "../firebase-config";
import SingleCalculator from "./SingleCalculator";
import ImportQuantity from "./ImportQuantity";
import Button from "../Editais/Button";

export default function Precificador() {
	const [lines, setLines] = useState([]);
	const [fileName, setFileName] = useState("");
	const [rawMargin, setRawMargin] = useState("");
	const [checkedGlobalLotes, setCheckedGlobalLotes] = useState({});
	const costInputRefs = useRef({});
	const [marcasModelos, setMarcasModelos] = useState({});
	const [valoresCalculados, setValoresCalculados] = useState({});
	const [checkedSwitches, setCheckedSwitches] = useState({});
	const fileInputRef = useRef(null);
	const firstModeloInputRef = useRef(null);

	// -----------------------------
	// Helpers
	// -----------------------------
	const parseNumber = (str) => {
		if (str === null || typeof str === "undefined") return 0;
		const cleaned = String(str).replace(/\./g, "").replace(",", ".");
		const parsed = parseFloat(cleaned);
		return isNaN(parsed) ? 0 : parsed;
	};

	const formatMargin = (value) => {
		const digits = value.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
		let integer = digits.slice(0, 2);
		let decimal = digits.slice(2, 4);
		if (parseInt(integer) < 10) integer = parseInt(integer).toString();
		return `${integer},${decimal}`;
	};

	const getFormattedMargin = () => formatMargin(rawMargin);

	// -----------------------------
	// Handlers
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
			index: index + 1,
			lote,
			item,
			ref: typeof ref === "string" ? parseFloat(ref.replace(",", ".")) : Number(ref),
			qtde,
		}));
		setLines(parsedRows);
	};

	const handleMarginChange = (e) => {
		const onlyDigits = e.target.value.replace(/\D/g, "");
		setRawMargin(onlyDigits);
	};

	const handleReset = () => window.location.reload();

	// -----------------------------
	// Global Switch por lote
	// -----------------------------
	const toggleGlobalLote = (lote) => {
		setCheckedGlobalLotes((prev) => {
			const isChecked = !prev[lote]; // alterna
			return { ...prev, [lote]: isChecked };
		});
	};

	const handleCostKeyDown = (e, index) => {
		if (e.key === "Enter") {
			e.preventDefault();
			const targetIndex = e.shiftKey ? index - 1 : index + 1;
			costInputRefs.current[targetIndex]?.focus();
		}
	};

	const handleMarcaModeloChange = (index, marca, modelo) => {
		setMarcasModelos((prev) => ({ ...prev, [index]: { marca, modelo } }));
	};

	const handleUpdateValorCalculado = (index, valor) => {
		setValoresCalculados((prev) => ({ ...prev, [index]: valor }));
	};

	const handleToggleSwitch = (index, checked) => {
		setCheckedSwitches((prev) => ({ ...prev, [index]: checked }));
	};

	// -----------------------------
	// Exportação PROPOSTA
	// -----------------------------
	const handleExportProposta = () => {
		const data = [["Lote", "Item", "", "Marca", "Modelo", "", "Valor"]];
		const lotesCount = {};
		const lotesRefSum = {};
		const lotesExportSum = {};

		lines.forEach((line, index) => {
			const lote = line.lote;
			lotesCount[lote] = (lotesCount[lote] || 0) + 1;

			const inputHiddenExport = document.querySelector(`[data-index="${index}"] input[name="export-value"][type="hidden"]`);
			const inputHiddenRef = document.querySelector(`[data-index="${index}"] input[name="ref-value"][type="hidden"]`);

			const exportVal = parseNumber(inputHiddenExport?.value);
			const refVal = parseNumber(inputHiddenRef?.value);

			lotesExportSum[lote] = (lotesExportSum[lote] || 0) + exportVal;
			lotesRefSum[lote] = (lotesRefSum[lote] || 0) + refVal;
		});

		lines.forEach((line, index) => {
			const lote = line.lote;
			const item = line.item;

			const inputMarca = document.querySelector(`input[data-marca-index="${index}"]`);
			const inputModelo = document.querySelector(`input[data-modelo-index="${index}"]`);
			const inputValor = document.querySelector(`[data-index="${index}"] input[name="export-value"]`);
			const inputRef = document.querySelector(`[data-index="${index}"] input[name="ref-value"]`);
			const inputRawRef = document.querySelector(`[data-index="${index}"] input[name="ref-raw"]`);
			const inputExportCalc = document.querySelector(`[data-index="${index}"] input[name="export-calculated"]`);

			const marca = inputMarca?.value || "";
			const modelo = inputModelo?.value || "";
			const valorNum = parseNumber(inputValor?.value);
			const refNum = parseNumber(inputRef?.value);
			const rawRefNum = parseNumber(inputRawRef?.value);
			const exportCalcNum = parseNumber(inputExportCalc?.value);
			if (!marca || !modelo || valorNum === 0) return;

			const isSingleItem = lotesCount[lote] === 1;
			const exportSum = lotesExportSum[lote] || 0;
			const refSum = lotesRefSum[lote] || 0;

			const refNumWithTolerance = refNum * 1.1;
			const refSumWithTolerance = refSum * 1.1;

			let valor = 0;

			if (isNaN(refNum) || refNum === 0) {
				valor = exportCalcNum * 3;
			} else {
				if (isSingleItem && valorNum > refNumWithTolerance) return;
				if (!isSingleItem && exportSum > refSumWithTolerance) return;
				valor = valorNum < refNum ? rawRefNum : exportCalcNum;
			}

			data.push([lote, item, "", marca, modelo, "", valor]);
		});

		const ws = XLSX.utils.aoa_to_sheet(data);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Proposta");
		XLSX.writeFile(wb, `${fileName.replace(/\.xlsx$/, "")}-proposta.xlsx`);
	};

	// -----------------------------
	// Exportação DISPUTA
	// -----------------------------
	const handleExportDisputa = () => {
		const lotesExportSum = {};
		const lotesRefSum = {};
		const lotesCount = {};

		lines.forEach((line, index) => {
			const lote = line.lote;
			const inputExport = document.querySelector(`[data-index="${index}"] input[name="export-value"][type="hidden"]`);
			const inputRef = document.querySelector(`[data-index="${index}"] input[name="ref-value"][type="hidden"]`);

			const marca = document.querySelector(`input[data-marca-index="${index}"]`)?.value;
			const modelo = document.querySelector(`input[data-modelo-index="${index}"]`)?.value;
			const exportVal = parseNumber(inputExport?.value);
			const refVal = parseNumber(inputRef?.value);

			// Só contabiliza se marca, modelo e exportVal existirem
			if (!marca || !modelo || exportVal === 0) return;

			lotesExportSum[lote] = (lotesExportSum[lote] || 0) + exportVal;
			lotesRefSum[lote] = (lotesRefSum[lote] || 0) + refVal;
			lotesCount[lote] = (lotesCount[lote] || 0) + 1;
		});

		const data = [["Lote", "", "Unitário", "", "", "", "Total"]];

		Object.keys(lotesExportSum).forEach((lote) => {
			const isSingleItem = lotesCount[lote] === 1;
			const exportSum = lotesExportSum[lote];
			const refSum = lotesRefSum[lote];
			const refSumWithTolerance = refSum * 1.1;

			if (!isSingleItem && exportSum > refSumWithTolerance) return;
			if (isSingleItem && exportSum > refSumWithTolerance) return;

			data.push([lote, "", exportSum, "", "", "", exportSum]);
		});

		const ws = XLSX.utils.aoa_to_sheet(data);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Disputa");
		XLSX.writeFile(wb, `${fileName.replace(/\.xlsx$/, "")}-disputa.xlsx`);
	};

	const handleExportAmbos = async () => {
		handleExportProposta();
		handleExportDisputa();

		const db = getDatabase(app);
		const snapshot = await get(ref(db));
		if (!snapshot.exists()) return;

		const brandsData = snapshot.val().brands || {};
		const modelsData = snapshot.val().models || {};

		const marcaInputs = document.querySelectorAll("input[data-marca-index]");
		const modeloInputs = document.querySelectorAll("input[data-modelo-index]");

		const processInput = (input, type, data) => {
			const value = input.value;
			if (!value) return;
			const found = Object.entries(data).find(([, obj]) => obj.name === value);
			if (!found) return;
			const [id, obj] = found;
			const newUsage = (obj.usage || 0) + 1;
			input.dataset.usage = newUsage;
			update(ref(db, `${type}/${id}`), { usage: newUsage });
		};

		[...marcaInputs].forEach((input) => processInput(input, "brands", brandsData));
		[...modeloInputs].forEach((input) => processInput(input, "models", modelsData));
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
					<a href="../disputa/ajustar-ordem" className="inline-block p-3 text-center bg-slate-500 text-white rounded-lg text-xs uppercase cursor-pointer hover:bg-slate-700 transition duration-200 select-none">
						Ajustar ordenação
					</a>
					<p className="block text-xs text-slate-500 select-none uppercase">
						<a href="/modelo_precificar.xlsx" className="hover:underline">
							Baixar template .xlsx
						</a>
					</p>
				</div>
			)}

			{lines.length > 0 && (
				<div className="grid grid-cols-3 gap-1 shadow-md p-4 bg-slate-100 rounded-lg">
					<div>
						<h2 className="text-sm font-bold uppercase text-slate-800 select-none">› Margem</h2>
						<div className="flex mt-2">
							<input type="text" name="margin" id="margin" className="w-full border border-e-0 border-slate-400 p-1 px-2 text-xl rounded-l-lg focus:outline-none focus:border-slate-600 font-bold text-right" value={getFormattedMargin()} onChange={handleMarginChange} maxLength={5} placeholder="00,00" />
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
							<ImportQuantity lines={lines} onImport={(updatedLines) => setLines(updatedLines)} />
						</div>
					</div>
				</div>
			)}

			{lines.length > 0 && (
				<div className="mt-6 rounded-lg">
					{lines.map((line, index) => (
						<LinePricer key={line.index} index={index} lote={line.lote} item={line.item} refValue={line.ref} qtde={line.qtde} inputRef={index === 0 ? firstModeloInputRef : null} margin={getFormattedMargin()} globalChecked={!!checkedGlobalLotes[line.lote]} onToggleGlobal={() => toggleGlobalLote(line.lote)} costInputRef={(el) => (costInputRefs.current[index] = el)} onCostKeyDown={(e) => handleCostKeyDown(e, index)} onSelectMarca={(marca) => handleMarcaModeloChange(index, marca, marcasModelos[index]?.modelo || "")} onSelectModelo={(modelo) => handleMarcaModeloChange(index, marcasModelos[index]?.marca || "", modelo)} onValorCalculadoChange={(valor) => handleUpdateValorCalculado(index, valor)} onSwitchToggle={(checked) => handleToggleSwitch(index, checked)} />
					))}
				</div>
			)}
		</div>
	);
}
