"use client";

import Image from "next/image";
import { SettingsSheet } from "./SettingsSheet";

export function Header() {
	return (
		<header className="fixed top-0 left-0 right-0 backdrop-blur-md border-b border-input z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					<div className="flex items-center space-x-3">
						<div className="relative w-6 h-6">
							<Image
								src="/favicon.webp"
								alt="Hallaxi.us"
								width={24}
								height={24}
								className="object-contain"
								priority
							/>
						</div>
						<span className="text-lg font-semibold">Hallaxi.us</span>
					</div>

					<SettingsSheet />
				</div>
			</div>
		</header>
	);
}
