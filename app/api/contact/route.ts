// File: app/api/contact/route.ts

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email configuration
const EMAIL_CONFIG = {
  user: process.env.GMAIL_USER,
  pass: process.env.GMAIL_APP_PASSWORD,
  recipient: process.env.CONTACT_RECIPIENT_EMAIL || process.env.GMAIL_USER,
  from: process.env.GMAIL_USER,
};

// Enhanced validation function with detailed logging
function validateContactData(data: any) {
  console.log('🔍 Validating data:', JSON.stringify(data, null, 2));
  const errors: string[] = [];

  // Check if data exists
  if (!data || typeof data !== 'object') {
    errors.push('Invalid request data');
    console.log('❌ Data is not an object:', typeof data);
    return errors;
  }

  // Name validation
  console.log('📝 Checking name:', data.name, typeof data.name);
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required');
    console.log('❌ Name validation failed');
  } else if (data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
    console.log('❌ Name too short');
  } else if (data.name.length > 255) {
    errors.push('Name must be less than 255 characters');
    console.log('❌ Name too long');
  } else {
    console.log('✅ Name validation passed');
  }

  // Email validation
  console.log('📧 Checking email:', data.email, typeof data.email);
  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required');
    console.log('❌ Email validation failed - missing or not string');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Please enter a valid email address');
      console.log('❌ Email format invalid');
    } else if (data.email.length > 255) {
      errors.push('Email must be less than 255 characters');
      console.log('❌ Email too long');
    } else {
      console.log('✅ Email validation passed');
    }
  }

  // Message validation
  console.log('💬 Checking message:', data.message ? data.message.substring(0, 50) + '...' : 'undefined', typeof data.message);
  if (!data.message || typeof data.message !== 'string') {
    errors.push('Message is required');
    console.log('❌ Message validation failed - missing or not string');
  } else if (data.message.trim().length < 10) {
    errors.push('Message must be at least 10 characters long');
    console.log('❌ Message too short:', data.message.trim().length);
  } else if (data.message.length > 5000) {
    errors.push('Message must be less than 5000 characters');
    console.log('❌ Message too long');
  } else {
    console.log('✅ Message validation passed');
  }

  // Company validation (optional)
  if (data.company !== undefined && data.company !== null && data.company !== '') {
    console.log('🏢 Checking company:', data.company, typeof data.company);
    if (typeof data.company === 'string' && data.company.length > 255) {
      errors.push('Company name must be less than 255 characters');
      console.log('❌ Company name too long');
    } else {
      console.log('✅ Company validation passed');
    }
  }

  console.log('🔍 Validation complete. Errors:', errors);
  return errors;
}

// Sanitize input data
function sanitizeData(data: any) {
  console.log('🧹 Sanitizing data...');
  const sanitized = {
    name: data.name?.toString().trim() || '',
    email: data.email?.toString().trim().toLowerCase() || '',
    company: data.company?.toString().trim() || '',
    message: data.message?.toString().trim() || '',
  };
  console.log('🧹 Sanitized data:', sanitized);
  return sanitized;
}

// Create nodemailer transporter
function createTransporter() {
  console.log('📮 Creating email transporter...');
  console.log('📮 Email config check:', {
    hasUser: !!EMAIL_CONFIG.user,
    hasPassword: !!EMAIL_CONFIG.pass,
    userPreview: EMAIL_CONFIG.user ? EMAIL_CONFIG.user.substring(0, 3) + '***' : 'Not set',
    passwordLength: EMAIL_CONFIG.pass ? EMAIL_CONFIG.pass.length : 0
  });

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_CONFIG.user,
      pass: EMAIL_CONFIG.pass,
    },
    secure: true,
  });
}

// Generate HTML email template
function generateEmailHTML(data: {
  name: string;
  email: string;
  company: string;
  message: string;
}) {
  const currentDate = new Date().toLocaleString();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>New Contact Form Submission - DataShorts</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
            .field { margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #3b82f6; border-radius: 4px; }
            .field-label { font-weight: bold; color: #1d4ed8; margin-bottom: 5px; }
            .field-value { font-size: 16px; color: #333; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 New Contact Form Submission</h1>
                <p>DataShorts Website - ${currentDate}</p>
            </div>
            
            <div class="field">
                <div class="field-label">👤 Name:</div>
                <div class="field-value">${data.name}</div>
            </div>
            
            <div class="field">
                <div class="field-label">📧 Email:</div>
                <div class="field-value"><a href="mailto:${data.email}">${data.email}</a></div>
            </div>
            
            ${data.company ? `
            <div class="field">
                <div class="field-label">🏢 Company:</div>
                <div class="field-value">${data.company}</div>
            </div>
            ` : ''}
            
            <div class="field">
                <div class="field-label">💬 Message:</div>
                <div class="field-value" style="white-space: pre-line;">${data.message}</div>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Send email function
async function sendContactEmail(data: {
  name: string;
  email: string;
  company: string;
  message: string;
}) {
  console.log('📧 Preparing to send email...');
  const transporter = createTransporter();

  const mailOptions = {
    from: `"DataShorts Contact Form" <${EMAIL_CONFIG.from}>`,
    to: EMAIL_CONFIG.recipient,
    replyTo: data.email,
    subject: `🚀 New Contact: ${data.name}${data.company ? ` (${data.company})` : ''}`,
    html: generateEmailHTML(data),
  };

  console.log('📧 Mail options:', {
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject,
    replyTo: mailOptions.replyTo
  });

  try {
    console.log('📧 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

// POST endpoint - Submit contact form
export async function POST(request: NextRequest) {
  console.log('🚀 Contact form API called');
  
  try {
    // Check if email credentials are configured
    console.log('🔧 Checking email configuration...');
    if (!EMAIL_CONFIG.user || !EMAIL_CONFIG.pass) {
      console.error('❌ Email credentials not configured');
      console.log('Environment check:', {
        GMAIL_USER: !!process.env.GMAIL_USER,
        GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD,
      });
      
      return NextResponse.json(
        {
          success: false,
          message: 'Email service is not configured. Please contact the administrator.',
          debug: {
            hasUser: !!EMAIL_CONFIG.user,
            hasPassword: !!EMAIL_CONFIG.pass,
          }
        },
        { status: 500 }
      );
    }
    console.log('✅ Email configuration OK');

    // Parse request body
    console.log('📝 Parsing request body...');
    let body;
    try {
      body = await request.json();
      console.log('✅ Request body parsed successfully');
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request format',
          error: 'Could not parse JSON body'
        },
        { status: 400 }
      );
    }

    // Sanitize data
    const sanitizedData = sanitizeData(body);

    // Validate data
    const validationErrors = validateContactData(sanitizedData);
    if (validationErrors.length > 0) {
      console.log('❌ Validation failed:', validationErrors);
      return NextResponse.json(
        {
          success: false,
          message: 'Please check your input and try again.',
          errors: validationErrors,
          receivedData: sanitizedData // for debugging
        },
        { status: 400 }
      );
    }
    console.log('✅ Validation passed');

    // Send email
    console.log('📧 Attempting to send email...');
    const emailResult = await sendContactEmail(sanitizedData);
    console.log('✅ Email sent successfully');

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for your message! We\'ll get back to you within 24 hours.',
        emailSent: true,
        messageId: emailResult.messageId
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('💥 Unexpected error in contact form API:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Sorry, there was an error sending your message. Please try again.',
        error: process.env.NODE_ENV === 'development' ? {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        } : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint - Health check with detailed info
export async function GET() {
  console.log('🩺 Health check called');
  
  const config = {
    hasGmailUser: !!process.env.GMAIL_USER,
    hasGmailPassword: !!process.env.GMAIL_APP_PASSWORD,
    gmailUser: process.env.GMAIL_USER || 'Not set',
    passwordLength: process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.length : 0,
    recipient: EMAIL_CONFIG.recipient || 'Not set',
    nodeEnv: process.env.NODE_ENV,
  };

  console.log('🩺 Current configuration:', config);

  return NextResponse.json({
    success: true,
    message: 'Contact API is running',
    configured: config.hasGmailUser && config.hasGmailPassword,
    config: {
      ...config,
      // Hide sensitive data in production
      gmailUser: process.env.NODE_ENV === 'development' ? config.gmailUser : config.gmailUser.substring(0, 3) + '***'
    },
    timestamp: new Date().toISOString()
  });
}