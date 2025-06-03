import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function SeeInAction() {
  return (
    <section className="relative py-20 bg-black overflow-hidden" id="demo">
      {/* Stars Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>

      {/* Background gradients */}
      <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl opacity-70" />
      <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl opacity-70" />

      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">See DataShorts in Action</h2>
          <p className="text-gray-300 max-w-3xl mx-auto">
            Watch how effortlessly you can interact with your database through natural conversation.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="relative h-[300px] md:h-[400px] rounded-2xl overflow-hidden bg-black/40 border border-white/10 backdrop-blur-sm">
            <Image 
              src="/test.png" 
              alt="DataShorts Demo" 
              width={580} 
              height={400}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">
              Photo by Glenn Carstens-Peters
            </div>
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
          
          <div className="bg-black/40 border border-white/10 backdrop-blur-sm p-8 rounded-2xl">
            <h3 className="text-xl font-semibold mb-6 text-white">Try these sample queries:</h3>
            <div className="space-y-4">
              <QueryExample
                query="Show me sales trends for the last 6 months"
                description="Visualizes monthly sales data with trend analysis"
              />
              <QueryExample
                query="Find my top 5 customers by revenue"
                description="Identifies highest-value customers with spending analysis"
              />
              <QueryExample
                query="Compare inventory levels across warehouses"
                description="Shows comparative inventory analysis with shortage alerts"
              />
              <div className="relative mt-8">
                <input
                  type="text"
                  placeholder="Try your own query..."
                  className="w-full rounded-md border border-white/20 bg-white/5 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-400"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </div>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 mt-4 border-0">
                Schedule Full Demo
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .stars, .stars2, .stars3 {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: transparent;
        }

        .stars {
          background-image: 
            radial-gradient(2px 2px at 20px 30px, #eee, transparent),
            radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 90px 40px, #eee, transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.5), transparent),
            radial-gradient(2px 2px at 160px 30px, #eee, transparent);
          background-repeat: repeat;
          background-size: 200px 100px;
          animation: zoom 20s infinite;
          opacity: 0.3;
        }

        .stars2 {
          background-image: 
            radial-gradient(1px 1px at 40px 60px, #eee, transparent),
            radial-gradient(1px 1px at 80px 10px, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 120px 50px, #eee, transparent);
          background-repeat: repeat;
          background-size: 250px 120px;
          animation: zoom 25s infinite;
          opacity: 0.2;
        }

        .stars3 {
          background-image: 
            radial-gradient(1px 1px at 60px 20px, #eee, transparent),
            radial-gradient(1px 1px at 100px 80px, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 140px 40px, #eee, transparent);
          background-repeat: repeat;
          background-size: 300px 150px;
          animation: zoom 30s infinite;
          opacity: 0.1;
        }

        @keyframes zoom {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </section>
  )
}

function QueryExample({ query, description }: { query: string; description: string }) {
  return (
    <div className="p-4 bg-white/5 backdrop-blur-sm rounded-md hover:bg-white/10 transition-colors cursor-pointer border border-white/10 group">
      <p className="font-medium mb-1 text-white group-hover:text-blue-200 transition-colors">{query}</p>
      <p className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">{description}</p>
    </div>
  )
}