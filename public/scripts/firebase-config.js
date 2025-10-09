// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

const firebaseConfig = {
	apiKey: "AIzaSyB3It4gTcgfbRHg-qIJtWBzs_bM8n_xIJs",
	authDomain: "chevrotools.firebaseapp.com",
	databaseURL: "https://chevrotools-default-rtdb.firebaseio.com",
	projectId: "chevrotools",
	storageBucket: "chevrotools.firebasestorage.app",
	messagingSenderId: "497901743107",
	appId: "1:497901743107:web:8f7ee7941848ec7fda7236",
};

const app = initializeApp(firebaseConfig);
export { app };