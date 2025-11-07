import { StaggerContainer, FadeInUp } from "@/components/animations";
import UploadPage from "@/components/pages/UploadPage";

export default function Home() {
	return (
		<StaggerContainer className="min-h-screen overflow-hidden">
			<FadeInUp className="h-full">
				<main className="w-full h-full overflow-hidden">
					<section className="h-screen grid place-items-center px-4 sm:px-6 lg:px-8 w-full">
						<div className="w-full max-w-6xl overflow-hidden">
							<UploadPage />
						</div>
					</section>
				</main>
			</FadeInUp>
		</StaggerContainer>
	);
}
