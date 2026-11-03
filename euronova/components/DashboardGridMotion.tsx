"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const cardItemVariants: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const centerpieceItemVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.65,
      ease: "easeOut",
    },
  },
};

interface DashboardGridContainerProps {
  children: ReactNode;
}

export function DashboardGridContainer({ children }: DashboardGridContainerProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {children}
    </motion.div>
  );
}

interface DashboardCardMotionProps {
  children: ReactNode;
  className?: string;
  isCenterpiece?: boolean;
}

export function DashboardCardMotion({
  children,
  className = "",
  isCenterpiece = false,
}: DashboardCardMotionProps) {
  return (
    <motion.div
      variants={isCenterpiece ? centerpieceItemVariants : cardItemVariants}
      whileHover={{ y: -6, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`h-full transform-gpu ${className}`}
    >
      {children}
    </motion.div>
  );
}
