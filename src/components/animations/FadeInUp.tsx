"use client";

import { motion } from "framer-motion";
import type { PropsWithChildren } from "react";

interface FadeInUpProps extends PropsWithChildren {
	className?: string;
}

export function FadeInUp({ children, className }: FadeInUpProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className={className}
		>
			{children}
		</motion.div>
	);
}
