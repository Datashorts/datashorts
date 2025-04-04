import type React from "react"
import { Sparkles, FileCode, Upload } from "lucide-react"

export default function MoreFeatures() {
  return (
    <section className="py-20 bg-[#121212]">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <FeatureCard
            icon={<Sparkles className="h-6 w-6 text-blue-500" />}
            title="Intelligent Visualizations"
            description="DataChat automatically selects the best visualization format for your data and query type."
          />
          <FeatureCard
            icon={<FileCode className="h-6 w-6 text-blue-500" />}
            title="Live SQL Translation"
            description="Watch your natural language questions transform into optimized database queries in real-time."
          />
          <FeatureCard
            icon={<Upload className="h-6 w-6 text-blue-500" />}
            title="One-Click Exports"
            description="Export your query results in multiple formats including CSV, Excel, and interactive dashboards."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="order-2 lg:order-1">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">Contextual Understanding of Your Data</h2>
              <p className="text-gray-400">
                DataChat doesn&apos;t just execute queries - it understands relationships between tables, data types,
                and common business metrics.
              </p>
              <div className="space-y-4">
                <Feature title="Schema Understanding">
                  Automatically maps relationships between tables without manual configuration.
                </Feature>
                <Feature title="Multi-Query Conversations">
                  Maintains context across multiple queries for deeper data exploration.
                </Feature>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 relative h-[300px] rounded-lg overflow-hidden">
            {/* <Image src="/placeholder.svg?height=300&width=600" alt="Data visualization" fill className="object-cover" /> */}
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-[#1a1a1a] p-6 rounded-lg border border-gray-800">
      <div className="bg-blue-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  )
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-1">
        <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      </div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-gray-400 text-sm">{children}</p>
      </div>
    </div>
  )
}

