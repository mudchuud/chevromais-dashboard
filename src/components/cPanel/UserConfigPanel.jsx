import { useEffect, useState } from "react";
import Input from "../Editais/Input";
import Modal from "./Modal";
import Button from "../Editais/Button";
import { getDatabase, ref, get, update } from "firebase/database";
import {
  getAuth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { app } from "../firebase-config";

const UserConfigPanel = () => {
  const [userData, setUserData] = useState({
    name: "",
    lastname: "",
    email: "",
    client_id: "",
    client_key: "",
  });

  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!user) return; // Se não houver usuário autenticado, sai.

    const uid = user.uid; // Pega o UID diretamente do usuário autenticado.
    const db = getDatabase(app);
    const userRef = ref(db, `users/${uid}`);

    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        setUserData(snapshot.val());
      }
    });
  }, []);

  const handleBlur = (field) => (e) => {
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!user) return;

    const uid = user.uid;
    const db = getDatabase(app);
    const userRef = ref(db, `users/${uid}`);

    update(userRef, { [field]: e.target.value });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    const { current, new: newPassword, confirm } = passwordData;
    if (newPassword !== confirm) {
      setPasswordError("As senhas não coincidem.");
      return;
    }

    try {
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) throw new Error("Usuário não autenticado.");

      const credential = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setPasswordSuccess("Senha atualizada com sucesso!");
      setPasswordData({ current: "", new: "", confirm: "" });
    } catch (err) {
      setPasswordError(err.message);
    }
  };

  return (
    <div id="products-list" className="p-4 grid grid-cols-3 gap-8">
      <div className="grid space-y-4 shadow-md p-6 rounded-lg bg-gray-100 col-span-3 md:col-span-1">
        <h1 className="text-xl font-semibold uppercase">Dados Pessoais</h1>
        <Input label="Nome" value={userData.name} disabled />
        <Input label="Sobrenome" value={userData.lastname} disabled />
      </div>

      <div className="grid grid-cols-1 space-y-2 shadow-md p-6 rounded-lg bg-gray-100 col-span-3 md:col-span-1">
        <h1 className="text-xl font-semibold uppercase col-span-1">
          Dados de Acesso
        </h1>
        <Input label="Email" type="email" value={userData.email} disabled />
        <div className="col-span-1 flex items-end">
          <Modal title="Alterar senha" id="change-password" client:load>
            <form onSubmit={handlePasswordChange}>
              <div className="space-y-4">
                <Input
                  label="Senha atual"
                  type="password"
                  value={passwordData.current}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, current: e.target.value })
                  }
                  autoComplete="current-password"
                  required
                />
                <Input
                  label="Nova senha"
                  type="password"
                  value={passwordData.new}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, new: e.target.value })
                  }
                  autoComplete="new-password"
                  required
                />
                <Input
                  label="Confirmar nova senha"
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirm: e.target.value })
                  }
                  autoComplete="new-password"
                  required
                />
                {passwordError && (
                  <p className="text-red-600">{passwordError}</p>
                )}
                {passwordSuccess && (
                  <p className="text-green-600">{passwordSuccess}</p>
                )}
                <Button type="submit" label="Salvar" />
              </div>
            </form>
          </Modal>
        </div>
      </div>

      <div className="grid space-y-4 shadow-md p-6 rounded-lg bg-gray-100 col-span-3 md:col-span-1">
        <h1 className="text-xl font-semibold uppercase">Dados de API</h1>
        <Input
          label="Client Id"
          defaultValue={userData.client_id}
          onBlur={handleBlur("client_id")}
        />
        <Input
          label="Client Secret"
          defaultValue={userData.client_key}
          onBlur={handleBlur("client_key")}
        />
      </div>
    </div>
  );
};

export default UserConfigPanel;
