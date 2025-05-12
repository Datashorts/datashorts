'use client';

import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { StoreUser } from "@/app/actions/user";
import { useRouter } from "next/navigation";

export default function Hero() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      StoreUser({
        id: user.id,
        email: user.emailAddresses[0].emailAddress,
        name: user.fullName,
      });
    }
  }, [user]);

  const handleGetStarted = () => {
    router.push(user ? "/stats" : "#features");
  };

  return (
    <section className="relative bg-[#121212] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24 flex flex-col-reverse lg:flex-row items-center gap-12">
        {/* Left column (40%) */}
        <div className="w-full lg:w-2/5 space-y-6 text-center lg:text-left">
          {/* ... your CTA, heading, etc. (unchanged) ... */}
          <a
            href="#"
            className="inline-flex items-center rounded-full bg-blue-500/10 px-4 py-1 text-sm font-semibold text-blue-400 ring-1 ring-inset ring-blue-500/20"
          >
            What's new&nbsp;&nbsp;
            {/* chevron icon */}
            <svg
              className="h-4 w-4 shrink-0 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </a>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Natural Language for Data Insights
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl lg:max-w-none mx-auto lg:mx-0">
            Ask questions about your data in plain English and get instant answers.
            No SQL required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6 mt-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="w-full sm:w-auto rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600">
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <button
                onClick={handleGetStarted}
                className="w-full sm:w-auto rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
              >
                Go to Dashboard
              </button>
            </SignedIn>
            <a
              href="#features"
              className="text-sm font-medium text-white hover:underline"
            >
              Learn more →
            </a>
          </div>
        </div>

        {/* Right column (60%) with inline SVG */}
<div className="w-full lg:w-3/5 flex justify-end">
  <div
    className="
      relative
      transform
      w-[32rem]
      sm:w-[48rem]
      md:w-[64rem]
      lg:w-[96rem]
      xl:w-[120rem]
      lg:-mr-32
      lg:translate-x-12
    "
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 300"
      className="w-full h-auto"
    >
      {/* Chart bars */}
      <rect x="70"  y="170" width="40" height="60"  rx="5" fill="#3b82f6" opacity="0.7" />
      <rect x="120" y="150" width="40" height="80"  rx="5" fill="#60a5fa" opacity="0.8" />
      <rect x="170" y="120" width="40" height="110" rx="5" fill="#93c5fd" opacity="0.9" />

      {/* Animated trend line */}
      <path
        d="M70 180 L120 170 L170 140 L210 120"
        stroke="#ffffff"
        strokeWidth="8"
        fill="none"
        strokeDasharray="200"
        strokeDashoffset="200"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="200"
          to="0"
          dur="1.5s"
          begin="0s"
          fill="freeze"
        />
      </path>

      {/* Endpoint dot */}
      <circle cx="210" cy="120" r="10" fill="#ffffff" opacity="0">
        <animate
          attributeName="opacity"
          from="0"
          to="1"
          dur="0.3s"
          begin="1.3s"
          fill="freeze"
        />
      </circle>

      {/* Data Shorts label */}
      <text
        x="240"
        y="170"
        fontFamily="Arial, sans-serif"
        fontSize="48"
        fontWeight="700"
        fill="#ffffff"
      >
        Data
      </text>
      <text
        x="240"
        y="230"
        fontFamily="Arial, sans-serif"
        fontSize="48"
        fontWeight="700"
        fill="#ffffff"
      >
        Shorts
      </text>
    </svg>
  </div>
</div>
      </div>
    </section>
  );
}
