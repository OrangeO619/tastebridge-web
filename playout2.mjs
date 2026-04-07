import fs from 'fs';
const content = `import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TasteBridge",
  description: "\u4ee5\u5730\u56fe\u4e3a\u6838\u5fc3\u7684\u63a2\u5e97\u8bb0\u5fc6\u5171\u4eab\u5e73\u53f0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    \u003chtml lang="zh-CN" className={\`\${geistSans.variable} \${geistMono.variable} h-full antialiased\`}\u003e
      \u003cbody className="min-h-full flex flex-col"\u003e
        \u003cAuthProvider\u003e{children}\u003c/AuthProvider\u003e
      \u003c/body\u003e
    \u003c/html\u003e
  );
}\n`;
fs.writeFileSync('src/app/layout.tsx', content, 'utf8');
console.log('layout.tsx fixed');
