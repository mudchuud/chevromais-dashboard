// firebase-config.js
import { initializeApp } from "firebase/app";

const firebaseConfig = {
	apiKey: "AIzaSyCkclGt8jaOlnrFwPV-uVMuRJUwyn9b_Y8",
	authDomain: "chevromais-dashboard.firebaseapp.com",
	projectId: "chevromais-dashboard",
	storageBucket: "chevromais-dashboard.firebasestorage.app",
	messagingSenderId: "931850146140",
	appId: "1:931850146140:web:879401b256d7b73ee47199",
	databaseURL: "https://chevromais-dashboard-default-rtdb.firebaseio.com/",
};

const app = initializeApp(firebaseConfig);
export { app };