"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Mail, MessageSquare, User, Building } from "lucide-react"

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    try {
      console.log('Submitting form data:', formData)
      
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      const result = await response.json()
      console.log('API Response:', result)
      
      if (result.success) {
        setIsSubmitted(true)
        setFormData({ name: "", email: "", company: "", message: "" })
        
        // Reset success state after 5 seconds
        setTimeout(() => {
          setIsSubmitted(false)
        }, 5000)
      } else {
        throw new Error(result.message || 'Failed to submit form')
      }
      
    } catch (error) {
      console.error('Error submitting contact form:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit form. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <section className="py-20 bg-[#121212]" id="contact">
        <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="bg-[#1a1a1a] p-12 rounded-lg border border-gray-800 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-green-500/10 blur-xl" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-8 h-8 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Message Sent! ✅</h3>
                <p className="text-gray-400">
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
                <p className="text-sm text-green-400 mt-4">
                  📧 You should also receive a confirmation email shortly.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 bg-[#121212]" id="contact">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Get in Touch
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Have questions about DataShorts? Want to see a demo? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-white">
                Let's start a conversation
              </h3>
              <p className="text-gray-400 mb-8">
                Whether you're looking to transform your data workflow or have technical questions, 
                our team is here to help you get the most out of DataShorts.
              </p>
            </div>

            <div className="space-y-6">
              <ContactInfoItem
                icon={<Mail className="h-5 w-5" />}
                title="Email Us"
                description="datashorts15@gmail.com"
                subtitle="We typically respond within 2 hours"
              />
              
            </div>

            <div className="pt-8">
              <h4 className="text-lg font-medium text-white mb-4">What to expect:</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Quick response within 2 hours
                </li>
                <li className="flex items-center gap-3 text-gray-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Personalized demo of relevant features
                </li>
                <li className="flex items-center gap-3 text-gray-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Guidance on database integration
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Form */}
          <div className="relative">
            <div
              className={`
                bg-[#1a1a1a]
                p-8
                rounded-lg
                border border-gray-800
                relative
                overflow-visible
                before:absolute before:inset-0 before:rounded-lg
                before:bg-gradient-to-br before:from-blue-500/10 before:to-purple-500/10
                before:blur-xl before:-z-10
                transition-shadow hover:shadow-lg hover:shadow-blue-500/20
              `}
            >
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  ❌ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    icon={<User className="h-4 w-4" />}
                    label="Full Name"
                    name="name"
                    type="text"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                  <FormField
                    icon={<Mail className="h-4 w-4" />}
                    label="Email Address"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <FormField
                  icon={<Building className="h-4 w-4" />}
                  label="Company (Optional)"
                  name="company"
                  type="text"
                  placeholder="Your company name"
                  value={formData.company}
                  onChange={handleChange}
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Message
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-gray-500">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <textarea
                      name="message"
                      rows={5}
                      placeholder="Tell us about your data needs, questions, or how we can help..."
                      value={formData.message}
                      onChange={handleChange}
                      required
                      className="
                        w-full
                        pl-10 pr-4 py-3
                        bg-[#222]
                        border border-gray-700
                        rounded-md
                        text-white
                        placeholder-gray-500
                        focus:outline-none
                        focus:ring-2
                        focus:ring-blue-500
                        focus:border-transparent
                        transition-colors
                        resize-none
                      "
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="
                    w-full
                    bg-blue-600
                    hover:bg-blue-700
                    disabled:bg-blue-600/50
                    disabled:cursor-not-allowed
                    transition-colors
                    h-12
                  "
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  By submitting this form, you agree to our privacy policy and terms of service.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

interface FormFieldProps {
  icon: React.ReactNode
  label: string
  name: string
  type: string
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
}

function FormField({
  icon,
  label,
  name,
  type,
  placeholder,
  value,
  onChange,
  required = false
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          {icon}
        </div>
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className="
            w-full
            pl-10 pr-4 py-3
            bg-[#222]
            border border-gray-700
            rounded-md
            text-white
            placeholder-gray-500
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            focus:border-transparent
            transition-colors
          "
        />
      </div>
    </div>
  )
}

interface ContactInfoItemProps {
  icon: React.ReactNode
  title: string
  description: string
  subtitle: string
}

function ContactInfoItem({ icon, title, description, subtitle }: ContactInfoItemProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="bg-blue-500/10 w-12 h-12 rounded-lg flex items-center justify-center text-blue-500 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-white mb-1">{title}</h4>
        <p className="text-blue-400 mb-1">{description}</p>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  )
}