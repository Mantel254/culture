
import { Link } from "react-router-dom";
import { communities } from "@/data/communities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, MapPin, ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import AiAssistantWidget from "@/utils/AiAssistantWidget";

const Communities = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredCommunities = communities.filter(community =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.language.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[40vh] gradient-hero overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="container relative z-10 px-4 mx-auto h-full flex flex-col justify-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Kenyan Communities
          </h1>
          <p className="text-xl text-white/90 max-w-3xl">
            Explore the rich cultural diversity of Kenya's ethnic communities
          </p>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="py-12 bg-muted/30">
        <div className="container px-4 mx-auto">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search communities by name, region, or language..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Communities Grid */}
      <section className="py-16">
        <div className="container px-4 mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Discover {filteredCommunities.length} Communities
            </h2>
            <p className="text-lg text-muted-foreground">
              Click on any community to learn about their traditions, beliefs, and practices
            </p>
          </div>

          {filteredCommunities.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">No communities found matching your search</p>
              <Button 
                variant="outline" 
                onClick={() => setSearchQuery("")}
                className="mt-4"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCommunities.map((community) => (
                <Link 
                  key={community.id} 
                  to={`/community/${community.id}`}
                  className="group block"
                >
                  <Card className="h-full overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={community.imageUrl || "/placeholder.svg"}
                        alt={community.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md">
                        {community.region}
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                        {community.name}
                      </h3>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>Population: {community.population}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>Language: {community.language}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-6 line-clamp-3">
                        {community.origin.substring(0, 150)}...
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <Button variant="outline" className="group-hover:bg-primary group-hover:text-white transition-colors">
                          Explore
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {community.subtribes.length} subtribes
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <AiAssistantWidget />
    </div>
  );
};

export default Communities;