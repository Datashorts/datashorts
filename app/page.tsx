// Current components you're using
import { CustomCursor } from "./_components/landing/custom-cursor";
import Header from "./_components/landing/header";
import { HeroSection } from "./_components/landing/hero";
import VerticalSlideFeatures from "./_components/landing/textParallax";
import Pricing from "./_components/landing/pricing";
import ContactForm from "./_components/landing/contact";
import Footer from "./_components/landing/footer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <CustomCursor />
      <Header />

      <HeroSection />

      <VerticalSlideFeatures />

      <Pricing />

      <ContactForm />

      <Footer />
    </main>
  );
}

/* 

FLOW REASONING FOR CURRENT COMPONENTS:

1. **Hero** - Grab attention, communicate value proposition
2. **VerticalSlideFeatures** - Engaging feature explanation with parallax
3. **Pricing** - Present pricing after users understand the value
4. **Contact** - Direct conversion path and support channel

PERFECT FLOW BECAUSE:
- Hero hooks users immediately
- Parallax features create engagement and explain value
- Pricing comes when users are educated about benefits
- Contact form provides immediate conversion opportunity
- Clean, focused journey without overwhelming users

This order creates a strong conversion funnel:
Hook → Educate → Price → Convert

*/
