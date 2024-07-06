import { FC } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import ClientWindow from "./pages/ClientWindow";

export const Router: FC = () => {
	return (
		<HashRouter>
			<Routes>
				<Route path="/" element={<AdminDashboard />} />
				<Route path="/client" element={<ClientWindow />} />
			</Routes>
		</HashRouter>
	);
};
