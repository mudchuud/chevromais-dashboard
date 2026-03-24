import { useEffect, useState, useMemo } from "react";
import { CiCirclePlus } from "react-icons/ci";
import CloseIcon from "@mui/icons-material/Close";
import { getDatabase, ref, push, onValue, set, update, remove } from "firebase/database";
import { app } from "../firebase-config";

/* =========================
   HELPERS (FORMATAÇÃO PT-BR)
========================= */
// normaliza e TRAVA em no máximo 2 casas decimais durante a digitação
const normalizeInput = (value) => {
	if (!value) return "";

	let v = value.replace(/[^0-9.,]/g, "");

	// se tiver vírgula, considera ela como decimal
	if (v.includes(",")) {
		const [intPart, decPart = ""] = v.split(",");
		const cleanInt = intPart.replace(/\./g, "");
		const cleanDec = decPart.replace(/\./g, "").slice(0, 2); // max 2 decimais
		return cleanDec.length ? `${cleanInt},${cleanDec}` : `${cleanInt},`;
	}

	// se não tiver vírgula mas tiver ponto, troca por vírgula
	if (v.includes(".")) {
		const [intPart, decPart = ""] = v.split(".");
		const cleanInt = intPart.replace(/\./g, "");
		const cleanDec = decPart.replace(/\./g, "").slice(0, 2); // max 2 decimais
		return cleanDec.length ? `${cleanInt},${cleanDec}` : `${cleanInt},`;
	}

	return v.replace(/\./g, "");
};

const stringToNumber = (value) => {
	if (!value) return null;
	const normalized = value.replace(/\./g, "").replace(",", ".");
	const n = parseFloat(normalized);
	return isNaN(n) ? null : n;
};

const formatNumber = (value) => {
	if (value === null || value === undefined || value === "") return "";

	const num = parseFloat(value);
	if (isNaN(num)) return "";

	return num.toFixed(2).replace(".", ",");
};

/* =========================
   MODAL
========================= */
function InlineModal({ title, isOpen, onClose, children }) {
	const [show, setShow] = useState(false);

	useEffect(() => {
		setShow(isOpen);
	}, [isOpen]);

	useEffect(() => {
		const esc = (e) => {
			if (e.key === "Escape" && isOpen) onClose();
		};
		window.addEventListener("keydown", esc);
		return () => window.removeEventListener("keydown", esc);
	}, [isOpen, onClose]);

	if (!isOpen && !show) return null;

	return (
		<div
			className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center transition-opacity duration-200 ${show ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="bg-white p-6 rounded-md shadow-md w-4/5 max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
				<div className="flex justify-between items-start">
					<h3 className="font-bold text-lg uppercase">{title}</h3>
					<button onClick={onClose} className="opacity-60 hover:opacity-100">
						<CloseIcon />
					</button>
				</div>
				<div className="py-2">{children}</div>
			</div>
		</div>
	);
}

export default function ListProducts() {
	const db = getDatabase(app);

	const [products, setProducts] = useState({});
	const [suppliers, setSuppliers] = useState({});
	const [prices, setPrices] = useState({});

	// estado LOCAL para digitação (não formatado)
	const [editingPrices, setEditingPrices] = useState({});

	const [newProduct, setNewProduct] = useState("");
	const [newSupplier, setNewSupplier] = useState("");
	const [newShip, setNewShip] = useState("");

	const [editingProductId, setEditingProductId] = useState(null);
	const [editingSupplierId, setEditingSupplierId] = useState(null);

	const [editProductName, setEditProductName] = useState("");
	const [editSupplierName, setEditSupplierName] = useState("");
	const [editSupplierShip, setEditSupplierShip] = useState("");

	const [showAddProduct, setShowAddProduct] = useState(false);
	const [showAddSupplier, setShowAddSupplier] = useState(false);

	useEffect(() => {
		onValue(ref(db, "orders/product"), (snap) => setProducts(snap.val() || {}));
		onValue(ref(db, "orders/supplier"), (snap) => setSuppliers(snap.val() || {}));
		onValue(ref(db, "orders/price"), (snap) => setPrices(snap.val() || {}));
	}, []);

	const sortedSuppliers = useMemo(() => {
		return Object.entries(suppliers).sort((a, b) => a[1].name.localeCompare(b[1].name));
	}, [suppliers]);

	const handleAddProduct = () => {
		if (!newProduct.trim()) return;
		push(ref(db, "orders/product"), { name: newProduct.trim() });
		setNewProduct("");
		setShowAddProduct(false);
	};

	const handleAddSupplier = () => {
		if (!newSupplier.trim() || !newShip.trim()) return;

		const ship = stringToNumber(newShip);
		if (ship === null) return;

		const shipInt = Math.round(ship * 10);

		push(ref(db, "orders/supplier"), {
			name: newSupplier.trim(),
			ship: shipInt,
		});

		setNewSupplier("");
		setNewShip("");
		setShowAddSupplier(false);
	};

	const handleUpdateProduct = () => {
		if (!editingProductId || !editProductName.trim()) return;

		update(ref(db, `orders/product/${editingProductId}`), {
			name: editProductName.trim(),
		});

		setEditingProductId(null);
		setEditProductName("");
	};

	const handleDeleteProduct = () => {
		if (!editingProductId) return;

		remove(ref(db, `orders/product/${editingProductId}`));
		remove(ref(db, `orders/price/${editingProductId}`));

		setEditingProductId(null);
	};

	const handleUpdateSupplier = () => {
		if (!editingSupplierId || !editSupplierName.trim()) return;

		const ship = stringToNumber(editSupplierShip);
		if (ship === null) return;

		const shipInt = Math.round(ship * 10);

		update(ref(db, `orders/supplier/${editingSupplierId}`), {
			name: editSupplierName.trim(),
			ship: shipInt,
		});

		setEditingSupplierId(null);
		setEditSupplierName("");
		setEditSupplierShip("");
	};

	const handleDeleteSupplier = () => {
		if (!editingSupplierId) return;

		remove(ref(db, `orders/supplier/${editingSupplierId}`));

		Object.keys(products || {}).forEach((pid) => {
			remove(ref(db, `orders/price/${pid}/${editingSupplierId}`));
		});

		setEditingSupplierId(null);
	};

	/* ================================
	   SALVAR PREÇO SOMENTE NO BLUR
	   + ENTER = SALVAR
	   + ESC = CANCELAR
	================================ */
	const handlePriceChange = (pid, sid, value) => {
		setEditingPrices((prev) => ({
			...prev,
			[pid]: {
				...prev[pid],
				[sid]: normalizeInput(value),
			},
		}));
	};

	const handlePriceBlur = (pid, sid) => {
		const value = editingPrices?.[pid]?.[sid];

		if (!value) {
			remove(ref(db, `orders/price/${pid}/${sid}`));
		} else {
			const base = stringToNumber(value);
			if (base !== null) {
				set(ref(db, `orders/price/${pid}/${sid}`), { base });
			}
		}

		setEditingPrices((prev) => {
			const copy = { ...prev };
			if (copy[pid]) {
				delete copy[pid][sid];
				if (Object.keys(copy[pid]).length === 0) delete copy[pid];
			}
			return copy;
		});
	};

	const handlePriceKeyDown = (e, pid, sid, base) => {
		// ENTER = salvar (força blur)
		if (e.key === "Enter") {
			e.preventDefault();
			e.currentTarget.blur();
		}

		// ESC = cancelar edição
		if (e.key === "Escape") {
			e.preventDefault();

			setEditingPrices((prev) => {
				const copy = { ...prev };
				if (copy[pid]) {
					delete copy[pid][sid];
					if (Object.keys(copy[pid]).length === 0) delete copy[pid];
				}
				return copy;
			});

			e.currentTarget.value = formatNumber(base);
			e.currentTarget.blur();
		}
	};

	const getBestSupplier = (pid) => {
		const productPrices = prices?.[pid];
		if (!productPrices) return null;

		let best = null;

		Object.entries(productPrices).forEach(([sid, data]) => {
			if (!data?.base) return;

			const ship = suppliers[sid]?.ship || 0;
			const marginPercent = ship / 10;
			const final = data.base + (data.base * marginPercent) / 100;

			if (!best || final < best.value) {
				best = { supplier: suppliers[sid]?.name, value: final };
			}
		});

		return best;
	};

	return (
		<section className="border border-black flex flex-col gap-5 p-5 relative">
			{/* SCROLL + THEAD FIXO */}
			<div className="max-h-[70vh] overflow-y-auto max-w-full">
				<table className="table-auto w-full border-collapse">
					<thead>
						<tr>
							<th className="border-b-2 p-2 sticky top-0 bg-slate-200 z-10"></th>

							{sortedSuppliers.map(([sid, supplier]) => (
								<th
									key={sid}
									className="border-b-2 bg-slate-300 border-x-black/20 p-2 cursor-pointer hover:bg-slate-400 sticky top-0 z-10"
									onClick={() => {
										setEditingSupplierId(sid);
										setEditSupplierName(supplier.name);
										setEditSupplierShip(formatNumber(supplier.ship / 10));
									}}
								>
									{supplier.name}
									<br />
									<span className="text-xs font-thin">
										Frete: <strong>{formatNumber(supplier.ship / 10)}%</strong>
									</span>
								</th>
							))}

							<th className="border border-black border-b-2 p-2 bg-slate-700 text-slate-100 sticky top-0 z-10">Melhor fornecedor</th>
						</tr>
					</thead>

					<tbody>
						{Object.entries(products).map(([pid, product]) => {
							const best = getBestSupplier(pid);

							return (
								<tr key={pid}>
									<td
										className="text-sm border-b border-black p-2 cursor-pointer bg-slate-600 text-slate-100 hover:bg-slate-700 text-end font-semibold"
										onClick={() => {
											setEditingProductId(pid);
											setEditProductName(product.name);
										}}
									>
										{product.name}
									</td>

									{sortedSuppliers.map(([sid]) => {
										const cell = prices?.[pid]?.[sid];
										const base = cell?.base ?? "";

										const ship = suppliers[sid]?.ship || 0;
										const marginPercent = ship / 10;

										const final = base ? parseFloat(base) + (parseFloat(base) * marginPercent) / 100 : null;

										const editingValue = editingPrices?.[pid]?.[sid];

										return (
											<td key={sid} className="border-y border-x border-x-black/20 p-1">
												<div className="flex flex-col gap-2 justify-start">
													<input type="text" className="w-full p-1 outline-none text-sm border-b font-bold border-black/20 cursor-pointer hover:bg-black/10 focus:bg-black/10 placeholder:text-black/40 placeholder:font-normal placeholder:text-center" value={editingValue !== undefined ? editingValue : formatNumber(base)} onChange={(e) => handlePriceChange(pid, sid, e.target.value)} onBlur={() => handlePriceBlur(pid, sid)} onKeyDown={(e) => handlePriceKeyDown(e, pid, sid, base)} onFocus={(e) => e.target.select()} placeholder="Informar valor" />

													<div className={`text-xs text-green-600 transition-opacity duration-200 ${final !== null ? "opacity-100" : "opacity-0"}`}>
														Final: <span className="text-sm font-bold">{formatNumber(final)}</span>
													</div>
												</div>
											</td>
										);
									})}

									<td className="border bg-slate-300 p-2 text-sm">
										{best ? (
											<>
												<strong>{best.supplier}</strong>
												<br />
												{formatNumber(best.value)}
											</>
										) : (
											"-"
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* BOTÕES ADD */}
			<div className="flex justify-center gap-10 mt-4">
				<div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setShowAddProduct(true)}>
					<CiCirclePlus className="w-8 h-auto" />
					<span className="text-xs">ADICIONAR PRODUTO</span>
				</div>

				<div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setShowAddSupplier(true)}>
					<CiCirclePlus className="w-8 h-auto" />
					<span className="text-xs">ADICIONAR FORNECEDOR</span>
				</div>
			</div>

			{/* MODAIS */}
			<InlineModal title="Adicionar produto" isOpen={showAddProduct} onClose={() => setShowAddProduct(false)}>
				<div className="flex flex-col gap-3">
					<input className="border p-2" value={newProduct} onChange={(e) => setNewProduct(e.target.value)} />
					<button className="bg-black text-white p-2" onClick={handleAddProduct}>
						Salvar
					</button>
				</div>
			</InlineModal>

			<InlineModal title="Adicionar fornecedor" isOpen={showAddSupplier} onClose={() => setShowAddSupplier(false)}>
				<div className="flex flex-col gap-3">
					<input className="border p-2" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} />
					<input className="border p-2" value={newShip} onChange={(e) => setNewShip(normalizeInput(e.target.value))} onBlur={() => setNewShip(formatNumber(stringToNumber(newShip)))} />
					<button className="bg-black text-white p-2" onClick={handleAddSupplier}>
						Salvar
					</button>
				</div>
			</InlineModal>

			<InlineModal title="Editar produto" isOpen={!!editingProductId} onClose={() => setEditingProductId(null)}>
				<div className="flex flex-col gap-3">
					<input className="border p-2" value={editProductName} onChange={(e) => setEditProductName(e.target.value)} />
					<button className="bg-black text-white p-2" onClick={handleUpdateProduct}>
						Salvar
					</button>
					<button className="bg-red-600 text-white p-2" onClick={handleDeleteProduct}>
						Excluir
					</button>
				</div>
			</InlineModal>

			<InlineModal title="Editar fornecedor" isOpen={!!editingSupplierId} onClose={() => setEditingSupplierId(null)}>
				<div className="flex flex-col gap-3">
					<input className="border p-2" value={editSupplierName} onChange={(e) => setEditSupplierName(e.target.value)} />
					<input className="border p-2" value={editSupplierShip} onChange={(e) => setEditSupplierShip(normalizeInput(e.target.value))} onBlur={() => setEditSupplierShip(formatNumber(stringToNumber(editSupplierShip)))} />
					<button className="bg-black text-white p-2" onClick={handleUpdateSupplier}>
						Salvar
					</button>
					<button className="bg-red-600 text-white p-2" onClick={handleDeleteSupplier}>
						Excluir
					</button>
				</div>
			</InlineModal>
		</section>
	);
}
