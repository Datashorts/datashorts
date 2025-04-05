import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function SeeInAction() {
  return (
    <section className="py-20 bg-[#121212]" id="demo">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">See DataChat in Action</h2>
          <p className="text-gray-400 max-w-3xl mx-auto">
            Watch how effortlessly you can interact with your database through natural conversation.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="relative h-[300px] md:h-[400px] rounded-lg overflow-hidden">
          <Image src="/test.png" alt="arrow-right" width={580} height={10}/>
            <div className="absolute bottom-2 left-2 text-xs text-gray-400">Photo by Glenn Carstens-Peters</div>
          </div>
          <div className="bg-[#1a1a1a] p-6 rounded-lg border border-gray-800">
            <h3 className="text-xl font-semibold mb-6">Try these sample queries:</h3>
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
                  className="w-full rounded-md border border-gray-700 bg-[#222] px-4 py-2 text-sm"
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
                    className="text-blue-500"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-4">Schedule Full Demo</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function QueryExample({ query, description }: { query: string; description: string }) {
  return (
    <div className="p-4 bg-[#222] rounded-md hover:bg-[#2a2a2a] transition-colors cursor-pointer">
      <p className="font-medium mb-1">{query}</p>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  )
}

