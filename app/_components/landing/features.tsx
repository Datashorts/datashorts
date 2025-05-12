import type React from "react"
import { MessageSquare, Lightbulb, BarChart3, FileText } from "lucide-react"

export default function Features() {
  return (
    <section className="py-20 bg-[#121212]" id="features">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Powerful Features, Simplified Data Access
          </h2>
          <p className="text-gray-400 max-w-3xl mx-auto text-lg">
            Query your data with natural language and get intelligent insights
            without complex SQL knowledge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* notice we now pass the component, not a rendered node */}
          <FeatureCard
            Icon={MessageSquare}
            title="Natural Database Chat"
            description="Chat directly with PostgreSQL and MongoDB databases using conversational language."
          />
          <FeatureCard
            Icon={Lightbulb}
            title="Agentic Intelligence"
            description="AI that asks clarifying questions to refine your prompts for more accurate results."
          />
          <FeatureCard
            Icon={BarChart3}
            title="Interactive Visualizations"
            description="Transform your data into beautiful, interactive graphs and charts instantly."
          />
          <FeatureCard
            Icon={FileText}
            title="Flexible Exports"
            description="Export your results in Excel, CSV, JSON, or PDF formats with a single click."
          />
        </div>
      </div>
    </section>
  )
}

type FeatureCardProps = {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
  description: string
}

function FeatureCard({ Icon, title, description }: FeatureCardProps) {
  return (
    <div
      className={`
        relative
        bg-[#1a1a1a]
        p-6
        rounded-lg
        border border-gray-800
        overflow-visible
        before:absolute before:inset-0 before:rounded-lg
        before:bg-gradient-to-br before:from-blue-500/20 before:to-purple-500/20
        before:blur-xl before:-z-10
        transition-shadow hover:shadow-lg hover:shadow-blue-500/30
      `}
    >
      {/* apply .stroke-dash here */}
      <div className="bg-blue-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-blue-500 stroke-dash" />
      </div>

      <h3 className="text-2xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-lg">{description}</p>
    </div>
  )
}
