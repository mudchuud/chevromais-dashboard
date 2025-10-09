// ImportQuantity.jsx
import { useState } from "react";
import * as XLSX from "xlsx";
import Modal from "../cPanel/Modal";

export default function ImportQuantity({ lines, onImport }) {
	const [fileName, setFileName] = useState("");

	const handleFile = async (event, close) => {
		const file = event.target.files[0];
		if (!file) return;
		setFileName(file.name);

		const data = await file.arrayBuffer();
		const workbook = XLSX.read(data);
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

		// Atualiza apenas qtde das linhas correspondentes por lote e item
		const updatedLines = lines.map((line) => {
			const matchingRow = json.find((row) => String(row[0]).trim() === String(line.lote).trim() && String(row[1]).trim() === String(line.item).trim());

			if (matchingRow) {
				const qtde = matchingRow[5]; // coluna F
				return { ...line, qtde: qtde != null ? qtde : line.qtde };
			}

			return line;
		});

		onImport(updatedLines);

		// Fecha o modal automaticamente
		close();
	};

	return (
		<Modal title="Importar Quantidades" id="importar-quantidades">
			{({ close }) => (
				<div className="space-y-3">
					<label className="inline-block p-3 text-center bg-slate-500 text-white rounded-lg text-xs uppercase cursor-pointer hover:bg-slate-700 transition duration-200 select-none">
						Selecionar arquivo
						<input type="file" accept=".xlsx" onChange={(e) => handleFile(e, close)} className="hidden" />
					</label>
					<p className="text-sm text-gray-600">{fileName || "Nenhum arquivo selecionado"}</p>
				</div>
			)}
		</Modal>
	);
}
