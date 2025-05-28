'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState, FC } from 'react';
import { FiDollarSign, FiEye, FiPlay, FiSearch } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import Image from 'next/image';

interface Feature {
  id: number;
  callout: string;
  title: string;
  description: string;
  contentPosition: 'l' | 'r';
  Icon: IconType;
  image: string;
}

const features: Feature[] = [
  {
    id: 1,
    callout: "It's Easy to Get Started",
    title: "Connect in seconds",
    description:
      "Just paste your database connection string, choose your DB type, and you're in. No setup headaches, no manual configs—just pure productivity.",
    contentPosition: 'r',
    Icon: FiEye,
    image: '/addconnection.png',
  },
  {
    id: 2,
    callout: 'Your thoughts, translated.',
    title: "Natural Language to SQL",
    description:
      'Type what you need in plain English—“show all published forms by users”—and DataChat gives you optimized, production-ready SQL instantly.',
    contentPosition: 'l',
    Icon: FiSearch,
    image: '/sql_query.jpeg',
  },
  {
    id: 3,
    callout: 'From tables to charts—automatically.',
    title: 'Auto-Generated Visualizations',
    description:
      'Whether it’s column distribution or schema stats, DataChat instantly transforms your query results into interactive visuals like pie charts.',
    contentPosition: 'r',
    Icon: FiDollarSign,
    image: '/pie_chart.jpeg',
  },
  {
    id: 4,
    callout: 'Generate Dashboards',
    title: 'Bookmark your queries',
    description:
      'Bookmark your visualizations and queries to create a dashboard that auto-updates in real-time',
    contentPosition: 'l',
    Icon: FiDollarSign,
    image: '/bookmark.png',
  },
];

const Example: FC = () => {
  return (
    <>
      <div className="text-center my-20">
        <h2 className="text-4xl md:text-5xl font-bold text-white">How DataShorts Works</h2>
        <p className="text-gray-400 text-lg mt-4 max-w-xl mx-auto">
          From connection to visualization—understand your data in seconds.
        </p>
      </div>
      <SwapColumnFeatures />
    </>
  );
};

const SwapColumnFeatures: FC = () => {
  const [featureInView, setFeatureInView] = useState<Feature>(features[0]);

  return (
    <section className="relative mx-auto max-w-7xl">
      <SlidingFeatureDisplay featureInView={featureInView} />
      <div className="-mt-[100vh] hidden md:block" />
      {features.map((s) => (
        <Content
          key={s.id}
          feature={s}
          setFeatureInView={setFeatureInView}
        />
      ))}
    </section>
  );
};

interface SlidingFeatureDisplayProps {
  featureInView: Feature;
}

const SlidingFeatureDisplay: FC<SlidingFeatureDisplayProps> = ({ featureInView }) => {
  return (
    <div
      style={{
        justifyContent:
          featureInView.contentPosition === 'l' ? 'flex-end' : 'flex-start',
      }}
      className="pointer-events-none sticky top-0 z-10 hidden h-screen w-full items-center justify-center md:flex"
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="h-fit w-3/5 rounded-xl p-8"
      >
        <ExampleFeature feature={featureInView} />
      </motion.div>
    </div>
  );
};

interface ContentProps {
  feature: Feature;
  setFeatureInView: (f: Feature) => void;
}

const Content: FC<ContentProps> = ({ feature, setFeatureInView }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-150px' });

  useEffect(() => {
    if (isInView) {
      setFeatureInView(feature);
    }
  }, [isInView, feature, setFeatureInView]);

  return (
    <section
      ref={ref}
      className="relative z-0 flex h-fit md:h-screen"
      style={{
        justifyContent:
          feature.contentPosition === 'l' ? 'flex-start' : 'flex-end',
      }}
    >
      <div className="grid h-full w-full place-content-center px-4 py-12 md:w-2/5 md:px-8 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <span className="rounded-full bg-indigo-600 px-2 py-1.5 text-xs font-medium text-white">
            {feature.callout}
          </span>
          <p className="my-3 text-5xl font-bold text-white">{feature.title}</p>
          <p className="text-slate-400">{feature.description}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="mt-8 block md:hidden"
        >
          <ExampleFeature feature={feature} />
        </motion.div>
      </div>
    </section>
  );
};

interface ExampleFeatureProps {
  feature: Feature;
}

const ExampleFeature: FC<ExampleFeatureProps> = ({ feature }) => {
  const { Icon, image } = feature;
  return (
    <div className="relative min-h-[28rem] w-full rounded-xl bg-slate-800 shadow-xl overflow-hidden">
      <div className="flex w-full gap-1.5 rounded-t-xl bg-slate-900 p-3 z-10 relative">
        <div className="h-3 w-3 rounded-full bg-red-500" />
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
        <div className="h-3 w-3 rounded-full bg-green-500" />
      </div>
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={feature.title}
          fill
          className="object-contain"
        />
      </div>
      <div className="relative p-4 z-10"></div>
    </div>
  );
};

export default Example;
