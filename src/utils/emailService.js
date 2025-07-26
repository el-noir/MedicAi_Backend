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
      from: `${process.env.FROM_NAME || "Blog Platform"} <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
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
  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin-bottom: 10px;">Your OTP Code</h1>
        <p style="color: #666; font-size: 16px;">Please use the following OTP to verify your account.</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
        <h2 style="color: #333; margin-bottom: 20px;">Hi ${user.fullName}!</h2>
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
    subject: "Your Authentication OTP",
    html,
  })
}

export const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333;">Welcome to Our Platform! 🎉</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #333; margin-bottom: 20px;">Hi ${user.fullName}!</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Congratulations! Your account has been successfully verified and is now active.
        </p>
        <p style="color: #666; line-height: 1.6;">
          You can now enjoy all the features of our platform as a ${user.role}.
        </p>
      </div>
    </div>
  `

  await sendEmail({
    email: user.email,
    subject: "Welcome! Your Account is Now Active",
    html,
  })
}

export const sendInvitationEmail = async (invitation) => {
  const invitationUrl = `${process.env.FRONTEND_URL}/invitation/${invitation.token}`

  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333;">You've Been Invited! 🎉</h1>
        <p style="color: #666; font-size: 16px;">You've been invited to become an employee on our platform.</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #333; margin-bottom: 20px;">Hi ${invitation.invitedUser.fullName}!</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          <strong>${invitation.invitedBy.fullName}</strong> has invited you to become an <strong>${invitation.role}</strong> on our blog platform.
        </p>
        
        ${
          invitation.message
            ? `
        <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="color: #1976d2; margin: 0; font-style: italic;">"${invitation.message}"</p>
        </div>
        `
            : ""
        }
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          As an employee, you'll be able to create, edit, and manage blog posts on the platform.
        </p>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${invitationUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;
                    font-weight: bold; font-size: 16px;">
            Accept Invitation
          </a>
        </div>
        
        <p style="color: #888; font-size: 14px; text-align: center;">
          This invitation will expire on ${new Date(invitation.expiresAt).toLocaleDateString()}.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 14px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
        <p style="color: #888; font-size: 12px;">
          Invitation link: ${invitationUrl}
        </p>
      </div>
    </div>
  `

  await sendEmail({
    email: invitation.email,
    subject: `You've been invited to become an ${invitation.role}!`,
    html,
  })
}

export const sendInvitationAcceptedEmail = async (invitation) => {
  // Email to the person who sent the invitation
  const adminHtml = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333;">Invitation Accepted! ✅</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #333; margin-bottom: 20px;">Good news!</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          <strong>${invitation.invitedUser.fullName}</strong> has accepted your invitation to become an <strong>${invitation.role}</strong>.
        </p>
        <p style="color: #666; line-height: 1.6;">
          They can now create and manage blog posts on the platform.
        </p>
      </div>
    </div>
  `

  // Email to the person who accepted the invitation
  const userHtml = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333;">Welcome to the Team! 🎉</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #333; margin-bottom: 20px;">Congratulations, ${invitation.invitedUser.fullName}!</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          You've successfully accepted the invitation and your role has been updated to <strong>${invitation.role}</strong>.
        </p>
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          You can now create, edit, and manage blog posts on our platform.
        </p>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/dashboard"
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;
                    font-weight: bold;">
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  `

  // Send email to admin
  await sendEmail({
    email: invitation.invitedBy.email,
    subject: `${invitation.invitedUser.fullName} accepted your invitation!`,
    html: adminHtml,
  })

  // Send email to user
  await sendEmail({
    email: invitation.invitedUser.email,
    subject: "Welcome to the team!",
    html: userHtml,
  })
}

export const sendPasswordResetEmail = async (user, resetUrl) => {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333;">Password Reset Request</h1>
        <p style="color: #666; font-size: 16px;">You have requested to reset your password.</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #333; margin-bottom: 20px;">Hi ${user.fullName}!</h2>
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
