import type React from "react"

export default function HowItWorks() {
  return (
    <section className="relative py-20 bg-black overflow-hidden" id="how-it-works">
      {/* Stars Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>

      {/* Background gradients */}
      <div className="absolute -top-48 -right-48 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl opacity-70" />
      <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl opacity-70" />

      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">How DataShorts Works</h2>
          <p className="text-gray-300 max-w-3xl mx-auto text-lg">
            From question to insight in seconds - no SQL expertise required.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StepCard
            number={1}
            title="Connect Your Database"
            description="Securely connect PostgreSQL or MongoDB with our simple setup process. No data ever leaves your servers."
            icon={
              <div className="flex gap-2 mt-4">
                <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded">PG</div>
                <div className="bg-green-600 text-white text-xs px-2 py-1 rounded">MDB</div>
              </div>
            }
          />
          <StepCard
            number={2}
            title="Ask Your Question"
            description="Type natural questions like &quot;Show me monthly sales by region&quot; or &quot;Find top customers from last quarter.&quot;"
            icon={<div className="mt-4 bg-white/10 rounded-md p-3 text-sm text-gray-300">Show me monthly sales trends...</div>}
          />
          <StepCard
            number={3}
            title="Get Visualized Results"
            description="Receive instant answers with interactive visualizations, explanations, and options to refine your query."
            icon={
              <div className="mt-4 h-16 bg-white/10 rounded-md p-4 flex items-end gap-2">
                <div className="h-4 w-4 bg-blue-500 rounded"></div>
                <div className="h-6 w-4 bg-blue-500 rounded"></div>
                <div className="h-8 w-4 bg-blue-500 rounded"></div>
                <div className="h-5 w-4 bg-blue-500 rounded"></div>
                <div className="h-7 w-4 bg-blue-500 rounded"></div>
              </div>
            }
          />
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

function StepCard({
  number,
  title,
  description,
  icon,
}: {
  number: number
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="group relative bg-black/40 border border-white/10 backdrop-blur-sm p-8 rounded-2xl overflow-hidden transition-all duration-300 hover:bg-black/60 hover:border-white/20">
      {/* Number badge */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg absolute -top-6 left-8 shadow-lg">
        {number}
      </div>
      
      {/* Gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Glow effects */}
      <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10 pt-4">
        <h3 className="text-2xl font-semibold mb-4 text-white group-hover:text-blue-200 transition-colors duration-300">{title}</h3>
        <p className="text-gray-300 text-lg group-hover:text-gray-200 transition-colors duration-300">{description}</p>
        <div className="transition-all duration-300 group-hover:scale-105">
          {icon}
        </div>
      </div>
    </div>
  )
}