const About = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="font-display text-3xl tracking-[0.3em] uppercase text-foreground mb-8">About</h1>
      <div className="space-y-6 text-muted-foreground leading-relaxed">
        <p>
          Warehouse 414 is a curated gallery specializing in vintage and mid-century modern furniture. 
          We source exceptional pieces from around the world, each selected for its design integrity, 
          craftsmanship, and provenance.
        </p>
        <p>
          Our collection spans iconic designers and lesser-known masters, offering everything from 
          statement seating and sculptural lighting to refined case goods and decorative objects.
        </p>
        <p>
          Every piece in our inventory is carefully authenticated, documented, and presented with the 
          reverence it deserves. We believe great design transcends era — and that the right piece can 
          transform a space.
        </p>
      </div>
    </div>
  );
};

export default About;
