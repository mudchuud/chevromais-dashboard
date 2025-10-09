//AddBrand.jsx
import React, { useState } from "react";
import { getDatabase, ref, get, set } from "firebase/database";
import { app } from "../firebase-config";

const AddBrand = () => {
  const [brandName, setBrandName] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const showMessage = (msg, error = false) => {
    setMessage(msg);
    setIsError(error);
    setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  const handleSave = async () => {
    const name = brandName.trim().toLowerCase();
    if (!name) {
      showMessage("Por favor, insira o nome da marca.", true);
      return;
    }

    const database = getDatabase(app);
    const brandsRef = ref(database, "brands");

    try {
      const snapshot = await get(brandsRef);
      if (snapshot.exists()) {
        const existingBrands = Object.values(snapshot.val());
        const nameExists = existingBrands.some(
          (brand) => brand.name.toLowerCase() === name
        );
        if (nameExists) {
          showMessage("Já existe uma marca com esse nome.", true);
          return;
        }
      }

      const generateUniqueId = () => {
        const min = 10000;
        const max = 99999;
        return Math.floor(Math.random() * (max - min + 1)) + min;
      };

      let newBrandId;
      let idExists = true;
      while (idExists) {
        newBrandId = generateUniqueId().toString();
        const snapshotId = await get(ref(database, `brands/${newBrandId}`));
        idExists = snapshotId.exists();
      }

      const newBrandRef = ref(database, `brands/${newBrandId}`);
      await set(newBrandRef, { name });

      showMessage("Marca adicionada com sucesso!");
      setBrandName("");
    } catch (e) {
      console.error("Erro ao adicionar marca:", e);
      showMessage("Erro ao adicionar marca: " + e.message, true);
    }
  };

  return (
    <div>
      <div className="w-full flex">
        <input
          type="text"
          className="w-full border border-black/50 rounded-l-lg p-2 text-uppercase text-sm focus:outline-none focus:border-black/80 transition-all duration-200"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
        />
        <button
          className="bg-slate-600 hover:bg-slate-800 cursor-pointer transition duration-200 px-2 text-white rounded-r-lg uppercase text-xs font-bold"
          onClick={handleSave}
        >
          Salvar
        </button>
      </div>
      <div className="h-1">
        {message && (
          <div
            className={`w-full text-xs flex justify-center font-semibold transition-opacity duration-300 ${
              isError ? "text-red-500" : "text-green-600"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddBrand;
