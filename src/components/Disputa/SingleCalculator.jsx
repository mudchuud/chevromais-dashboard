import React, { useState, useEffect } from "react";

export default function InputMargemCalculada() {
  const [rawMargin, setRawMargin] = useState("");
  const [rawCost, setRawCost] = useState("");
  const [valorCalculado, setValorCalculado] = useState("0,00");

  const formatCurrency = (value) =>
    new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const parseToFloat = (value) =>
    parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;

  const formatPercent = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
    let int = digits.slice(0, 2);
    let dec = digits.slice(2, 4);
    if (parseInt(int) < 10) int = parseInt(int).toString();
    return `${int},${dec}`;
  };

  const handleMarginChange = (e) => {
    const clean = e.target.value.replace(/\D/g, "");
    setRawMargin(clean);
  };

  const handleCostChange = (e) => {
    const clean = e.target.value.replace(/[^0-9,]/g, "");
    setRawCost(clean);
  };

  const aplicarMargemComArredondamento = (custo, margemPercentual) => {
    const margemDecimal = margemPercentual / 100;
    const bruto = custo * (1 + margemDecimal);

    if (bruto < 100) {
      const inteiro = Math.floor(bruto);
      const decimal = Math.ceil((bruto - inteiro) * 10);
      return inteiro + decimal / 10;
    } else {
      return Math.ceil(bruto);
    }
  };

  useEffect(() => {
    const margem = parseToFloat(formatPercent(rawMargin));
    const custo = parseToFloat(rawCost);
    if (margem && custo) {
      const resultado = aplicarMargemComArredondamento(custo, margem);
      setValorCalculado(formatCurrency(resultado));
    } else {
      setValorCalculado("0,00");
    }
  }, [rawMargin, rawCost]);

  return (
    <div className="shadow-md p-4 bg-slate-100 rounded-lg">
      <div>
     
        <div className="flex gap-5 items-center">
          {/* Margem (%) */}
          <div className="space-y-1 w-full justify-center">
            <div className="flex mt-2">
              <input
                type="text"
                name="margin"
                id="margin"
                className="w-full border border-e-0 border-slate-400 p-1 px-2 text-xl rounded-l-lg focus:outline-none focus:border-slate-600 font-bold text-right"
                value={formatPercent(rawMargin)}
                onChange={handleMarginChange}
                maxLength={5}
                placeholder="00,00"
              />
              <div className="border border-slate-600 bg-slate-500 rounded-r-lg text-white p-2 font-bold select-none">
                %
              </div>
            </div>
          </div>

          {/* Custo base */}
          <div className="w-full justify-center">
            <div className="flex mt-2">
              <input
                type="text"
                name="baseValue"
                id="baseValue"
                className="w-full border border-slate-400 p-[.4rem] px-2 text-xl rounded-lg focus:outline-none focus:border-slate-600 font-bold text-right"
                value={rawCost}
                onChange={handleCostChange}
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Resultado */}
          <div
            className="p-[.5rem] mt-2 w-full justify-center flex text-xl font-bold text-slate-800"
            id="singleResult"
          >
            {valorCalculado}
          </div>
        </div>
      </div>
    </div>
  );
}
