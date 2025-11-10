import type React from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface LoadingProps {
	isLoading?: boolean;
	onAnimationComplete?: () => void;
}

const Loading: React.FC<LoadingProps> = ({
	isLoading = true,
	onAnimationComplete,
}) => {
	if (!isLoading) return null;

	return (
		<motion.div
			className="fixed inset-0 flex items-center justify-center bg-black z-50"
			initial={{ opacity: 1 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.3 }}
			onAnimationComplete={onAnimationComplete}
		>
			<Loader2 className="animate-spin text-white" size={32} />
		</motion.div>
	);
};

export default Loading;
