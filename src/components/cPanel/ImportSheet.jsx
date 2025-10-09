import React, { useState } from "react";
import * as XLSX from "xlsx";
import Button from "../Base/Button";
import { getDatabase, ref, set, get, child } from "firebase/database";
import { app } from "../firebase-config";

function ImportSheetModal() {
  const [fileName, setFileName] = useState("Nenhum arquivo selecionado");
  const [stats, setStats] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [totalRows, setTotalRows] = useState(0);

  const db = getDatabase(app);

  const generateUID = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      setSelectedFile(file);
    } else {
      setFileName("Nenhum arquivo selecionado");
      setSelectedFile(null);
    }
  };

  const processFile = async () => {
    if (!selectedFile) return;

    const data = await selectedFile.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const totalRowsCount = rows.length - 1;
    setTotalRows(totalRowsCount);

    if (totalRowsCount <= 0) {
      setStats(null);
      return;
    }

    // Identifica as colunas certas (Marca / Modelo)
    const headerRow = rows[0];
    let brandColIndex = null;
    let modelColIndex = null;

    headerRow.forEach((header, idx) => {
      const normalized = header?.toString().trim().toLowerCase();
      if (normalized === "marca") brandColIndex = idx;
      if (normalized === "modelo") modelColIndex = idx;
    });

    if (brandColIndex === null || modelColIndex === null) {
      alert(
        "Erro: Não foi possível identificar as colunas 'Marca' e 'Modelo'. Verifique o arquivo."
      );
      return;
    }

    let brandsCache = {};
    const dbRef = ref(db);

    let newStats = {
      brandsCreated: 0,
      brandsSkipped: 0,
      modelsCreated: 0,
      modelsSkipped: 0,
      rowsProcessed: 0,
    };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const brandName = row[brandColIndex];
      const modelName = row[modelColIndex];

      if (!brandName || !modelName) continue;

      const cleanBrand = brandName.toString().trim();
      const cleanModel = modelName.toString().trim();

      try {
        let brandID;
        if (brandsCache[cleanBrand]) {
          brandID = brandsCache[cleanBrand];
          newStats.brandsSkipped++;
        } else {
          const brandsSnap = await get(child(dbRef, `brands`));
          let found = false;
          if (brandsSnap.exists()) {
            brandsSnap.forEach((item) => {
              if (item.val().name.toLowerCase() === cleanBrand.toLowerCase()) {
                brandID = item.key;
                found = true;
              }
            });
          }
          if (!found) {
            brandID = generateUID();
            await set(ref(db, `brands/${brandID}`), { name: cleanBrand });
            newStats.brandsCreated++;
          } else {
            newStats.brandsSkipped++;
          }
          brandsCache[cleanBrand] = brandID;
        }

        const modelsSnap = await get(child(dbRef, `models`));
        let duplicate = false;
        if (modelsSnap.exists()) {
          modelsSnap.forEach((item) => {
            const val = item.val();
            if (
              val.name.toLowerCase() === cleanModel.toLowerCase() &&
              Number(val.brandID) === Number(brandID)
            ) {
              duplicate = true;
            }
          });
        }

        if (!duplicate) {
          const modelID = generateUID();
          await set(ref(db, `models/${modelID}`), {
            brandID: Number(brandID),
            name: cleanModel,
          });
          newStats.modelsCreated++;
        } else {
          newStats.modelsSkipped++;
        }
      } catch (err) {
        console.error(err);
      }

      newStats.rowsProcessed = i;
      setStats({ ...newStats });
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex gap-3 items-center">
        <label className="inline-block p-3 text-center bg-slate-500 text-white rounded-lg text-xs uppercase cursor-pointer hover:bg-slate-700 transition duration-200">
          Escolher arquivo
          <input
            type="file"
            name="selectsheet"
            accept=".xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        <p className="text-sm text-gray-600 max-w-[200px] truncate overflow-hidden whitespace-nowrap">
          {fileName}
        </p>
      </div>

      <Button label="Enviar" id="send-file" onClick={processFile} />

      {stats && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
          <div className="mb-2 font-medium text-slate-700">
            Progresso da Importação
          </div>

          <div className="w-full grid grid-cols-2 gap-2 text-slate-600 text-xs">
            <div className="flex justify-between">
              <span>Linhas processadas:</span>
              <span className="font-medium">
                {stats.rowsProcessed}/{totalRows}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Progresso:</span>
              <span className="font-medium">
                {Math.round((stats.rowsProcessed / totalRows) * 100)}%
              </span>
            </div>

            <div className="flex justify-between text-green-600">
              <span>✅ Marcas criadas:</span>
              <span>{stats.brandsCreated}</span>
            </div>
            <div className="flex justify-between text-red-500">
              <span>❌ Marcas ignoradas:</span>
              <span>{stats.brandsSkipped}</span>
            </div>

            <div className="flex justify-between text-green-600">
              <span>✅ Modelos criados:</span>
              <span>{stats.modelsCreated}</span>
            </div>
            <div className="flex justify-between text-red-500">
              <span>❌ Modelos ignorados:</span>
              <span>{stats.modelsSkipped}</span>
            </div>
          </div>

          {stats.rowsProcessed === totalRows && (
            <div className="mt-3 text-center text-green-700 font-semibold">
              ✅ Importação finalizada.
            </div>
          )}
        </div>
      )}

      <div className="text-center">
        <a
          href="../../public/import_template.xlsx"
          className="text-xs uppercase text-slate-500"
          download
        >
          Baixar template .xlsx
        </a>
      </div>
    </div>
  );
}

export default ImportSheetModal;
