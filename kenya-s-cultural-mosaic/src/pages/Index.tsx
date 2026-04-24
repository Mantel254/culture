import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe2, Users, BookOpen } from "lucide-react";
import AiAssistantWidget from "@/utils/AiAssistantWidget";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        id="home-hero"
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 gradient-hero opacity-90" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,...')] opacity-20" />

        <div className="container relative z-10 px-4 mx-auto text-center animate-fade-in-up">
          <h1
            id="home-title"
            className="mb-6 text-5xl md:text-7xl font-bold text-white drop-shadow-lg"
          >
            Discover Kenya's
            <span className="block mt-2 text-cultural-gold">
              Cultural Heritage
            </span>
          </h1>

          <p
            id="home-subtitle"
            className="mb-12 text-xl md:text-2xl text-white/90 max-w-3xl mx-auto font-light"
          >
            Explore the rich tapestry of traditions, beliefs, and practices that
            define Kenya's diverse communities
          </p>

          <Link to="/communities">
            <Button
              id="explore-communities-btn"
              size="lg"
              className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90 shadow-elevated group transition-smooth"
            >
              Explore Communities
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-smooth" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Introduction Section */}
      <section id="home-introduction" className="py-24 bg-background">
        <div className="container px-4 mx-auto">
          <div className="max-w-4xl mx-auto text-center mb-16 animate-fade-in-up">
            <h2
              id="nation-diversity-title"
              className="text-4xl md:text-5xl font-bold mb-6 text-foreground"
            >
              A Nation of Diversity
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Kenya is home to over 40 ethnic communities, each with unique
              languages, customs, and traditions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature: Rich Heritage */}
            <div
              id="feature-rich-heritage"
              className="p-8 rounded-2xl gradient-card shadow-card hover:shadow-elevated transition-smooth animate-scale-in"
            >
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-6 shadow-cultural">
                <Globe2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">
                Rich Heritage
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                From the highlands to the coast, each community carries centuries
                of wisdom.
              </p>
            </div>

            {/* Feature: Diverse Practices */}
            <div
              id="feature-diverse-practices"
              className="p-8 rounded-2xl gradient-card shadow-card hover:shadow-elevated transition-smooth animate-scale-in"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="w-16 h-16 bg-accent rounded-xl flex items-center justify-center mb-6 shadow-cultural">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">
                Diverse Practices
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Experience unique ceremonies, music, art, and customs.
              </p>
            </div>

            {/* Feature: Living History */}
            <div
              id="feature-living-history"
              className="p-8 rounded-2xl gradient-card shadow-card hover:shadow-elevated transition-smooth animate-scale-in"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center mb-6 shadow-cultural">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">
                Living History
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Discover origin stories and migration paths that shape identity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cultural Significance Section */}
      <section
        id="cultural-significance"
        className="py-24 bg-muted/30"
      >
        <div className="container px-4 mx-auto">
          <div className="max-w-4xl mx-auto">
            <h2
              id="why-culture-matters"
              className="text-4xl md:text-5xl font-bold mb-8 text-center text-foreground"
            >
              Why Cultural Knowledge Matters
            </h2>

            <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
              <p>
                Understanding Kenya's cultural diversity is essential for
                fostering national unity.
              </p>
            </div>

            <div className="mt-12 text-center">
              <Link to="/communities">
                <Button
                  id="explore-top-communities-btn"
                  size="lg"
                  className="gradient-hero text-white shadow-cultural hover:shadow-elevated transition-smooth"
                >
                  Explore Top 10 Communities
                  <ArrowRight className="ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <AiAssistantWidget />
    </div>
  );
};

export default Index;
