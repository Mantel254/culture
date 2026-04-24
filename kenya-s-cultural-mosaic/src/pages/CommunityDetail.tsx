
import { useParams, Link } from "react-router-dom";
import { communities } from "@/data/communities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Users,
  MapPin,
  Languages,
  Mountain,
  Sparkles,
  GitBranch,
  Leaf,
  Play,
  ExternalLink,
} from "lucide-react";

import AiAssistantWidget from "@/utils/AiAssistantWidget";

const CommunityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const community = communities.find((c) => c.id === id);

  if (!community) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Community Not Found</h1>
          <Link to="/communities">
            <Button>Back to Communities</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      id="page-community-detail"
      data-community-id={community.id}
      data-community-name={community.name}
      className="min-h-screen bg-background"
    >
      {/* Hero Section */}
      <section
        id="community-hero"
        className="relative h-[50vh] gradient-hero overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <div className="container relative z-10 px-4 mx-auto h-full flex flex-col justify-end pb-12">
          <Link to="/communities">
            <Button
              id="back-to-communities-btn"
              variant="ghost"
              className="text-white hover:bg-white/10 mb-6 w-fit"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Communities
            </Button>
          </Link>

          <h1
            id="community-title"
            className="text-5xl md:text-7xl font-bold text-white mb-4"
          >
            {community.name}
          </h1>

          <div className="flex flex-wrap gap-6 text-white/90">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>{community.population}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span>{community.region}</span>
            </div>
            <div className="flex items-center gap-2">
              <Languages className="w-5 h-5" />
              <span>{community.language}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section id="community-content" className="py-16">
        <div className="container px-4 mx-auto max-w-6xl">
          <Tabs defaultValue="origin" className="w-full">
            <TabsList
              id="community-tabs"
              className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8 gap-2"
            >
              <TabsTrigger id="tab-origin" value="origin">
                Origin
              </TabsTrigger>
              <TabsTrigger id="tab-beliefs" value="beliefs">
                Beliefs
              </TabsTrigger>
              <TabsTrigger id="tab-subtribes" value="subtribes">
                Subtribes
              </TabsTrigger>
              <TabsTrigger id="tab-practices" value="practices">
                Practices
              </TabsTrigger>
            </TabsList>

            {/* ORIGIN */}
            <TabsContent id="content-origin" value="origin">
              <Card className="p-8">
                <p id="community-origin-text">{community.origin}</p>
              </Card>
            </TabsContent>

            {/* BELIEFS */}
            <TabsContent id="content-beliefs" value="beliefs">
              <Card className="p-8 space-y-6">
                {community.beliefs.map((belief, index) => {
                  const isString = typeof belief === 'string';
                  const title = isString ? belief : belief.belief;
                  const desc = isString ? '' : belief.description;
                  return (
                    <div
                      key={index}
                      id={`belief-${index}`}
                      data-belief-name={title}
                      className="p-6 rounded-lg gradient-card border-l-4 border-accent"
                    >
                      <h3 className="text-xl font-semibold">{title}</h3>
                      <p className="mt-4">{desc}</p>
                    </div>
                  );
                })}
              </Card>
            </TabsContent>

            {/* SUBTRIBES */}
            <TabsContent id="content-subtribes" value="subtribes">
              <Card className="p-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {community.subtribes.map((subtribe, index) => (
                  <div
                    key={index}
                    id={`subtribe-${index}`}
                    data-subtribe-name={subtribe}
                    className="p-4 rounded-lg gradient-card text-center"
                  >
                    {subtribe}
                  </div>
                ))}
              </Card>
            </TabsContent>

            {/* PRACTICES */}
            <TabsContent id="content-practices" value="practices">
              <Card className="p-8 space-y-12">
                {community.practices.map((practice, index) => {
                  const isString = typeof practice === 'string';
                  const title = isString ? practice : practice.practice;
                  const desc = isString ? '' : practice.description;
                  const img = isString ? '' : practice.imageUrl;
                  return (
                    <div
                      key={index}
                      id={`practice-${index}`}
                      data-practice-name={title}
                      className="p-6 rounded-lg gradient-card border-l-4 border-primary"
                    >
                      <div className={`flex flex-col md:flex-row items-center gap-6 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                        {img && (
                          <div className="md:w-1/2 w-full">
                            <img
                              src={img}
                              alt={title}
                              className="w-full h-56 md:h-64 object-cover rounded-md"
                            />
                          </div>
                        )}

                        <div className="md:w-1/2 w-full">
                          <h3 className="text-xl font-semibold mb-3">{title}</h3>
                          <p className="mb-4">{desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <AiAssistantWidget />
    </div>
  );
};

export default CommunityDetail;
