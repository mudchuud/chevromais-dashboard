import { useState, useEffect } from "react";
import { getDatabase, ref, get } from "firebase/database";
import { app } from "../firebase-config";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";

export default function DescriptionGenerator() {
	const [activeResistencia, setActiveResistencia] = useState("");
	const [activeAderencia, setActiveAderencia] = useState("");
	const [marcas, setMarcas] = useState([]);

	const opcoes = ["A", "B", "C", "D", "E", "F", "G"];

	useEffect(() => {
		const db = getDatabase(app);
		const dbRef = ref(db, "description");

		get(dbRef)
			.then((snapshot) => {
				if (snapshot.exists()) {
					// Pega só as chaves (ex: ["dunlop", "xBRI"])
					const keys = Object.keys(snapshot.val());
					setMarcas(keys);
				} else {
					console.warn("Nenhum dado encontrado em description");
				}
			})
			.catch((error) => {
				console.error("Erro ao buscar marcas:", error);
			});
	}, []);

	return (
		<section id="description-generator" className="p-5">
			<h1>Gerador de descrição</h1>
			<div className="flex flex-col gap-5 font-bold">
				<div className="flex gap-2">
					<div className="flex flex-col w-full">
						<label className="font-bold text-slate-700 text-sm" htmlFor="marca">
							Marca
						</label>
						<select id="marca" name="marca" className="w-full border rounded-lg p-2 py-[.64rem] border-slate-700 font-bold text-sm text-slate-700 focus:outline-none capitalize">
							{marcas.map((marca) => (
								<option className="capitalize" key={marca} value={marca}>
									{marca}
								</option>
							))}
						</select>
					</div>

					<div className="flex flex-wrap gap-2 w-full">
						<div className="flex flex-col flex-1 max-w-full">
							<label className="font-bold text-slate-700 text-sm">Modelo</label>
							<input type="text" className="w-full border rounded-lg p-2 border-slate-700 font-bold text-sm text-slate-700 focus:outline-none" />
						</div>
					</div>
				</div>
				<div className="flex flex-wrap gap-2 w-full">
					<div className="flex flex-col flex-1 max-w-full">
						<label className="font-bold text-slate-700 text-sm">Descrição</label>
						<textarea className="w-full border rounded-lg p-2 border-slate-700 text-sm text-slate-700 focus:outline-none" />
					</div>
				</div>
				<div className="flex flex-wrap gap-2 w-full">
					<div className="flex flex-col flex-1 max-w-full">
						<label className="font-bold text-slate-700 text-sm">Largura</label>
						<input type="text" className="w-full border rounded-lg p-2 border-slate-700 font-bold text-sm text-slate-700 focus:outline-none" />
					</div>
					<div className="flex flex-col flex-1 max-w-full">
						<label className="font-bold text-slate-700 text-sm">Perfil</label>
						<input type="text" className="w-full border rounded-lg p-2 border-slate-700 font-bold text-sm text-slate-700 focus:outline-none" />
					</div>
					<div className="flex flex-col flex-1 max-w-full">
						<label className="font-bold text-slate-700 text-sm">Aro</label>
						<input type="text" className="w-full border rounded-lg p-2 border-slate-700 font-bold text-sm text-slate-700 focus:outline-none" />
					</div>
					<div className="flex flex-col flex-1 max-w-full">
						<label className="font-bold text-slate-700 text-sm">Carga</label>
						<input type="text" className="w-full border rounded-lg p-2 border-slate-700 font-bold text-sm text-slate-700 focus:outline-none" />
					</div>
					<div className="flex flex-col flex-1 max-w-full">
						<label className="font-bold text-slate-700 text-sm">Velocidade</label>
						<input type="text" className="w-full border rounded-lg p-2 border-slate-700 font-bold text-sm text-slate-700 focus:outline-none" />
					</div>
				</div>
				{/* Grupo ENCE */}
				<div className="flex gap-5">
					{/* Resistencia */}
					<div>
						<h3 className="font-bold text-slate-700 text-sm">Resistência</h3>
						<div className="flex gap-1 mb-4 pt-1">
							{opcoes.map((letra) => {
								const isActive = activeResistencia === letra;
								return (
									<div key={letra} className={`flex-1 p-2 text-center rounded-lg cursor-pointer select-none border font-semibold uppercase text-sm transition-all ${isActive ? "bg-slate-800 text-white border-slate-800" : "text-slate-800 border-slate-800 hover:bg-slate-200"}`} onClick={() => setActiveResistencia(letra)}>
										{letra}
									</div>
								);
							})}
						</div>
					</div>

					{/* Aderência */}
					<div>
						<h3 className="font-bold text-slate-700 text-sm">Aderência</h3>
						<div className="flex gap-1 mb-4 pt-1">
							{opcoes.map((letra) => {
								const isActive = activeAderencia === letra;
								return (
									<div key={letra} className={`flex-1 p-2 text-center rounded-lg cursor-pointer select-none border font-semibold uppercase text-sm transition-all ${isActive ? "bg-slate-800 text-white border-slate-800" : "text-slate-800 border-slate-800 hover:bg-slate-200"}`} onClick={() => setActiveAderencia(letra)}>
										{letra}
									</div>
								);
							})}
						</div>
					</div>

					{/* Ruído */}
					<div>
						<h3 className="font-bold text-slate-700 text-sm">Nível de Ruído</h3>
						<div className="flex gap-1 mb-4 pt-1">
							<input type="text" className="w-full border rounded-lg p-2 border-slate-700 font-bold text-sm text-slate-700 focus:outline-none" />
						</div>
					</div>
				</div>
				<div>
					<button className="flex p-3 text-center bg-slate-500 text-white rounded-lg text-xs uppercase cursor-pointer hover:bg-slate-700 transition duration-200 select-none w-full justify-center">
						<SettingsEthernetIcon sx={{ fontSize: 18 }} />
						<span className="p-[0.15rem]">Gerar descrição</span>
					</button>
				</div>
				<div>
					<h3>Resultado</h3>
					<textarea className="w-full border border-black/50 bg-black/30 rounded-lg" name="description" id="descrition-result" disabled value={`Resistência: ${activeResistencia || "-"} | Aderência: ${activeAderencia || "-"}`}></textarea>
				</div>
			</div>
		</section>
	);
}
