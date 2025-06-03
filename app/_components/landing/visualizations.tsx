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
    <section className="relative py-20 bg-black overflow-hidden">
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Beautiful Data Visualizations
          </h2>
          <p className="text-gray-300 max-w-3xl mx-auto">
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
              className="h-32 bg-white/5 backdrop-blur-sm rounded-md p-4 flex items-end gap-4 justify-center origin-bottom border border-white/10"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={containerVariants}
            >
              {[12, 16, 10, 20, 14].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-6 bg-gradient-to-t from-blue-500 to-purple-500 rounded"
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
              className="h-32 bg-white/5 backdrop-blur-sm rounded-md p-4 flex flex-col gap-2 origin-left border border-white/10"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.8 }}
              style={{ transformOrigin: "left" }}
            >
              <div className="h-6 w-1/3 bg-gradient-to-r from-blue-500 to-purple-500 rounded" />
              <div className="h-4 w-full bg-white/10 rounded" />
              <div className="h-4 w-full bg-white/10 rounded" />
              <div className="h-4 w-full bg-white/10 rounded" />
              <div className="h-4 w-full bg-white/10 rounded" />
            </motion.div>
          </VisualizationCard>

          {/* Custom Dashboards */}
          <VisualizationCard
            title="Custom Dashboards"
            description="Create and save multi-chart dashboards for comprehensive data analysis and periodic monitoring."
          >
            <motion.div
              className="h-32 bg-white/5 backdrop-blur-sm rounded-md p-4 grid grid-cols-2 gap-2 border border-white/10"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={containerVariants}
            >
              {/* small card */}
              <motion.div
                className="bg-white/10 rounded p-2"
                variants={barVariants}
                transition={{ duration: 0.6 }}
              >
                <div className="h-4 w-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded mb-2" />
                <div className="h-2 w-full bg-white/20 rounded mb-1" />
                <div className="h-2 w-full bg-white/20 rounded" />
              </motion.div>

              {/* circle card */}
              <motion.div
                className="bg-white/10 rounded p-2 flex items-center justify-center"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ type: "spring", stiffness: 100, damping: 10 }}
              >
                <div className="h-12 w-12 rounded-full border-4 border-blue-500" />
              </motion.div>

              {/* text cards */}
              <motion.div
                className="bg-white/10 rounded p-2"
                variants={barVariants}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="h-2 w-full bg-white/20 rounded mb-1" />
                <div className="h-2 w-full bg-white/20 rounded" />
              </motion.div>
              <motion.div
                className="bg-white/10 rounded p-2"
                variants={barVariants}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="h-2 w-2/3 bg-white/20 rounded mb-1" />
                <div className="h-4 w-3/4 bg-gradient-to-r from-blue-500 to-purple-500 rounded" />
              </motion.div>
            </motion.div>
          </VisualizationCard>
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
    <div className="group relative bg-black/40 border border-white/10 backdrop-blur-sm p-8 rounded-2xl overflow-hidden transition-all duration-300 hover:bg-black/60 hover:border-white/20">
      {/* Gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Glow effects */}
      <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10">
        <div className="transition-all duration-300 group-hover:scale-105">
          {children}
        </div>
        <h3 className="text-xl font-semibold mt-6 mb-2 text-white group-hover:text-blue-200 transition-colors duration-300">{title}</h3>
        <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300">{description}</p>
      </div>
    </div>
  )
}