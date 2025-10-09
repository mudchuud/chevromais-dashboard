import React, { useState, useEffect } from "react";
import { getDatabase, ref, set, get } from "firebase/database";
import { app } from "../firebase-config";
import MarcaAutocomplete from "./MarcaAutocomplete";
import Button from "../Base/Button";

const AddModel = () => {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [modelName, setModelName] = useState("");
  const [message, setMessage] = useState({ text: "", isError: false });

  useEffect(() => {
    const fetchBrands = async () => {
      const database = getDatabase(app);
      const brandsRef = ref(database, "brands");
      const brandsSnapshot = await get(brandsRef);
      if (brandsSnapshot.exists()) {
        const brandsArray = Object.entries(brandsSnapshot.val()).map(
          ([key, value]) => ({
            id: key,
            name: value.name,
          })
        );
        setBrands(brandsArray);
      }
    };
    fetchBrands();
  }, []);

  const showMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => {
      setMessage({ text: "", isError: false });
    }, 5000);
  };

  const handleSaveModel = async () => {
    const modelNameTrimmed = modelName.trim().toLowerCase();
    const brandId = selectedBrand ? selectedBrand.id : null;

    if (!brandId) {
      showMessage("Por favor, selecione uma marca.", true);
      return;
    }

    if (!modelNameTrimmed) {
      showMessage("Por favor, insira o nome do modelo.", true);
      return;
    }

    const database = getDatabase(app);
    const modelsRef = ref(database, "models");

    const snapshot = await get(modelsRef);
    if (snapshot.exists()) {
      const existingModels = Object.values(snapshot.val());
      const nameExists = existingModels.some(
        (model) =>
          model.name.toLowerCase() === modelNameTrimmed &&
          Number(model.brandID) === Number(brandId)
      );
      if (nameExists) {
        showMessage("Modelo já cadastrado", true);
        return;
      }
    }

    const generateUniqueId = () => {
      const min = 10000;
      const max = 99999;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    let newModelId;
    let idExists = true;

    while (idExists) {
      newModelId = generateUniqueId().toString();
      const snapshotId = await get(ref(database, `models/${newModelId}`));
      idExists = snapshotId.exists();
    }

    const newModelRef = ref(database, `models/${newModelId}`);
    set(newModelRef, {
      name: modelNameTrimmed,
      brandID: Number(brandId),
      lastCost: 0,
    })
      .then(() => {
        showMessage("Modelo adicionado com sucesso!");
        setModelName("");
        setSelectedBrand(null);
      })
      .catch((e) => {
        console.error("Erro ao adicionar modelo:", e);
        showMessage("Erro ao adicionar modelo: " + e.message, true);
      });
  };

  return (
    <div>
      <div className="w-full flex flex-col gap-3">
        <MarcaAutocomplete
          brands={brands}
          value={selectedBrand}
          onSelectMarca={(brand) => setSelectedBrand(brand)}
        />
        <div className="w-full flex">
          <input
            type="text"
            className="w-full border border-black/50 rounded-lg p-2 text-uppercase text-sm focus:outline-none focus:border-black/80 transition-all duration-200"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="Nome do modelo"
          />
        </div>
        <Button label="Adicionar" name="add-model" onClick={handleSaveModel} />
        <div className="h-1">
          {message.text && (
            <div
              className={`w-full text-xs uppercase text-xs flex justify-center font-semibold transition-opacity duration-300 ${
                message.isError ? "text-red-500" : "text-green-500"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddModel;
