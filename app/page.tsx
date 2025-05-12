import CTA from "./_components/landing/cta";
import FAQ from "./_components/landing/faq";
import Features from "./_components/landing/features";
import Footer from "./_components/landing/footer";
import Header from "./_components/landing/header";
import Hero from "./_components/landing/hero";
import HowItWorks from "./_components/landing/how-it-works";
import MoreFeatures from "./_components/landing/more-features";
import SeeInAction from "./_components/landing/see-in-action";
import Visualizations from "./_components/landing/visualizations";

import VerticalSlideFeatures from "./_components/landing/textParallax";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Header />
      <Hero />
      <Features />
      <VerticalSlideFeatures />
      <Visualizations />
      <SeeInAction />
      <MoreFeatures />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  )
}

