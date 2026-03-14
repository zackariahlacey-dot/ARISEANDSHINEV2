"use client";

import { useState, Suspense } from "react";
import Header from "@/components/sections/Header";
import Hero from "@/components/sections/Hero";
import Services from "@/components/sections/Services";
import Maintenance from "@/components/sections/Maintenance";
import Transformation from "@/components/sections/Transformation";
import About from "@/components/sections/About";
import Testimonials from "@/components/sections/Testimonials";
import ServiceAreas from "@/components/sections/ServiceAreas";
import BookingForm from "@/components/sections/BookingForm";
import Footer from "@/components/sections/Footer";

export default function Home() {
  const [selectedService, setSelectedService] = useState<string>("Interior Detail");

  const handleServiceSelect = (serviceName: string) => {
    setSelectedService(serviceName);
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-black">
      <Header />
      <Hero onBookClick={() => handleServiceSelect("Elite Detail")} />
      <Services onSelectService={handleServiceSelect} />
      <Maintenance onSelectService={handleServiceSelect} />
      <Transformation />
      <Testimonials />
      <ServiceAreas />
      <About />
      <Suspense fallback={<div className="py-20 text-center text-white/20 uppercase tracking-widest text-xs">Initializing Studio...</div>}>
        <BookingForm initialService={selectedService} />
      </Suspense>
      <Footer />
    </main>
  );
}
