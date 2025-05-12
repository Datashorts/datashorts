"use client"
import React from "react"
import { motion, Variants } from "framer-motion"

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
}

const barVariants: Variants = {
  hidden: { scaleY: 0 },
  visible: { scaleY: 1 },
}

export default function Visualizations() {
  return (
    <section className="py-20 bg-[#121212]">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Beautiful Data Visualizations
          </h2>
          <p className="text-gray-400 max-w-3xl mx-auto">
            Transform complex queries into stunning interactive charts and graphs with a single conversation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Dynamic Charts */}
          <VisualizationCard
            title="Dynamic Charts"
            description="Interactive bar, line, and pie charts that respond to your questions about trends and comparisons."
          >
            <motion.div
              className="h-32 bg-[#2a2a2a] rounded-md p-4 flex items-end gap-4 justify-center origin-bottom"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={containerVariants}
            >
              {[12, 16, 10, 20, 14].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-6 bg-blue-500 rounded"
                  style={{ height: `${h * 0.25}rem`, transformOrigin: "bottom" }}
                  variants={barVariants}
                  transition={{ duration: 0.8 }}
                />
              ))}
            </motion.div>
          </VisualizationCard>

          {/* Smart Tables */}
          <VisualizationCard
            title="Smart Tables"
            description="Filterable and sortable tables with color-coded highlights for easy data analysis and pattern identification."
          >
            <motion.div
              className="h-32 bg-[#2a2a2a] rounded-md p-4 flex flex-col gap-2 origin-left"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.8 }}
              style={{ transformOrigin: "left" }}
            >
              <div className="h-6 w-1/3 bg-blue-500 rounded" />
              <div className="h-4 w-full bg-[#3a3a3a] rounded" />
              <div className="h-4 w-full bg-[#3a3a3a] rounded" />
              <div className="h-4 w-full bg-[#3a3a3a] rounded" />
              <div className="h-4 w-full bg-[#3a3a3a] rounded" />
            </motion.div>
          </VisualizationCard>

          {/* Custom Dashboards */}
          <VisualizationCard
            title="Custom Dashboards"
            description="Create and save multi-chart dashboards for comprehensive data analysis and periodic monitoring."
          >
            <motion.div
              className="h-32 bg-[#2a2a2a] rounded-md p-4 grid grid-cols-2 gap-2"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={containerVariants}
            >
              {/* small card */}
              <motion.div
                className="bg-[#3a3a3a] rounded p-2"
                variants={barVariants}
                transition={{ duration: 0.6 }}
              >
                <div className="h-4 w-4 bg-blue-500 rounded mb-2" />
                <div className="h-2 w-full bg-[#4a4a4a] rounded mb-1" />
                <div className="h-2 w-full bg-[#4a4a4a] rounded" />
              </motion.div>

              {/* circle card */}
              <motion.div
                className="bg-[#3a3a3a] rounded p-2 flex items-center justify-center"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ type: "spring", stiffness: 100, damping: 10 }}
              >
                <div className="h-12 w-12 rounded-full border-4 border-blue-500" />
              </motion.div>

              {/* text cards */}
              <motion.div
                className="bg-[#3a3a3a] rounded p-2"
                variants={barVariants}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="h-2 w-full bg-[#4a4a4a] rounded mb-1" />
                <div className="h-2 w-full bg-[#4a4a4a] rounded" />
              </motion.div>
              <motion.div
                className="bg-[#3a3a3a] rounded p-2"
                variants={barVariants}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="h-2 w-2/3 bg-[#4a4a4a] rounded mb-1" />
                <div className="h-4 w-3/4 bg-blue-500 rounded" />
              </motion.div>
            </motion.div>
          </VisualizationCard>
        </div>
      </div>
    </section>
  )
}

type VisualizationCardProps = {
  title: string
  description: string
  children: React.ReactNode
}

function VisualizationCard({
  title,
  description,
  children,
}: VisualizationCardProps) {
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
      {children}
      <h3 className="text-xl font-semibold mt-6 mb-2 text-white">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  )
}
