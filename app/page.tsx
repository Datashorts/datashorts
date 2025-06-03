import CTA from "./_components/landing/cta";
import { TabsFAQ } from "./_components/landing/faq";
import Features from "./_components/landing/features";
import Footer from "./_components/landing/footer";
import Header from "./_components/landing/header";
import { HeroSection } from "./_components/landing/hero";
import MoreFeatures from "./_components/landing/more-features";
import SeeInAction from "./_components/landing/see-in-action";
import Visualizations from "./_components/landing/visualizations";
import VerticalSlideFeatures from "./_components/landing/textParallax";
import { CustomCursor }  from "./_components/landing/custom-cursor";
import ContactForm from "./_components/landing/contact"; // Add this import

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <CustomCursor />
      <Header />
      <HeroSection />
     
      <VerticalSlideFeatures />
      
      <TabsFAQ />
      <ContactForm />  {/* Add the contact form here */}
     
      <Footer />
    </main>
  )
}