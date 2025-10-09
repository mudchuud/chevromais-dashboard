import React, { useState, useEffect } from "react";
import { app } from "../firebase-config";
import {
  getDatabase,
  ref,
  onValue,
  remove,
  off,
  update,
} from "firebase/database";
import DeleteIcon from "@mui/icons-material/DeleteForeverOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Close";
import IbamaIcon from "@mui/icons-material/Forest";
import CatalogIcon from "@mui/icons-material/Description";
import InmetroIcon from "@mui/icons-material/WorkspacePremium";

export default function DatabaseSnapshot() {
  const [models, setModels] = useState([]);
  const [brands, setBrands] = useState([]);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandEditValue, setBrandEditValue] = useState("");
  const [confirmDeleteBrand, setConfirmDeleteBrand] = useState(null);
  const [editingModel, setEditingModel] = useState(null);
  const [modelEditValue, setModelEditValue] = useState({ name: "" });
  const [confirmDeleteModel, setConfirmDeleteModel] = useState(null);
  const [error, setError] = useState(null);
  const [activeLetter, setActiveLetter] = useState("#");
  const [usageCounts, setUsageCounts] = useState({});

  useEffect(() => {
    const database = getDatabase(app);
    const brandsRef = ref(database, "brands");
    const modelsRef = ref(database, "models");

    let brandsData = [];
    let modelsData = [];

    const updateMergedModels = () => {
      const brandsObj = brandsData.reduce((obj, brand) => {
        obj[brand.id] = { name: brand.name, usage: brand.usage || 0 };
        return obj;
      }, {});

      const mergedModels = modelsData.map((model) => ({
        ...model,
        brandName: brandsObj[model.brandID]?.name || "Marca Desconhecida",
        brandUsage: brandsObj[model.brandID]?.usage || 0,
      }));

      setModels(
        mergedModels.sort((a, b) => {
          const brandCompare = a.brandName.localeCompare(b.brandName);
          if (brandCompare !== 0) return brandCompare;
          return a.name.localeCompare(b.name);
        })
      );

      const brandUsageCounts = brandsData.reduce((acc, brand) => {
        acc[brand.id] = brand.usage || 0;
        return acc;
      }, {});
      setUsageCounts(brandUsageCounts);
    };

    const handleBrands = (snapshot) => {
      brandsData = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([key, value]) => ({
            id: key,
            name: value.name,
            usage: value.usage || 0,
          }))
        : [];
      setBrands(brandsData);
      updateMergedModels();
    };

    const handleModels = (snapshot) => {
      modelsData = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([key, value]) => ({
            id: key,
            name: value.name,
            brandID: value.brandID,
            usage: value.usage || 0,
          }))
        : [];
      updateMergedModels();
    };

    onValue(brandsRef, handleBrands);
    onValue(modelsRef, handleModels);

    return () => {
      off(brandsRef, "value", handleBrands);
      off(modelsRef, "value", handleModels);
    };
  }, []);

  const alphabet = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const availableLetters = brands.reduce((acc, brand) => {
    const firstChar = brand.name[0].toUpperCase();
    if (/^[A-Z]$/.test(firstChar)) {
      acc.add(firstChar);
    } else {
      acc.add("#");
    }
    return acc;
  }, new Set());

  const groupedModels = models.reduce((acc, model) => {
    const firstChar = model.brandName[0].toUpperCase();
    if (activeLetter !== (/^[A-Z]$/.test(firstChar) ? firstChar : "#")) {
      return acc;
    }
    if (!acc[model.brandName]) acc[model.brandName] = [];
    acc[model.brandName].push(model);
    return acc;
  }, {});

  const handleEditBrand = (brandID, currentName) => {
    setEditingBrand(brandID);
    setBrandEditValue(currentName);
    setConfirmDeleteBrand(null);
  };

  const handleSaveBrand = async (brandID) => {
    try {
      const database = getDatabase(app);
      await update(ref(database, `brands/${brandID}`), {
        name: brandEditValue,
      });
      setEditingBrand(null);
    } catch (e) {
      setError("Erro ao atualizar marca: " + e.message);
    }
  };

  const handleEditModel = (model) => {
    setEditingModel(model.id);
    setModelEditValue({ name: model.name });
    setConfirmDeleteModel(null);
  };

  const handleSaveModel = async (modelID) => {
    try {
      const database = getDatabase(app);
      await update(ref(database, `models/${modelID}`), {
        name: modelEditValue.name,
      });
      setEditingModel(null);
    } catch (e) {
      setError("Erro ao atualizar modelo: " + e.message);
    }
  };

  const confirmDeleteBrandAction = async (brandID) => {
    try {
      const database = getDatabase(app);
      await remove(ref(database, `brands/${brandID}`));
      const updates = {};
      models
        .filter((model) => model.brandID === brandID)
        .forEach((model) => {
          updates[`models/${model.id}`] = null;
        });
      await update(ref(database), updates);
      setConfirmDeleteBrand(null);
    } catch (e) {
      setError("Erro ao deletar marca: " + e.message);
    }
  };

  const confirmDeleteModelAction = async (modelID) => {
    try {
      const database = getDatabase(app);
      await remove(ref(database, `models/${modelID}`));
      setConfirmDeleteModel(null);
    } catch (e) {
      setError("Erro ao deletar modelo: " + e.message);
    }
  };

  if (error) {
    return <div style={{ color: "red" }}>Erro: {error}</div>;
  }

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {alphabet.map((letter) => {
          const isAvailable = availableLetters.has(letter);
          return (
            <div
              key={letter}
              className={`p-1 pt-[6px] w-full flex items-center justify-center rounded cursor-pointer select-none border text-xs font-semibold uppercase transition-all ${
                activeLetter === letter
                  ? "bg-slate-800 text-white border-slate-800"
                  : isAvailable
                  ? "text-slate-800 border-slate-800 hover:bg-slate-200"
                  : "text-gray-400 border-gray-300 cursor-not-allowed"
              }`}
              onClick={() => isAvailable && setActiveLetter(letter)}
            >
              {letter}
            </div>
          );
        })}
      </div>

      <div className="w-full text-sm">
        <div className="bg-slate-600 text-left text-white uppercase select-none flex">
          <div className="p-2 w-2/5">Marca</div>
          <div className="p-2 w-3/5">Modelo</div>
        </div>
        <div>
          {Object.entries(groupedModels).map(([brandName, models]) => (
            <div key={brandName} className="flex flex-col border-t border-black/50">
              {models.map((model, index) => (
                <div
                  key={model.id}
                  className="flex  p-1"
                  data-modelid={model.id}
                >
                  {index === 0 && (
                    <div
                      className="w-2/5 font-bold text-slate-800 align-top flex flex-col gap-1"
                      data-brandid={model.brandID}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex-1">
                          {editingBrand === model.brandID ? (
                            <input
                              type="text"
                              className="border p-1 w-auto text-sm text-black rounded shadow-sm"
                              value={brandEditValue}
                              onChange={(e) =>
                                setBrandEditValue(e.target.value)
                              }
                              autoFocus
                            />
                          ) : (
                            <div className="p-1 border border-black/0 uppercase">
                              {brandName}{" "}
                              <span className="text-xs text-gray-500">
                                ({usageCounts[model.brandID] || 0})
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {confirmDeleteBrand === model.brandID ? (
                            <>
                              <CheckIcon
                                sx={{ fontSize: 18 }}
                                className="cursor-pointer text-green-600"
                                onClick={() =>
                                  confirmDeleteBrandAction(model.brandID)
                                }
                              />
                              <CancelIcon
                                sx={{ fontSize: 18 }}
                                className="cursor-pointer text-red-600"
                                onClick={() => setConfirmDeleteBrand(null)}
                              />
                            </>
                          ) : editingBrand === model.brandID ? (
                            <>
                              <CheckIcon
                                sx={{ fontSize: 18 }}
                                className="cursor-pointer text-green-600"
                                onClick={() => handleSaveBrand(model.brandID)}
                              />
                              <CancelIcon
                                sx={{ fontSize: 18 }}
                                className="cursor-pointer text-red-600"
                                onClick={() => setEditingBrand(null)}
                              />
                            </>
                          ) : (
                            <>
                              <IbamaIcon
                                sx={{ fontSize: 18 }}
                                className="cursor-pointer text-slate-500 hover:text-slate-800"
                              />
                              <EditIcon
                                sx={{ fontSize: 18 }}
                                className="cursor-pointer text-slate-500 hover:text-slate-800"
                                onClick={() =>
                                  handleEditBrand(
                                    model.brandID,
                                    model.brandName
                                  )
                                }
                              />
                              <DeleteIcon
                                sx={{ fontSize: 18 }}
                                className="cursor-pointer text-slate-500 hover:text-slate-800"
                                onClick={() =>
                                  setConfirmDeleteBrand(model.brandID)
                                }
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {index !== 0 && <div className="w-2/5"></div>}
                  <div className="w-3/5 font-bold text-slate-800 uppercase flex justify-between items-center select-all">
                    {editingModel === model.id ? (
                      <input
                        type="text"
                        className="border p-1 w-full text-sm text-black rounded shadow-sm"
                        value={modelEditValue.name}
                        onChange={(e) =>
                          setModelEditValue((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        autoFocus
                      />
                    ) : (
                      <div className="p-1 border border-black/0 flex justify-between items-center w-full">
                        <span>
                          {model.name}{" "}
                          <span className="text-xs text-gray-500">
                            ({model.usage || 0})
                          </span>
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 ml-2">
                      {confirmDeleteModel === model.id ? (
                        <>
                          <CheckIcon
                            sx={{ fontSize: 18 }}
                            className="cursor-pointer text-green-600"
                            onClick={() => confirmDeleteModelAction(model.id)}
                          />
                          <CancelIcon
                            sx={{ fontSize: 18 }}
                            className="cursor-pointer text-red-600"
                            onClick={() => setConfirmDeleteModel(null)}
                          />
                        </>
                      ) : editingModel === model.id ? (
                        <>
                          <CheckIcon
                            sx={{ fontSize: 18 }}
                            className="cursor-pointer text-green-600"
                            onClick={() => handleSaveModel(model.id)}
                          />
                          <CancelIcon
                            sx={{ fontSize: 18 }}
                            className="cursor-pointer text-red-600"
                            onClick={() => setEditingModel(null)}
                          />
                        </>
                      ) : (
                        <>
                          <CatalogIcon
                            sx={{ fontSize: 18 }}
                            className="cursor-pointer text-slate-500 hover:text-slate-800"
                          />
                          <InmetroIcon
                            sx={{ fontSize: 18 }}
                            className="cursor-pointer text-slate-500 hover:text-slate-800"
                          />
                          <EditIcon
                            sx={{ fontSize: 18 }}
                            className="cursor-pointer text-slate-500 hover:text-slate-800"
                            onClick={() => handleEditModel(model)}
                          />
                          <DeleteIcon
                            sx={{ fontSize: 18 }}
                            className="cursor-pointer text-slate-500 hover:text-slate-800"
                            onClick={() => setConfirmDeleteModel(model.id)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
