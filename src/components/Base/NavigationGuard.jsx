// components/NavigationGuard.jsx
import { useEffect, useCallback } from "react";
import { useBlocker } from "react-router-dom";

export default function NavigationGuard({ when }) {
  // Bloqueio para navegação interna (React Router)
  const blocker = useCallback(
    (tx) => {
      if (when) {
        const confirm = window.confirm(
          "Você tem alterações não salvas. Tem certeza que deseja sair?"
        );
        if (confirm) {
          tx.retry(); // Permite a navegação
        }
      } else {
        tx.retry(); // Permite a navegação se não for necessário bloquear
      }
    },
    [when]
  );

  useBlocker(blocker, when);

  // Bloqueio para atualização/fechamento da aba
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!when) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [when]);

  return null; // Este componente não renderiza nada visualmente
}
