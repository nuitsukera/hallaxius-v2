"use client";

import { motion } from "framer-motion";
import type { PropsWithChildren } from "react";

interface StaggerContainerProps extends PropsWithChildren {
	className?: string;
}

export default function StaggerContainer({
	children,
	className = "space-y-8",
}: StaggerContainerProps) {
	return (
		<motion.div
			className={className}
			initial="initial"
			animate="animate"
			variants={{
				animate: {
					transition: {
						staggerChildren: 0.08,
					},
				},
			}}
		>
			{children}
		</motion.div>
	);
}
