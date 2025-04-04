import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function FAQ() {
  return (
    <section className="py-20 bg-[#121212]" id="faq">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-gray-400 max-w-3xl mx-auto">
            Everything you need to know about DataChat and how it can transform your database experience.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="relative h-[400px] rounded-lg overflow-hidden hidden lg:block">
            <Image
              src="/placeholder.svg?height=400&width=500"
              alt="Business person thinking"
              fill
              className="object-cover"
            />
            <div className="absolute bottom-2 left-2 text-xs text-gray-400">Photo by Ben Rosett</div>
          </div>
          <div className="space-y-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-gray-800">
                <AccordionTrigger className="text-left">What databases does DataChat support?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  DataChat currently supports PostgreSQL and MongoDB databases. We&apos;re actively working on adding
                  support for MySQL, SQL Server, and other popular database systems in upcoming releases.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-gray-800">
                <AccordionTrigger className="text-left">How does the agentic questioning work?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Our AI system analyzes your initial query and identifies any ambiguities or missing information. It
                  then asks targeted follow-up questions to clarify your intent, ensuring you get the most accurate and
                  relevant results from your database.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-gray-800">
                <AccordionTrigger className="text-left">Is my data secure?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Absolutely. DataChat is designed with security as a top priority. Your data never leaves your servers
                  - our system connects securely to your database and processes queries within your infrastructure. We
                  don't store or have access to your data.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border-gray-800">
                <AccordionTrigger className="text-left">Do I need SQL knowledge to use DataChat?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  No SQL knowledge is required. That's the beauty of DataChat - it translates your natural language
                  questions into optimized database queries automatically. Of course, if you do know SQL, you can still
                  review and modify the generated queries.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border-gray-800">
                <AccordionTrigger className="text-left">How accurate are the AI-generated responses?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  DataChat achieves high accuracy through its contextual understanding of your database schema and
                  business metrics. The system continuously improves through feedback and usage. For complex queries,
                  the agentic questioning feature ensures clarity and precision.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="border-gray-800">
                <AccordionTrigger className="text-left">Can I try DataChat before purchasing?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes, we offer a free trial that allows you to connect to your database and experience the full
                  functionality of DataChat. You can schedule a demo with our team who will help you set up and get the
                  most out of your trial period.
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="mt-8 p-6 bg-[#1e2132] rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
              <p className="text-gray-400 mb-4">
                Our team is ready to help you with any questions about DataChat implementation, security, or features.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="bg-blue-600 hover:bg-blue-700">Contact Support</Button>
                <Button variant="outline" className="border-gray-700 hover:bg-gray-800">
                  Read Documentation
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

