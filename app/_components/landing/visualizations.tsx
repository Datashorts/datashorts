import type React from "react"

export default function Visualizations() {
  return (
    <section className="py-20 bg-[#121212]">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Beautiful Data Visualizations</h2>
          <p className="text-gray-400 max-w-3xl mx-auto">
            Transform complex queries into stunning interactive charts and graphs with a single conversation.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <VisualizationCard
            title="Dynamic Charts"
            description="Interactive bar, line, and pie charts that respond to your questions about trends and comparisons."
            image={
              <div className="h-32 bg-[#2a2a2a] rounded-md p-4 flex items-end gap-4 justify-center">
                <div className="h-12 w-6 bg-blue-500 rounded"></div>
                <div className="h-16 w-6 bg-blue-500 rounded"></div>
                <div className="h-10 w-6 bg-blue-500 rounded"></div>
                <div className="h-20 w-6 bg-blue-500 rounded"></div>
                <div className="h-14 w-6 bg-blue-500 rounded"></div>
              </div>
            }
          />
          <VisualizationCard
            title="Smart Tables"
            description="Filterable and sortable tables with color-coded highlights for easy data analysis and pattern identification."
            image={
              <div className="h-32 bg-[#2a2a2a] rounded-md p-4 flex flex-col gap-2">
                <div className="h-6 w-1/3 bg-blue-500 rounded"></div>
                <div className="h-4 w-full bg-[#3a3a3a] rounded"></div>
                <div className="h-4 w-full bg-[#3a3a3a] rounded"></div>
                <div className="h-4 w-full bg-[#3a3a3a] rounded"></div>
                <div className="h-4 w-full bg-[#3a3a3a] rounded"></div>
              </div>
            }
          />
          <VisualizationCard
            title="Custom Dashboards"
            description="Create and save multi-chart dashboards for comprehensive data analysis and periodic monitoring."
            image={
              <div className="h-32 bg-[#2a2a2a] rounded-md p-4 grid grid-cols-2 gap-2">
                <div className="bg-[#3a3a3a] rounded p-2">
                  <div className="h-4 w-4 bg-blue-500 rounded mb-2"></div>
                  <div className="h-2 w-full bg-[#4a4a4a] rounded mb-1"></div>
                  <div className="h-2 w-full bg-[#4a4a4a] rounded"></div>
                </div>
                <div className="bg-[#3a3a3a] rounded p-2 flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full border-4 border-blue-500"></div>
                </div>
                <div className="bg-[#3a3a3a] rounded p-2">
                  <div className="h-2 w-full bg-[#4a4a4a] rounded mb-1"></div>
                  <div className="h-2 w-full bg-[#4a4a4a] rounded"></div>
                </div>
                <div className="bg-[#3a3a3a] rounded p-2">
                  <div className="h-2 w-2/3 bg-[#4a4a4a] rounded mb-1"></div>
                  <div className="h-4 w-3/4 bg-blue-500 rounded"></div>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </section>
  )
}

function VisualizationCard({
  title,
  description,
  image,
}: {
  title: string
  description: string
  image: React.ReactNode
}) {
  return (
    <div className="bg-[#1a1a1a] p-6 rounded-lg border border-gray-800">
      {image}
      <h3 className="text-xl font-semibold mt-6 mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  )
}

