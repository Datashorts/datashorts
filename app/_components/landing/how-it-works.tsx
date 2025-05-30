import type React from "react"
export default function HowItWorks() {
  return (
    <section className="py-20 bg-[#121212]" id="how-it-works">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">How DataChat Works</h2>
          <p className="text-gray-400 max-w-3xl mx-auto text-lg">
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
            description="Type natural questions ILIKE &quot;Show me monthly sales by region&quot; or &quot;Find top customers from last quarter.&quot;"
            icon={<div className="mt-4 bg-[#222] rounded-md p-3 text-sm">Show me monthly sales trends...</div>}
          />
          <StepCard
            number={3}
            title="Get Visualized Results"
            description="Receive instant answers with interactive visualizations, explanations, and options to refine your query."
            icon={
              <div className="mt-4 h-16 bg-[#222] rounded-md p-4 flex items-end gap-2">
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
    <div className="bg-[#1a1a1a] p-6 rounded-lg border border-gray-800 relative">
      <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold absolute -top-5 left-6">
        {number}
      </div>
      <div className="pt-4">
        <h3 className="text-2xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-400 text-lg">{description}</p>
        {icon}
      </div>
    </div>
  )
}

