"use client";
import { AnimatePresence, motion } from "framer-motion";
import React, { useState, FC } from "react";
import { FiPlus } from "react-icons/fi";
import useMeasure from "react-use-measure";

export const TabsFAQ: FC = () => {
  const [selected, setSelected] = useState<string>(TABS[0]);

  return (
    <section className="relative overflow-hidden bg-black px-4 py-12 text-white" id="faq">
      {/* Stars Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>

      {/* Background gradients */}
      <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl opacity-70" />
      <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl opacity-70" />

      <div className="relative z-10">
        <Heading />
        <Tabs selected={selected} setSelected={setSelected} />
        <Questions selected={selected} />
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
  );
};

const Heading: FC = () => {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center">
      <span className="mb-8 text-blue-400 font-medium">Let's answer some questions</span>
      <span className="mb-8 text-5xl font-bold">FAQs</span>
    </div>
  );
};

interface TabsProps {
  selected: string;
  setSelected: (tab: string) => void;
}

const Tabs: FC<TabsProps> = ({ selected, setSelected }) => {
  return (
    <div className="relative z-10 flex flex-wrap items-center justify-center gap-4">
      {TABS.map((tab) => (
        <button
          onClick={() => setSelected(tab)}
          className={`relative overflow-hidden whitespace-nowrap rounded-md border-[1px] px-3 py-1.5 text-sm font-medium transition-colors duration-500 backdrop-blur-sm ${
            selected === tab
              ? "border-blue-500 text-white bg-blue-500/20"
              : "border-white/30 bg-white/5 text-gray-400 hover:border-white/50"
          }`}
          key={tab}
        >
          <span className="relative z-10">{tab}</span>
          <AnimatePresence>
            {selected === tab && (
              <motion.span
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                exit={{ y: "100%" }}
                transition={{
                  duration: 0.5,
                  ease: "backIn",
                }}
                className="absolute inset-0 z-0 bg-gradient-to-r from-blue-600 to-purple-600"
              />
            )}
          </AnimatePresence>
        </button>
      ))}
    </div>
  );
};

interface QuestionsProps {
  selected: string;
}

const Questions: FC<QuestionsProps> = ({ selected }) => {
  return (
    <div className="mx-auto mt-12 max-w-3xl">
      <AnimatePresence mode="wait">
        {Object.entries(QUESTIONS).map(([tab, questions]) => {
          return selected === tab ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5, ease: "backIn" }}
              className="space-y-4"
              key={tab}
            >
              {questions.map((q, idx) => (
                <Question key={idx} question={q.question} answer={q.answer} />
              ))}
            </motion.div>
          ) : null;
        })}
      </AnimatePresence>
    </div>
  );
};

interface QuestionProps {
  question: string;
  answer: string;
}

const Question: FC<QuestionProps> = ({ question, answer }) => {
  const [ref, { height }] = useMeasure();
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      animate={open ? "open" : "closed"}
      className={`rounded-xl border-[1px] border-white/20 backdrop-blur-sm px-4 transition-colors ${
        open ? "bg-white/10" : "bg-white/5"
      }`}
    >
      <button
        onClick={() => setOpen((pv) => !pv)}
        className="flex w-full items-center justify-between gap-4 py-4"
      >
        <span
          className={`text-left text-lg font-medium transition-colors ${
            open ? "text-white" : "text-gray-300"
          }`}
        >
          {question}
        </span>
        <motion.span
          variants={{
            open: { rotate: "45deg" },
            closed: { rotate: "0deg" },
          }}
        >
          <FiPlus
            className={`text-2xl transition-colors ${
              open ? "text-white" : "text-gray-400"
            }`}
          />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? height : "0px", marginBottom: open ? "24px" : "0px" }}
        className="overflow-hidden text-gray-300"
      >
        <p ref={ref}>{answer}</p>
      </motion.div>
    </motion.div>
  );
};

const TABS: string[] = ["General", "DataShorts", "Technical", "Billing"];

const QUESTIONS: Record<string, QuestionProps[]> = {
  General: [
    {
      question: "What is DataShorts?",
      answer: "DataShorts is a platform that allows you to ask natural language questions and receive instant SQL queries and visualizations in return. No SQL knowledge required.",
    },
    {
      question: "Who is DataShorts for?",
      answer: "DataShorts is for non-technical teams, analysts, and anyone who needs quick insights from their database without writing queries manually.",
    },
  ],
  DataShorts: [
    {
      question: "How do I connect my database?",
      answer: "You can securely connect your PostgreSQL or MongoDB by pasting your connection string. Data never leaves your environment.",
    },
    {
      question: "Can I ask follow-up questions?",
      answer: "Yes! DataShorts keeps track of your session context, allowing you to have natural, multi-turn conversations with your data.",
    },
    {
      question: "What kind of visualizations are supported?",
      answer: "We support bar charts, pie charts, line graphs, tables, and more. DataShorts intelligently chooses the best one for your question.",
    },
  ],
  Technical: [
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use end-to-end encryption and never store your data unless explicitly permitted."
    },
    {
      question: "Do you support all SQL dialects?",
      answer: "Currently, we support PostgreSQL and MongoDB with more SQL dialects coming soon."
    },
    {
      question: "Does DataShorts require a browser extension?",
      answer: "No. DataShorts is fully web-based and requires no installation."
    }
  ],
  Billing: [
    {
      question: "Is there a free trial?",
      answer: "Yes, we offer a 14-day free trial with full access to all features."
    },
    {
      question: "What happens after the trial ends?",
      answer: "You'll be asked to upgrade to a paid plan to continue accessing premium features."
    },
    {
      question: "Do you offer student or team discounts?",
      answer: "Yes! Contact our support team to learn more about available discounts."
    }
  ]
};