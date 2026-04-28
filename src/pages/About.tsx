import RevealSection from "@/components/RevealSection";
import { useParallax } from "@/hooks/useParallax";
import { Link } from "react-router-dom";
import aboutHero from "@/assets/about-hero.jpg";
import aboutWaysToShop from "@/assets/about-ways-to-shop.jpg";
import aboutBuying from "@/assets/about-buying.jpg";
import heroBg from "@/assets/hero-bg.jpg";

const About = () => {
  const parallax1 = useParallax(0.3);
  const parallax2 = useParallax(0.2);

  return (
    <>
      {/* Section 1 — Full-Bleed Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div ref={parallax1.ref} className="absolute inset-0" style={parallax1.style}>
          <img
            src={aboutHero}
            alt="Warehouse414 showroom"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-black/40" />
        <RevealSection className="relative z-10 mx-4">
          <div className="bg-card/95 backdrop-blur-sm p-10 md:p-16 max-w-2xl text-center">
            <p className="font-body text-xs tracking-[0.3em] uppercase text-muted-foreground mb-6">
              Curated Treasures
            </p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl mb-8 text-foreground">
              warehouse four fourteen
            </h1>
            <div className="font-body text-sm md:text-base text-muted-foreground space-y-4 mb-8">
              <p>
                Great design transcends eras. Whether it's a mid-century modern
                masterpiece, an industrial artifact, or a striking piece of
                contemporary art, we seek out items that tell a story and bring
                character to any space.
              </p>
              <p>
                Our commitment to authenticity means every piece is photographed
                in detail and described accurately, including any wear that adds
                to its patina and history.
              </p>
            </div>
            <Link
              to="/catalog"
              className="inline-block font-display text-sm tracking-[0.2em] uppercase border border-foreground text-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-colors"
            >
              View Collection
            </Link>
          </div>
        </RevealSection>
      </section>

      {/* Section 2 — Our Story */}
      <section className="py-20 md:py-32 bg-secondary">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <RevealSection>
              <p className="font-body text-xs tracking-[0.3em] uppercase text-muted-foreground mb-4">
                Our Story
              </p>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl mb-6 text-foreground">
                Discover Our Passion and Purpose
              </h2>
              <div className="font-body text-sm md:text-base text-muted-foreground space-y-4">
                <p>
                  Located in a sprawling warehouse space, Warehouse414 curates
                  one-of-a-kind vintage furniture and art pieces that stand the
                  test of time. Each item in our collection is carefully selected
                  for its design significance, quality craftsmanship, and unique
                  character.
                </p>
                <p>
                  We work closely with collectors, estates, and design
                  professionals to source pieces that are truly special — from
                  rare mid-century finds to bold contemporary works.
                </p>
              </div>
            </RevealSection>
            <RevealSection delay={200}>
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={heroBg}
                  alt="Inside the warehouse"
                  className="w-full h-full object-cover"
                />
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* Section 2.5 — Ken Burns reveal image */}
      <section className="relative overflow-hidden">
        <RevealSection className="w-full">
          <div className="relative w-full h-[60vh] md:h-[75vh] overflow-hidden">
            <img
              src={aboutWaysToShop}
              alt="Ways to shop at Warehouse414"
              className="w-full h-full object-cover transition-transform duration-[8000ms] ease-out hover:scale-110"
              style={{ transformOrigin: "center center" }}
            />
          </div>
        </RevealSection>
      </section>

      {/* Section 3 — Our Process */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <RevealSection>
            <p className="font-body text-xs tracking-[0.3em] uppercase text-muted-foreground mb-4 text-center">
              How We Work
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-center mb-16 text-foreground">
              Our Process
            </h2>
          </RevealSection>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <RevealSection delay={0}>
              <div className="text-center">
                <div className="w-12 h-12 stripe-pattern mx-auto mb-6" />
                <h3 className="font-display text-xl mb-3 text-foreground">sourcing</h3>
                <p className="font-body text-sm text-muted-foreground">
                  We travel to estates, auctions, and private collections to find
                  exceptional pieces with proven provenance.
                </p>
              </div>
            </RevealSection>
            <RevealSection delay={150}>
              <div className="text-center">
                <div className="w-12 h-12 stripe-pattern mx-auto mb-6" />
                <h3 className="font-display text-xl mb-3 text-foreground">documentation</h3>
                <p className="font-body text-sm text-muted-foreground">
                  Each piece is thoroughly photographed and documented, including
                  any restoration work or condition notes.
                </p>
              </div>
            </RevealSection>
            <RevealSection delay={300}>
              <div className="text-center">
                <div className="w-12 h-12 stripe-pattern mx-auto mb-6" />
                <h3 className="font-display text-xl mb-3 text-foreground">delivery</h3>
                <p className="font-body text-sm text-muted-foreground">
                  We work with specialized art and furniture shippers to ensure
                  your piece arrives safely, anywhere in the world.
                </p>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* Section 4 — Buying & Selling */}
      <section className="relative py-32 md:py-48 overflow-hidden">
        <div ref={parallax2.ref} className="absolute inset-0" style={parallax2.style}>
          <img
            src={aboutBuying}
            alt="Warehouse414 art piece"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <RevealSection>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-white mb-6">
              buying &amp; selling
            </h2>
            <p className="font-body text-white/80 max-w-xl mx-auto mb-8">
              Have a piece you'd like to sell or consign? We're always looking
              for exceptional items to add to our collection. Get in touch and
              let's talk.
            </p>
            <Link
              to="/contact"
              className="inline-block font-display text-sm tracking-[0.2em] uppercase border border-white text-white px-8 py-3 hover:bg-white hover:text-black transition-colors"
            >
              Send Email
            </Link>
          </RevealSection>
        </div>
      </section>
    </>
  );
};

export default About;
