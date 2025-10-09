import React, { useState, useEffect, useRef } from 'react';
import {
  getDatabase,
  ref,
  onValue,
  off
} from "firebase/database";
import { app } from '../firebase-config';

function ModeloAutocomplete({ onSelectModelo, models: propModels, value }) {
  const [modeloInput, setModeloInput] = useState('');
  const [modelos, setModelos] = useState(propModels || []);
  const [showModeloSuggestions, setShowModeloSuggestions] = useState(false);
  const [isModeloFocused, setIsModeloFocused] = useState(false);
  const [selectedModelo, setSelectedModelo] = useState(null);

  const db = getDatabase(app);
  const modeloRef = useRef(null);

  useEffect(() => {
    const refModelos = ref(db, 'models');

    const handleValueChange = (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data).map(([id, item]) => ({
          id,
          name: item.name
        }));
        setModelos(list);
      } else {
        setModelos([]);
      }
    };

    onValue(refModelos, handleValueChange);

    if (propModels) {
      setModelos(propModels);
    }

    return () => off(refModelos, 'value', handleValueChange);
  }, [db]);

  // sincroniza o valor externo
  useEffect(() => {
    if (value) {
      setSelectedModelo(value);
      setModeloInput(value.name);
    } else {
      setSelectedModelo(null);
      setModeloInput('');
    }
  }, [value]);

  const getFirstFilteredModelo = () => {
    return modelos
      .filter(m => m.name.toLowerCase().startsWith(modeloInput.toLowerCase()))[0] || null;
  };

  const handleModeloBlur = () => {
    setIsModeloFocused(false);
    setShowModeloSuggestions(false);

    const firstFilteredModelo = getFirstFilteredModelo();
    if (firstFilteredModelo) {
      handleSelectModelo(firstFilteredModelo);
    } else {
      setModeloInput('');
      setSelectedModelo(null);
      if (onSelectModelo) onSelectModelo(null);
    }
  };

  const handleSelectModelo = (modelo) => {
    setModeloInput(modelo.name);
    setSelectedModelo(modelo);
    if (onSelectModelo) onSelectModelo(modelo);
    setShowModeloSuggestions(false);
  };

  const handleModeloChange = (e) => {
    setModeloInput(e.target.value);
    setShowModeloSuggestions(e.target.value.trim() !== '');
    setSelectedModelo(null);
  };

  const handleKeyDownModelo = (e) => {
    if (modelos.length === 0) return;
    if (e.key === 'Enter' || e.key === 'Tab') {
      const firstFilteredModelo = getFirstFilteredModelo();
      if (firstFilteredModelo) {
        e.preventDefault();
        handleSelectModelo(firstFilteredModelo);
      }
    }
  };

  const handleModeloFocus = () => setIsModeloFocused(true);

  const highlightText = (text, input) => {
    if (!input) return text;

    const idx = text.toLowerCase().indexOf(input.toLowerCase());
    if (idx < 0) return text;
    const endIdx = idx + input.length;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-bold">{text.slice(idx, endIdx)}</span>
        {text.slice(endIdx)}
      </>
    );
  };

  return (
    <div className="relative w-full">
      <div className="relative flex-1">
        <input
          ref={modeloRef}
          type="text"
          value={modeloInput}
          onChange={handleModeloChange}
          onKeyDown={handleKeyDownModelo}
          onFocus={handleModeloFocus}
          onBlur={handleModeloBlur}
          placeholder="Digite o modelo"
          className="w-full border border-black/50 text-sm uppercase placeholder:normal-case p-2 rounded-lg focus:outline-none focus:border-black/80 transition-all duration-200"
        />
        {showModeloSuggestions && isModeloFocused && (
          <ul className="absolute z-50 bg-white border border-black/20 rounded-md max-h-40 overflow-auto w-full mt-1 text-sm">
            {modelos
              .filter(m => m.name.toLowerCase().startsWith(modeloInput.toLowerCase()))
              .map((m) => (
                <li
                  key={m.id}
                  className="px-2 py-1 hover:bg-gray-700 hover:text-white cursor-pointer"
                  onMouseDown={() => handleSelectModelo(m)}
                >
                  {highlightText(m.name, modeloInput)}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ModeloAutocomplete;
