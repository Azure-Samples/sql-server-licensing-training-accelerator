import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Building2, MapPin, Calendar, Users, Stethoscope, Brain, CreditCard, DollarSign } from 'lucide-react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [formData, setFormData] = useState({
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@healthtech.com',
    phone: '+1 (312) 555-0123',
    organization: 'Chicago Medical Innovation Center',
    jobTitle: 'Chief Technology Officer',
    industry: 'healthtech',
    attendanceType: 'in-person',
    dietaryRestrictions: '',
    accessibility: '',
    marketingConsent: true,
    termsAccepted: true
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentIntentId, setPaymentIntentId] = useState('')
  const [registrationComplete, setRegistrationComplete] = useState(false)

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/api/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 2000, // $20.00 in cents
          currency: 'usd',
          registration_data: formData
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create payment intent')
      }

      const data = await response.json()
      setPaymentIntentId(data.payment_intent_id)
      setShowPayment(true)
    } catch (error) {
      console.error('Error creating payment intent:', error)
      alert('There was an error processing your registration. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaymentSimulation = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/api/simulate-payment/${paymentIntentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Payment simulation failed')
      }

      await response.json()
      setRegistrationComplete(true)
      setShowPayment(false)
    } catch (error) {
      console.error('Error simulating payment:', error)
      alert('There was an error processing your payment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <Card className="max-w-2xl mx-auto shadow-xl border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg text-center">
            <CardTitle className="text-3xl">Registration Confirmed!</CardTitle>
            <CardDescription className="text-green-100 text-lg">
              Welcome to SAIL Summit 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Thank you, {formData.firstName}!
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              Your registration for SAIL Summit 2025 has been confirmed. You will receive a confirmation email at{' '}
              <span className="font-semibold text-blue-600">{formData.email}</span> within the next few minutes.
            </p>
            <div className="bg-blue-50 p-6 rounded-lg mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Event Details</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Date:</strong> March 15-17, 2025</p>
                <p><strong>Location:</strong> McCormick Place, Chicago, IL</p>
                <p><strong>Attendance:</strong> {formData.attendanceType}</p>
              </div>
            </div>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              Register Another Attendee
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <Card className="max-w-2xl mx-auto shadow-xl border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg text-center">
            <CardTitle className="text-2xl flex items-center justify-center space-x-2">
              <CreditCard className="w-6 h-6" />
              <span>Complete Payment</span>
            </CardTitle>
            <CardDescription className="text-blue-100">
              Secure your spot at SAIL Summit 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Registration Fee</h3>
              <p className="text-4xl font-bold text-blue-600 mb-2">$20.00</p>
              <p className="text-gray-600">One-time registration fee for SAIL Summit 2025</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Registration Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span className="font-medium">{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-medium">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Organization:</span>
                  <span className="font-medium">{formData.organization}</span>
                </div>
                <div className="flex justify-between">
                  <span>Attendance Type:</span>
                  <span className="font-medium">{formData.attendanceType}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Demo Mode:</strong> This is a demonstration. Click "Simulate Payment" to complete your registration without actual payment processing.
              </p>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={handlePaymentSimulation}
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
              >
                {isSubmitting ? 'Processing...' : 'Simulate Payment ($20.00)'}
              </Button>
              <Button 
                onClick={() => setShowPayment(false)}
                variant="outline"
                className="w-full"
                disabled={isSubmitting}
              >
                Back to Registration
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Microsoft</h1>
                <p className="text-sm text-blue-600 font-medium">Healthcare & Life Sciences</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">Chicago, IL</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-blue-600 font-semibold">March 15-17, 2025</span>
              </div>
              <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                SAIL Summit
                <span className="block text-blue-600">Healthcare & Life Sciences</span>
              </h1>
              <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                Join healthcare leaders, innovators, and technology experts in Chicago for three days of 
                groundbreaking insights, networking, and the future of healthcare technology.
              </p>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-8">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Registration Fee: $20</span>
                </div>
                <p className="text-sm text-blue-700">
                  Secure your spot at this premier healthcare technology event. Registration includes access to all sessions, networking events, and materials.
                </p>
              </div>
              <div className="flex items-center space-x-8 text-gray-600">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">500+ Attendees</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Healthcare Focus</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">AI & Innovation</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <img 
                src="/images/healthcare-analytics.jpg" 
                alt="Healthcare analytics dashboard on laptop showing medical data visualization"
                className="rounded-2xl shadow-2xl w-full h-96 object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://placehold.co/600x400/0078d4/ffffff?text=Healthcare+Analytics'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent rounded-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Register for SAIL Summit 2025</h2>
            <p className="text-lg text-gray-600">Secure your spot at the premier healthcare technology event</p>
          </div>

          <Card className="shadow-xl border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <CardTitle className="text-2xl">Registration Form</CardTitle>
              <CardDescription className="text-blue-100">
                Please fill out all required fields to complete your registration
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Personal Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                        First Name *
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                        Last Name *
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="your.email@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Professional Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="organization" className="text-sm font-medium text-gray-700">
                        Organization *
                      </Label>
                      <Input
                        id="organization"
                        type="text"
                        required
                        value={formData.organization}
                        onChange={(e) => handleInputChange('organization', e.target.value)}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Your company or organization"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle" className="text-sm font-medium text-gray-700">
                        Job Title *
                      </Label>
                      <Input
                        id="jobTitle"
                        type="text"
                        required
                        value={formData.jobTitle}
                        onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Your current position"
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <Label htmlFor="industry" className="text-sm font-medium text-gray-700">
                      Industry Sector *
                    </Label>
                    <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                      <SelectTrigger className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select your industry sector" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hospital">Hospital & Health System</SelectItem>
                        <SelectItem value="pharma">Pharmaceutical</SelectItem>
                        <SelectItem value="biotech">Biotechnology</SelectItem>
                        <SelectItem value="medtech">Medical Technology</SelectItem>
                        <SelectItem value="healthtech">Health Technology</SelectItem>
                        <SelectItem value="payer">Health Insurance/Payer</SelectItem>
                        <SelectItem value="consulting">Healthcare Consulting</SelectItem>
                        <SelectItem value="government">Government/Regulatory</SelectItem>
                        <SelectItem value="academic">Academic/Research</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Event Preferences */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Event Preferences
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="attendanceType" className="text-sm font-medium text-gray-700">
                        Attendance Type *
                      </Label>
                      <Select value={formData.attendanceType} onValueChange={(value) => handleInputChange('attendanceType', value)}>
                        <SelectTrigger className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Select attendance type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in-person">In-Person (Chicago)</SelectItem>
                          <SelectItem value="virtual">Virtual Attendance</SelectItem>
                          <SelectItem value="hybrid">Hybrid (Some sessions virtual)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dietaryRestrictions" className="text-sm font-medium text-gray-700">
                        Dietary Restrictions or Allergies
                      </Label>
                      <Textarea
                        id="dietaryRestrictions"
                        value={formData.dietaryRestrictions}
                        onChange={(e) => handleInputChange('dietaryRestrictions', e.target.value)}
                        className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Please list any dietary restrictions, allergies, or special meal requirements"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="accessibility" className="text-sm font-medium text-gray-700">
                        Accessibility Requirements
                      </Label>
                      <Textarea
                        id="accessibility"
                        value={formData.accessibility}
                        onChange={(e) => handleInputChange('accessibility', e.target.value)}
                        className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Please describe any accessibility accommodations you may need"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Consent and Terms */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Consent & Terms
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="marketingConsent"
                        checked={formData.marketingConsent}
                        onCheckedChange={(checked) => handleInputChange('marketingConsent', checked as boolean)}
                        className="mt-1"
                      />
                      <Label htmlFor="marketingConsent" className="text-sm text-gray-700 leading-relaxed">
                        I consent to receive marketing communications from Microsoft about future healthcare events, 
                        products, and services. You can unsubscribe at any time.
                      </Label>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="termsAccepted"
                        checked={formData.termsAccepted}
                        onCheckedChange={(checked) => handleInputChange('termsAccepted', checked as boolean)}
                        className="mt-1"
                        required
                      />
                      <Label htmlFor="termsAccepted" className="text-sm text-gray-700 leading-relaxed">
                        I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and 
                        <a href="#" className="text-blue-600 hover:underline ml-1">Privacy Policy</a> *
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6 border-t border-gray-200">
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    disabled={!formData.termsAccepted || isSubmitting}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>{isSubmitting ? 'Processing...' : 'Proceed to Payment ($20)'}</span>
                  </Button>
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Registration fee: $20. You will receive a confirmation email within 24 hours after payment.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Microsoft</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Empowering healthcare organizations with innovative technology solutions 
                to improve patient outcomes and operational efficiency.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Event Information</h4>
              <div className="space-y-2 text-gray-400">
                <p>March 15-17, 2025</p>
                <p>Chicago, Illinois</p>
                <p>McCormick Place Convention Center</p>
                <p>Registration: Free</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-gray-400">
                <p>Email: sail-summit@microsoft.com</p>
                <p>Phone: 1-800-MSFT-HLS</p>
                <p>Web: microsoft.com/healthcare</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Microsoft Corporation. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
