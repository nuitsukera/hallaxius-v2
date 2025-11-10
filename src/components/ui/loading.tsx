import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import React from "react";

interface LoadingProps {
	show: boolean;
}

export const Loading: React.FC<LoadingProps> = ({ show }) => (
	<AnimatePresence>
		{show && (
			<motion.div
				initial={{ opacity: 1 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.5 }}
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					width: "100vw",
					height: "100vh",
					background: "rgba(255,255,255,0.85)",
					zIndex: 9999,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Loader2 className="animate-spin" size={64} strokeWidth={2.5} />
			</motion.div>
		)}
	</AnimatePresence>
);
