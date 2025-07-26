"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Shield, Lock, Key, Fingerprint, RefreshCw, Globe, Check, ChevronRight, Star, Clock, AlertTriangle, Plus, Download, FileText, Search, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useTheme } from "@/app/providers";
import { useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import PasswordGenerator from "@/components/ui/PasswordGenerator";

// Copy icon component - used in dashboard preview
function Copy(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme();

  // Add a ref for the demo section
  const demoRef = useRef<HTMLDivElement>(null);

  const handleViewDemo = () => {
    if (demoRef.current) {
      demoRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const features = [
    {
      icon: Shield,
      title: "Zero-Knowledge Encryption",
      description: "Your data is encrypted on your device. We never see your passwords.",
    },
    {
      icon: Key,
      title: "Secure Password Generator",
      description: "Create strong, unique passwords for all your accounts with one click.",
    },
    {
      icon: Fingerprint,
      title: "Biometric Authentication",
      description: "Quickly access your vault with fingerprint or face recognition.",
    },
    {
      icon: RefreshCw,
      title: "Automatic Syncing",
      description: "Your credentials sync automatically across all your devices.",
    },
    {
      icon: Globe,
      title: "Cross-Platform Access",
      description: "Available on desktop, mobile, and as a browser extension.",
    },
    {
      icon: Lock,
      title: "Two-Factor Authentication",
      description: "Built-in TOTP code generator for added security.",
    },
  ];

  const testimonials = [
    {
      quote: "Whisperrauth app has completely transformed how I manage my online security. I finally feel safe online.",
      name: "Sarah Johnson",
      role: "Software Developer",
      stars: 5,
    },
    {
      quote: "The best password manager I've used. Simple, secure, and works everywhere I need it to.",
      name: "Michael Chen",
      role: "Security Consultant",
      stars: 5,
    },
    {
      quote: "I was hesitant to use a password manager, but Whisperrauth made it so easy. Now I can't imagine life without it.",
      name: "Elena Rodriguez",
      role: "Digital Marketer",
      stars: 5,
    },
  ];

  const faqs = [
    {
      question: "Is Whisperrauth really secure?",
      answer: "Yes, Whisperrauth uses zero-knowledge encryption, meaning your data is encrypted before it leaves your device. We never have access to your master password or any of your stored credentials.",
    },
    {
      question: "What happens if I forget my master password?",
      answer: "For security reasons, we cannot recover your master password. However, Whisperrauth offers emergency recovery options that you can set up in advance.",
    },
    {
      question: "Can I use Whisperrauth on all my devices?",
      answer: "Yes, Whisperrauth is available on Windows, macOS, Linux, iOS, and Android. Your data syncs automatically across all your devices.",
    },
    {
      question: "Is Whisperrauth free to use?",
      answer: "Whisperrauth offers a free tier with essential features. Premium plans with advanced features start at $2.99/month.",
    },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Use Navbar component instead of Header */}
      <Navbar />

       {/* Hero Section - Adjust padding to account for navbar */}
       <div className="relative py-32 md:py-40 px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
         <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_25%_at_50%_25%,var(--tw-gradient-from)_0%,var(--tw-gradient-to)_100%)] from-primary/20 to-transparent dark:from-primary/10"></div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 max-w-4xl">
          Your Passwords. <span className="text-primary">Protected</span>. Everywhere.
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mb-10">
          Secure, simple password management for individuals and teams. Store unlimited passwords, generate strong credentials, and autofill with ease.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Get Started Free <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" onClick={handleViewDemo}>
            View Demo
          </Button>
        </div>

        {/* Dashboard Preview */}
        <div ref={demoRef} className="w-full max-w-5xl rounded-lg overflow-hidden shadow-2xl border dark:border-gray-800 bg-background relative">
          {/* Dashboard Header */}
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">PM</span>
              </div>
              <h2 className="font-semibold text-lg">Whisperrauth</h2>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-accent">
                <Search className="h-4 w-4" />
              </button>
              <button className="p-2 rounded-full hover:bg-accent">
                <User className="h-4 w-4" />
              </button>
              <button className="p-2 rounded-full hover:bg-accent">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
              <p className="text-muted-foreground text-sm">Welcome back! Here's your security overview.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Total Credentials</p>
                    <p className="text-xl font-bold">24</p>
                  </div>
                  <Key className="h-6 w-6 text-blue-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">TOTP Codes</p>
                    <p className="text-xl font-bold">8</p>
                  </div>
                  <Shield className="h-6 w-6 text-green-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Recent Activity</p>
                    <p className="text-xl font-bold">3</p>
                  </div>
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Security Alerts</p>
                    <p className="text-xl font-bold">1</p>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" className="h-auto py-2 justify-start gap-2">
                    <Plus className="h-3 w-3" />
                    Add Credential
                  </Button>
                  <Button size="sm" variant="outline" className="h-auto py-2 justify-start gap-2">
                    <Download className="h-3 w-3" />
                    Backup
                  </Button>
                  <Button size="sm" variant="outline" className="h-auto py-2 justify-start gap-2">
                    <FileText className="h-3 w-3" />
                    Logs
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Items */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Recent Items</h3>
                <div className="space-y-2">
                  {[
                    { name: "GitHub", username: "john@example.com", icon: "🐙" },
                    { name: "Gmail", username: "john.doe@gmail.com", icon: "📧" },
                    { name: "AWS Console", username: "johndoe", icon: "☁️" }
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="text-lg">{item.icon}</div>
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.username}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Security-First Password Management</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Designed with your security and privacy as the top priority.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature) => (
            <div key={feature.title} className="bg-card p-6 rounded-lg border transition-all duration-200 hover:shadow-md">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Section */}
      <div className="bg-card py-20 px-4 sm:px-6 lg:px-8 border-y">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Your Security Is Our Priority</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              With industry-leading encryption and rigorous security practices.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-5">
                <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AES-256 Encryption</h3>
              <p className="text-muted-foreground">Military-grade encryption that protects your data at rest and in transit.</p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-5">
                <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">SOC 2 Certified</h3>
              <p className="text-muted-foreground">Our security processes are regularly audited and certified by independent experts.</p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="h-16 w-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-5">
                <Fingerprint className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Zero Knowledge</h3>
              <p className="text-muted-foreground">We never see your passwords. Your data is encrypted and decrypted locally.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Trusted by Thousands</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See what our users have to say about Whisperrauth.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {testimonials.map((testimonial, i) => (
            <div key={i} className="bg-card p-8 rounded-lg border relative">
              <div className="flex mb-4">
                {[...Array(testimonial.stars)].map((_, j) => (
                  <Star key={j} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="italic mb-6">"{testimonial.quote}"</p>
              <div>
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-muted-foreground text-sm">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-card py-20 px-4 sm:px-6 lg:px-8 border-y">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">
              Everything you need to know about Whisperrauth
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="border rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to secure your digital life?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of users who trust Whisperrauth with their passwords.
          </p>
                 <Link href="/register">
            <Button size="lg" className="gap-2">
              Get Started Free <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required. Free forever with premium options.
          </p>
        </div>
      </div>
    </div>
  );
}