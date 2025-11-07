"use client";

import { motion } from "framer-motion";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";

interface FadeOutProps extends PropsWithChildren {
	className?: string;
}

export function FadeOut({ children, className }: FadeOutProps) {
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);

	useEffect(() => {
		const handleScroll = () => {
			const currentScrollY = window.scrollY;

			if (currentScrollY > lastScrollY && currentScrollY > 100) {
				setIsVisible(false);
			} else {
				setIsVisible(true);
			}

			setLastScrollY(currentScrollY);
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, [lastScrollY]);

	return (
		<motion.div
			initial={{ opacity: 0, y: -20 }}
			animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
			transition={{ duration: 0.5, ease: "easeInOut" }}
			className={className}
		>
			{children}
		</motion.div>
	);
}
