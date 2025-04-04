import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function CTA() {
  return (
    <section className="py-20 bg-[#121212]">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
        <div className="relative overflow-hidden rounded-lg">
          <div className="relative z-10 p-8 md:p-12 lg:p-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold">Ready to transform your database experience?</h2>
                <p className="text-gray-400">
                  Join the thousands of data professionals who have simplified their workflow with DataChat.
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700">Get Started Today</Button>
              </div>
              <div className="relative h-[300px] rounded-lg overflow-hidden">
                <Image
                  src="/placeholder.svg?height=300&width=500"
                  alt="Person working with data"
                  fill
                  className="object-cover"
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">Photo by Christin Hume</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

