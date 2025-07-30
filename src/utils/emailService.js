import nodemailer from "nodemailer"

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export const sendEmail = async (options) => {
  try {
    const transporter = createTransporter()
    const mailOptions = {
      from: `${process.env.FROM_NAME || "Healthcare Platform"} <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
      text: options.text,
    }
    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent: ", info.messageId)
    return info
  } catch (error) {
    console.error("Email sending failed: ", error)
    throw error
  }
}

export const sendOTPEmail = async (user, otp) => {
  const roleText = user.role === "doctor" ? "Doctor" : "User"
  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin-bottom: 10px;">Your OTP Code</h1>
        <p style="color: #666; font-size: 16px;">Please use the following OTP to verify your ${user.role} account.</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
        <h2 style="color: #333; margin-bottom: 20px;">Hi ${roleText} ${user.fullName}!</h2>
        <p style="color: #666; margin-bottom: 30px; line-height: 1.6;">
          Your One-Time Password (OTP) for authentication is:
        </p>
        
        <div style="background: #e9ecef; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin-bottom: 20px;">
          ${otp}
        </div>
        
        <p style="color: #888; font-size: 14px; margin-top: 20px;">
          This OTP will expire in 10 minutes.
        </p>
      </div>
    </div>
  `

  await sendEmail({
    email: user.email,
    subject: `Your ${roleText} Authentication OTP`,
    html,
  })
}

export const sendWelcomeEmail = async (user) => {
  const roleText = user.role === "doctor" ? "Doctor" : "User"
  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333;">Welcome to Our Healthcare Platform! 🎉</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #333; margin-bottom: 20px;">Hi ${roleText} ${user.fullName}!</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Congratulations! Your ${user.role} account has been successfully verified and is now active.
        </p>
        <p style="color: #666; line-height: 1.6;">
          You can now enjoy all the features of our platform as a ${user.role}.
        </p>
        ${
          user.role === "doctor"
            ? `
        <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 5px;">
          <h3 style="color: #2d5a2d; margin-bottom: 10px;">Doctor Profile Information:</h3>
          <p style="color: #2d5a2d; margin: 5px 0;"><strong>Specialization:</strong> ${user.specialization}</p>
          <p style="color: #2d5a2d; margin: 5px 0;"><strong>License Number:</strong> ${user.licenseNumber}</p>
          <p style="color: #2d5a2d; margin: 5px 0;"><strong>Experience:</strong> ${user.experience} years</p>
        </div>
        `
            : ""
        }
      </div>
    </div>
  `

  await sendEmail({
    email: user.email,
    subject: `Welcome! Your ${roleText} Account is Now Active`,
    html,
  })
}

export const sendPasswordResetEmail = async (user, resetUrl) => {
  const roleText = user.role === "doctor" ? "Doctor" : "User"
  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333;">Password Reset Request</h1>
        <p style="color: #666; font-size: 16px;">You have requested to reset your password.</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #333; margin-bottom: 20px;">Hi ${roleText} ${user.fullName}!</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Please click on the button below to reset your password. This link is valid for 15 minutes.
        </p>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${resetUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                   color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;
                   font-weight: bold; font-size: 16px;">
            Reset Your Password
          </a>
        </div>
        
        <p style="color: #888; font-size: 14px; text-align: center;">
          If you did not request a password reset, please ignore this email.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px;">
          Reset link: ${resetUrl}
        </p>
      </div>
    </div>
  `

  await sendEmail({
    email: user.email,
    subject: "Password Reset Request",
    html,
  })
}

export const sendPredictionShareEmail = async (patient, doctor, sharedPrediction) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173"
  const shareLink = `${frontendUrl}/doctor/shared/${sharedPrediction.shareCode}`

  console.log("Generating share email with link:", shareLink)

  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333;">Medical Analysis Shared</h1>
        <p style="color: #666; font-size: 16px;">A patient has shared their medical analysis with you</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #333; margin-bottom: 20px;">Hi Dr. ${doctor.fullName}!</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          <strong>${patient.fullName}</strong> has shared their medical analysis with you for review.
        </p>
        
        ${
          sharedPrediction.message
            ? `
        <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h4 style="color: #1976d2; margin-bottom: 10px;">Patient's Message:</h4>
          <p style="color: #1976d2; font-style: italic;">"${sharedPrediction.message}"</p>
        </div>
        `
            : ""
        }
        
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${shareLink}"
             style="display: inline-block; background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
                 color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;
                 font-weight: bold; font-size: 16px;">
            View Analysis
          </a>
        </div>
        
        <p style="color: #888; font-size: 14px; text-align: center;">
          This link will expire in 30 days.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px;">
          Direct link: ${shareLink}
        </p>
        <p style="color: #888; font-size: 12px;">
          Share Code: ${sharedPrediction.shareCode}
        </p>
      </div>
    </div>
  `

  await sendEmail({
    email: doctor.email,
    subject: "New Medical Analysis Shared - Review Required",
    html,
  })
}

export const sendDoctorNotificationEmail = async (doctor, patient, sharedPrediction) => {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333;">Analysis Shared Successfully</h1>
        <p style="color: #666; font-size: 16px;">Your medical analysis has been shared with the doctor</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #333; margin-bottom: 20px;">Hi ${patient.fullName}!</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Your medical analysis has been successfully shared with <strong>Dr. ${doctor.fullName}</strong> (${doctor.specialization}).
        </p>
        
        <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h4 style="color: #2d5a2d; margin-bottom: 10px;">What happens next?</h4>
          <ul style="color: #2d5a2d; margin: 0; padding-left: 20px;">
            <li>The doctor will review your analysis</li>
            <li>You'll receive a notification when they respond</li>
            <li>You can track the status in your profile</li>
          </ul>
        </div>
        
        <p style="color: #888; font-size: 14px; text-align: center;">
          Share Code: ${sharedPrediction.shareCode}
        </p>
      </div>
    </div>
  `

  await sendEmail({
    email: patient.email,
    subject: "Analysis Shared Successfully with Doctor",
    html,
  })
}

