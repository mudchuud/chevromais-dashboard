import React, { useState, useEffect, useRef } from "react";
import ModelAutocomplete from "./ModelAutoComplete";
import Input from "../Editais/Input";
import Switch from "./Switch";

export default function LinePricer({ index, lote, item, refValue, qtde = "00001", inputRef, margin, globalChecked, onToggleGlobal, costInputRef, onCostKeyDown, onChange }) {
	const [costInput, setCostInput] = useState("");
	const [marca, setMarca] = useState("");
	const [modelo, setModelo] = useState("");

	const formatFourDigits = (v) => String(v).padStart(4, "0");
	const quantidade = parseInt(qtde) || 1;

	const formatCurrency = (v) =>
		new Intl.NumberFormat("pt-BR", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(v);

	const parseNumber = (value, isPercent = false) => {
		if (!value) return null;
		const clean = value
			.replace(/\./g, "")
			.replace(",", ".")
			.replace(/[^\d.]/g, "");
		const parsed = parseFloat(clean);
		return isNaN(parsed) ? null : isPercent ? parsed / 100 : parsed;
	};

	// --- Cálculo esperado ---
	const hasOperator = /[+\-*/]/.test(costInput);
	let expected = null;

	if (!hasOperator) {
		const parsedCost = parseNumber(costInput);
		const marginDecimal = parseNumber(margin, true);
		if (parsedCost !== null && marginDecimal !== null) {
			const calc = parsedCost * (1 + marginDecimal);
			expected = calc < 100 ? Math.floor(calc) + Math.ceil((calc % 1) * 10) / 10 : Math.ceil(calc);
		}
	}

	// --- Atualiza automaticamente o pai ---
	useEffect(() => {
		const formattedValor = expected ? parseFloat(expected.toFixed(2)) : 0;
		const parsedCost = parseNumber(costInput) || 0;
		onChange?.({
			marca,
			modelo,
			valorCalculado: formattedValor,
			custoBase: parsedCost,
			switchChecked: globalChecked,
		});
	}, [marca, modelo, expected, costInput, globalChecked]);

	// --- Cores por estado ---
	const calcStateMap = {
		normal: "text-slate-800",
		ok: "text-emerald-600",
		attention: "text-amber-600",
		caution: "text-rose-600",
	};

	let calcState = "normal";
	if (expected !== null) {
		if (expected <= refValue) calcState = "ok";
		else if (expected > refValue && expected <= refValue * 1.1) calcState = "attention";
		else calcState = "caution";
	}

	const calcClass = `py-1 ${calcStateMap[calcState]}`;

	// --- Handlers ---
	const handleCostChange = (e) => {
		let value = e.target.value;
		if (value.split(/[.,]/).length - 1 > 1) return;
		const [integers, decimals] = value.replace(/[^\d.,+\-*/]/g, "").split(/[,\.]/);
		setCostInput(decimals !== undefined ? `${integers},${decimals.slice(0, 2)}` : integers);
	};

	const handleCostBlur = () => {
		let input = costInput;
		if (!input) return setCostInput("");
		input = input.replace(",", ".").replace(/\s+/g, "");

		if (input.includes("+")) {
			try {
				const total = input
					.split("+")
					.map((n) => parseFloat(n))
					.reduce((a, b) => a + (b || 0), 0);
				if (!isNaN(total)) {
					setCostInput(formatCurrency(total));
					return;
				}
			} catch {}
		}

		const parsed = parseNumber(costInput);
		setCostInput(parsed ? formatCurrency(parsed) : "");
	};

	const handleSwitchChange = () => {
		onToggleGlobal(lote); // delega o controle ao pai
	};

	// --- Render ---
	return (
		<div className="p-4 flex flex-col md:flex-row justify-between items-start border-black/10 gap-6 focus-within:bg-slate-300 rounded-md transition-colors border my-2 bg-slate-100 shadow-lg" data-index={index}>
			{/* Lote/Item/Quantidade/Ref */}
			<div className="flex flex-col md:flex-row gap-4 md:gap-6 p-1">
				{[
					{ label: "Lote/Item", value: `${formatFourDigits(lote)}/${formatFourDigits(item)}` },
					{ label: "Qntd.", value: formatFourDigits(qtde), extra: "text-left md:text-center" },
					{ label: "Ref.", value: formatCurrency(refValue || 0), className: "text-slate-800" },
				].map(({ label, value, className = "", extra = "" }, i) => (
					<div key={i} className="flex flex-col justify-center">
						<p className={`text-gray-600 text-sm font-medium select-none ${extra}`}>{label}</p>
						<p className={`text-sm font-semibold py-2 ${className}`}>{value}</p>
					</div>
				))}
			</div>

			{/* Autocomplete */}
			<div className="flex-1 md:flex-none">
				<ModelAutocomplete index={index} onSelectMarca={(value) => setMarca(value)} onSelectModelo={(value) => setModelo(value)} />
			</div>

			{/* Custo / Valor calculado / Switch */}
			<div className="flex flex-1 items-start gap-6 p-1">
				<Input
					label="Custo"
					type="text"
					value={costInput}
					onChange={handleCostChange}
					onBlur={handleCostBlur}
					onKeyDown={onCostKeyDown}
					onFocus={(e) =>
						setTimeout(() => {
							e.target.scrollIntoView({ behavior: "smooth", block: "center" });
						}, 50)
					}
					ref={(el) => {
						costInputRef?.(el);
						if (inputRef) inputRef.current = el;
					}}
				/>

				<div className="flex flex-col w-full justify-center pt-5">
					<span className={`${calcClass} text-2xl font-black flex items-baseline gap-2`}>
						{expected !== null ? formatCurrency(expected) : "--"}
						{expected !== null && refValue && <span className={`text-base font-semibold ${expected < refValue ? "text-emerald-600" : expected <= refValue * 1.1 ? "text-amber-600" : "text-rose-600"}`}>({(((expected - refValue) / refValue) * 100).toFixed(2).replace(".", ",")}%)</span>}
					</span>

					<span className="text-sm font-semibold text-slate-700 mt-1">{expected !== null ? formatCurrency(globalChecked ? expected * quantidade : expected) : "--"}</span>

					<div className="flex items-center gap-2 mt-2">
						<span className={`font-medium text-sm select-none ${!globalChecked ? "text-slate-800" : "text-slate-500"}`}>Unitário</span>
						<Switch checked={globalChecked} onChange={handleSwitchChange} />
						<span className={`font-medium text-sm select-none ${globalChecked ? "text-slate-800" : "text-slate-500"}`}>Global</span>
					</div>
				</div>
			</div>
		</div>
	);
}
