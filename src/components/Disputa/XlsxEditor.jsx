import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Close";

export default function XlsxEditor() {
	const [rows, setRows] = useState([]);
	const [fileName, setFileName] = useState("");

	// Função de seleção de intervalo (1 linha ou intervalo)
	const selecionarIntervalo = () => {
		const input = prompt("Digite a linha a excluir ou intervalo (ex: 10 ou 10-25):");
		if (!input) return;

		let i, f;
		if (input.includes("-")) {
			const [start, end] = input.split("-").map((x) => parseInt(x.trim(), 10));
			if (isNaN(start) || isNaN(end)) return;
			i = start - 1;
			f = end - 1;
		} else {
			const single = parseInt(input.trim(), 10);
			if (isNaN(single)) return;
			i = f = single - 1;
		}

		setRows((prev) => prev.map((row, idx) => (idx >= i && idx <= f ? { ...row, excluir: true } : row)));
	};

	// Listener global do DELETE
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === "Delete") {
				e.preventDefault();
				selecionarIntervalo();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [rows]);

	// --- restante do seu código (upload, toggleExcluir, handleNovaOrdemChange, handleSave) ---
	const handleFileUpload = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		setFileName(file.name.replace(/\.xlsx$/, ""));

		const reader = new FileReader();
		reader.onload = (evt) => {
			const bstr = evt.target.result;
			const wb = XLSX.read(bstr, { type: "binary" });
			const ws = wb.Sheets[wb.SheetNames[0]];
			const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

			const parsed = data.slice(1).map((row, index) => ({
				lote: row[0] ?? "",
				item: row[1] ?? "",
				valor: row[2] ?? "",
				novaOrdem: "",
				excluir: false,
				conflito: false,
				excelIndex: index + 2,
			}));

			setRows(parsed);
		};
		reader.readAsBinaryString(file);
	};

	const toggleExcluir = (idx) => {
		setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, excluir: !row.excluir } : row)));
	};

	const handleNovaOrdemChange = (idx, value) => {
		setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, novaOrdem: value, conflito: false } : row)));
	};

	const handleSave = () => {
		const header = ["LOTE", "ITEM", "VALOR"];

		const ordens = {};
		let hasConflict = false;

		const filtered = rows
			.filter((row) => !row.excluir)
			.map((row) => {
				let target = row.novaOrdem ? parseInt(row.novaOrdem, 10) : row.excelIndex;

				if (ordens[target]) {
					hasConflict = true;
					row.conflito = true;
				} else {
					row.conflito = false;
					ordens[target] = true;
				}

				return [row.lote, row.novaOrdem || row.item, row.valor];
			});

		setRows([...rows]);

		if (hasConflict) return;

		const worksheet = XLSX.utils.aoa_to_sheet([header, ...filtered]);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha");

		XLSX.writeFile(workbook, `${fileName}_correct.xlsx`);
	};

	const ThClass = "bg-slate-600 text-slate-300 p-2 text-center text-xs font-medium";
	const TdClass = "p-2 text-center text-sm font-normal";

	return (
		<div className="p-4 space-y-4">
			<input type="file" accept=".xlsx" onChange={handleFileUpload} />

			{rows.length > 0 && (
				<>
					<div className="absolute bottom-0 right-5">
						<button onClick={selecionarIntervalo} className="inline-block p-3 text-center bg-slate-600 text-white rounded-s-lg text-xs uppercase cursor-pointer hover:bg-slate-800 transition duration-200 select-none">
							Selecionar
						</button>
						<button onClick={handleSave} className="inline-block p-3 text-center bg-green-600 text-white rounded-e-lg text-xs uppercase cursor-pointer hover:bg-green-800 transition duration-200 select-none">
							Salvar
						</button>
					</div>

					<table className="w-full mt-4">
						<thead>
							<tr>
								<th className={ThClass}>LOTE</th>
								<th className={ThClass}>ITEM</th>
								<th className={ThClass}>VALOR</th>
								<th className={ThClass}>NOVA ORDEM</th>
								<th className={ThClass}>EXPORTAR</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row, idx) => (
								<tr key={idx} className={`${row.excluir ? "bg-red-200" : ""} ${row.conflito ? "bg-yellow-200" : ""}`}>
									<td className={TdClass}>{row.lote}</td>
									<td className={TdClass}>{row.item}</td>
									<td className={TdClass}>{row.valor}</td>
									<td className={TdClass}>
										<input type="text" value={row.novaOrdem} onChange={(e) => handleNovaOrdemChange(idx, e.target.value)} className={`border-b border-black/40 focus:outline-none transition-all duration-300 focus:border-black p-1 ${row.conflito ? "bg-yellow-300" : ""}`} />
									</td>
									<td className={TdClass}>
										<button onClick={() => toggleExcluir(idx)} className={`${row.excluir ? "bg-red-500 text-white/70" : "bg-green-500 text-black/70"} p-1 cursor-pointer`}>
											{row.excluir ? <CancelIcon sx={{ fontSize: 18 }} /> : <CheckIcon sx={{ fontSize: 18 }} />}
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</>
			)}
		</div>
	);
}
