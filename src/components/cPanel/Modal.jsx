// Modal.jsx
import { useState, useEffect } from "react";
import Button from "../Base/Button.jsx";
import CloseIcon from "@mui/icons-material/Close";

export default function Modal({ title, id, children }) {
	const [isOpen, setIsOpen] = useState(false);
	const [showModal, setShowModal] = useState(false);

	const open = () => setIsOpen(true);

	const close = () => {
		setShowModal(false);
		setTimeout(() => {
			setIsOpen(false);
		}, 200);
	};

	useEffect(() => {
		if (isOpen) setShowModal(true);
	}, [isOpen]);

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === "Escape" && showModal) {
				close();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [showModal]);

	return (
		<>
			<Button label={title} name={id} onClick={open} />
			<div
				className={`modal fixed inset-0 bg-black/50 z-50 flex items-center justify-center transition-opacity duration-200 ${showModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
				onClick={(e) => {
					if (e.target === e.currentTarget) close();
				}}
			>
				<div className="bg-white p-6 rounded-md shadow-md w-4/5 max-w-md space-y-4 transition-opacity duration-200" onClick={(e) => e.stopPropagation()}>
					<div className="flex justify-between items-start">
						<h3 className="font-bold text-lg uppercase">{title}</h3>
						<button className="close-button cursor-pointer text-black opacity-60 hover:opacity-90 transition-all duration-200" onClick={close}>
							<CloseIcon />
						</button>
					</div>
					<div className="py-4">
						{/* Passa o close como função para os filhos */}
						{typeof children === "function" ? children({ close }) : children}
					</div>
				</div>
			</div>
		</>
	);
}
