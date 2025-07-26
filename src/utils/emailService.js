import nodemailer from "nodemailer"

const createTransporter = () => {
  return nodemailer.createTransporter({
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
