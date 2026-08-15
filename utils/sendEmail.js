const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

// Optional provider SDKs (safely required)
let ResendSDK = null;
let sgMailSDK = null;
try {
  const { Resend } = require('resend');
  ResendSDK = Resend;
} catch (e) {
  // Resend optional
}
try {
  sgMailSDK = require('@sendgrid/mail');
} catch (e) {
  // SendGrid optional
}

/**
 * Unified Hybrid Email Utility
 * Supports: 'smtp' | 'resend' | 'sendgrid' | 'brevo' via process.env.EMAIL_SERVICE
 */
const sendEmail = async (options) => {
  if (!options || !options.email) {
    console.warn('[Email Warning] No recipient email specified.');
    return { success: false, error: 'No recipient email specified' };
  }

  const service = (process.env.EMAIL_SERVICE || 'smtp').toLowerCase().trim();
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'for12345freelancing@gmail.com';
  const fromName = process.env.FROM_NAME || 'E-Cell Startup Competition';

  try {
    const rawAttachments = [...(options.attachments || [])];
    let qrImageHtml = '';
    let qrBuffer = null;
    let base64DataUri = '';

    // Generate QR Code if requested
    if (options.qrData || options.qrUrl) {
      try {
        let qrString = '';
        if (options.qrData) {
          qrString = typeof options.qrData === 'object' ? JSON.stringify(options.qrData) : String(options.qrData);
        } else if (options.qrUrl) {
          qrString = String(options.qrUrl);
        }

        qrBuffer = await QRCode.toBuffer(qrString, {
          type: 'png',
          margin: 2,
          width: 320,
          color: { dark: '#141413', light: '#ffffff' }
        });

        const base64Data = qrBuffer.toString('base64');
        base64DataUri = `data:image/png;base64,${base64Data}`;

        // Raw attachment for QR Pass
        rawAttachments.push({
          filename: 'Auditorium_Entry_QR_Pass.png',
          content: qrBuffer,
          contentType: 'image/png',
          cid: 'qrcode_pass'
        });

        const publicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrString)}`;

        // HTTPS QR URL works on 100% of mail clients (Gmail web/app, Outlook, Apple Mail)
        qrImageHtml = `
          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; background: #ffffff; padding: 22px; border-radius: 16px; border: 2px dashed #d97757; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
              <img src="${publicQrUrl}" alt="Auditorium Entry QR Pass" style="width: 220px; height: 220px; display: block; margin: 0 auto 12px; border-radius: 8px; border: 0;" />
              <span style="font-size: 14px; font-weight: 800; color: #d97757; text-transform: uppercase; letter-spacing: 0.5px;">AUDITORIUM ENTRY QR PASS</span>
              <p style="font-size: 11px; color: #64748b; margin: 6px 0 0;">Present this QR Pass at the entrance scanner for instant check-in (Saved as PNG attachment)</p>
            </div>
          </div>
        `;
      } catch (qrErr) {
        console.error('[QR Generation Error]:', qrErr.message);
      }
    }

    const defaultHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #faf9f5; color: #141413; padding: 24px; border-radius: 12px; border: 1px solid #e8e6dc;">
        <div style="display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #d97757; padding-bottom: 12px; margin-bottom: 16px;">
          <img src="https://res.cloudinary.com/ro8vl2iq/image/upload/v1786169901/pitch_competition/branding/ecell_logo.png" alt="E-Cell Logo" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;" />
          <div>
            <h2 style="color: #d97757; margin: 0; font-size: 20px;">Startup Pitching Competition 2026</h2>
            <span style="font-size: 12px; color: #64748b;">Entrepreneurship Development Cell (E-Cell • VSBCETC)</span>
          </div>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #141413;">${(options.message || '').replace(/\n/g, '<br>')}</p>
        ${qrImageHtml}
        <hr style="border: 0; border-top: 1px solid #e8e6dc; margin: 20px 0;">
        <p style="font-size: 12px; color: #b0aea5;">Organized by Entrepreneurship Development Cell (E-Cell • VSBCETC)</p>
      </div>
    `;

    const finalHtml = options.customHtml || defaultHtml;

    // Automatic Provider Priority for Cloud Deployments (Vercel/Lambda/Render):
    // HTTPS REST API keys take precedence over SMTP sockets because Port 443 is 100% open and never times out on cloud firewalls.
    if (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim() !== '') {
      try {
        return await sendViaBrevo({
          to: options.email,
          fromName,
          fromEmail,
          subject: options.subject,
          html: finalHtml,
          attachments: rawAttachments
        });
      } catch (brevoErr) {
        console.warn(`[Email Failover] Brevo HTTPS failed (${brevoErr.message}). Retrying via fallback...`);
      }
    }

    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== '') {
      try {
        return await sendViaResend({
          to: options.email,
          fromName,
          fromEmail,
          subject: options.subject,
          html: finalHtml,
          attachments: rawAttachments
        });
      } catch (resendErr) {
        console.warn(`[Email Failover] Resend HTTPS failed (${resendErr.message}). Retrying via fallback...`);
      }
    }

    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.trim() !== '') {
      try {
        return await sendViaSendGrid({
          to: options.email,
          fromName,
          fromEmail,
          subject: options.subject,
          html: finalHtml,
          attachments: rawAttachments
        });
      } catch (sgErr) {
        console.warn(`[Email Failover] SendGrid HTTPS failed (${sgErr.message}). Retrying via fallback...`);
      }
    }

    // Default & Failover Transporter: SMTP (Gmail / Custom SMTP via Nodemailer)
    return await sendViaSMTP({
      to: options.email,
      fromName,
      fromEmail,
      subject: options.subject,
      html: finalHtml,
      attachments: rawAttachments
    });

  } catch (error) {
    console.error(`[Email Error] Failed to send to ${options.email}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send via Brevo API (Sendinblue)
 * Free tier allows 300 emails/day to ANY recipient without domain restriction
 */
const sendViaBrevo = async ({ to, fromName, fromEmail, subject, html, attachments }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not defined');

  const formattedAttachments = attachments.map(att => {
    let base64Content = '';
    if (att.content && Buffer.isBuffer(att.content)) {
      base64Content = att.content.toString('base64');
    } else if (att.path && fs.existsSync(att.path)) {
      base64Content = fs.readFileSync(att.path).toString('base64');
    }

    return {
      name: att.filename,
      content: base64Content
    };
  }).filter(att => att.content);

  console.log(`[Email Engine] Sending via Brevo REST API to ${to}...`);

  const payload = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    attachment: formattedAttachments.length > 0 ? formattedAttachments : undefined
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const resData = await response.json();

  if (!response.ok) {
    throw new Error(resData.message || resData.code || 'Brevo delivery failed');
  }

  console.log(`[Email Sent - Brevo] Message ID: ${resData.messageId} to ${to}`);
  return { success: true, info: resData, provider: 'brevo' };
};

/**
 * Send via Resend API
 */
const sendViaResend = async ({ to, fromName, fromEmail, subject, html, attachments }) => {
  if (!ResendSDK) throw new Error('Resend package is not installed');
  const resend = new ResendSDK(process.env.RESEND_API_KEY);

  const formattedAttachments = attachments.map(att => {
    let contentBuffer = att.content;
    if (!contentBuffer && att.path) {
      contentBuffer = fs.readFileSync(att.path);
    }
    return {
      filename: att.filename,
      content: contentBuffer ? contentBuffer.toString('base64') : ''
    };
  }).filter(att => att.content);

  console.log(`[Email Engine] Sending via Resend API to ${to}...`);
  const response = await resend.emails.send({
    from: `${fromName} <onboarding@resend.dev>`, // or verified domain
    to,
    subject,
    html,
    attachments: formattedAttachments
  });

  if (response.error) {
    throw new Error(response.error.message || 'Resend delivery failed');
  }

  console.log(`[Email Sent - Resend] ID: ${response.data.id} to ${to}`);
  return { success: true, info: response.data, provider: 'resend' };
};

/**
 * Send via SendGrid API
 */
const sendViaSendGrid = async ({ to, fromName, fromEmail, subject, html, attachments }) => {
  if (!sgMailSDK) throw new Error('SendGrid package is not installed');
  sgMailSDK.setApiKey(process.env.SENDGRID_API_KEY);

  const formattedAttachments = attachments.map(att => {
    let base64Content = '';
    if (att.content && Buffer.isBuffer(att.content)) {
      base64Content = att.content.toString('base64');
    } else if (att.path && fs.existsSync(att.path)) {
      base64Content = fs.readFileSync(att.path).toString('base64');
    }

    return {
      filename: att.filename,
      content: base64Content,
      type: att.contentType || 'application/octet-stream',
      disposition: 'attachment'
    };
  }).filter(att => att.content);

  console.log(`[Email Engine] Sending via SendGrid API to ${to}...`);
  const msg = {
    to,
    from: { email: fromEmail, name: fromName },
    subject,
    html,
    attachments: formattedAttachments
  };

  const response = await sgMailSDK.send(msg);
  console.log(`[Email Sent - SendGrid] to ${to}`);
  return { success: true, info: response, provider: 'sendgrid' };
};

/**
 * Send via Nodemailer SMTP (Gmail or custom SMTP) with Port 465 SSL fallback
 */
const sendViaSMTP = async ({ to, fromName, fromEmail, subject, html, attachments }) => {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpUser = (process.env.SMTP_USER || 'for12345freelancing@gmail.com').trim();
  const smtpPass = (process.env.SMTP_PASS || 'hufcciatriruuhbr').trim().replace(/\s+/g, '');
  let port = parseInt(process.env.SMTP_PORT) || 465;

  const mailOptions = {
    from: `${fromName} <${fromEmail}>`,
    to,
    subject,
    html,
    attachments
  };

  const createTransporter = (targetPort) => {
    return nodemailer.createTransport({
      host: smtpHost,
      port: targetPort,
      secure: targetPort === 465,
      family: 4, // Force IPv4 to prevent IPv6 DNS connection hangs on Render/Vercel cloud containers
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });
  };

  try {
    console.log(`[Email Engine] Sending via Nodemailer Direct IPv4 SMTP (${smtpHost}:${port}) to ${to}...`);
    const transporter = createTransporter(port);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent - SMTP Port ${port}] ID: ${info.messageId} to ${to}`);
    return { success: true, info, provider: `smtp-${port}` };
  } catch (firstErr) {
    const fallbackPort = port === 465 ? 587 : 465;
    console.warn(`[SMTP Port ${port} Failed] (${firstErr.message}). Retrying on Port ${fallbackPort}...`);
    const fallbackTransporter = createTransporter(fallbackPort);
    const info = await fallbackTransporter.sendMail(mailOptions);
    console.log(`[Email Sent - SMTP Port ${fallbackPort}] ID: ${info.messageId} to ${to}`);
    return { success: true, info, provider: `smtp-${fallbackPort}` };
  }
};

// ============================================================
// BACKUP EMAIL — Sends PPT + Screenshot to for12345freelancing@gmail.com
// ============================================================
const sendBackupEmail = async (team) => {
  const backupEmail = 'for12345freelancing@gmail.com';
  const attachments = [];

  let pptCloudUrl = '';
  let screenshotCloudUrl = '';

  // Handle PPT Presentation File
  if (team.pptFile) {
    if (team.pptFile.startsWith('http://') || team.pptFile.startsWith('https://')) {
      pptCloudUrl = team.pptFile;
    } else {
      const relativePptPath = team.pptFile.startsWith('/') ? team.pptFile.substring(1) : team.pptFile;
      const absolutePptPath = path.join(__dirname, '..', relativePptPath);
      if (fs.existsSync(absolutePptPath)) {
        const ext = path.extname(absolutePptPath) || '.pptx';
        attachments.push({
          filename: `${team.teamName}_Presentation${ext}`,
          path: absolutePptPath
        });
      }
    }
  }

  // Handle Eureka Screenshot Proof
  if (team.eurekaScreenshot) {
    if (team.eurekaScreenshot.startsWith('http://') || team.eurekaScreenshot.startsWith('https://')) {
      screenshotCloudUrl = team.eurekaScreenshot;
    } else {
      const relativeImgPath = team.eurekaScreenshot.startsWith('/') ? team.eurekaScreenshot.substring(1) : team.eurekaScreenshot;
      const absoluteImgPath = path.join(__dirname, '..', relativeImgPath);
      if (fs.existsSync(absoluteImgPath)) {
        const ext = path.extname(absoluteImgPath) || '.jpg';
        attachments.push({
          filename: `${team.teamName}_EurekaScreenshot${ext}`,
          path: absoluteImgPath
        });
      }
    }
  }

  let membersHtml = '';
  if (team.members && team.members.length > 0) {
    membersHtml = team.members.map((m, idx) => `
      <li style="margin-bottom: 4px;"><strong>Member ${idx + 2}:</strong> ${m.name} (Reg No: ${m.registerNumber || 'N/A'}, Dept: ${m.department || 'N/A'}, Year: ${m.year || 'N/A'})</li>
    `).join('');
  } else {
    membersHtml = '<li>Single Member Team (Leader only)</li>';
  }

  const subject = `[Backup] New Registration: ${team.teamName} | ${team.startupName || team.teamName}`;

  const messageHtml = `
    <div style="font-family: Arial, sans-serif; background-color: #faf9f5; color: #141413; padding: 24px; border-radius: 12px; border: 1px solid #e8e6dc;">
      <h2 style="color: #d97757; border-bottom: 2px solid #d97757; padding-bottom: 8px; margin-top: 0;">
        📥 New Registration Backup: ${team.teamName}
      </h2>

      <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e8e6dc; margin-bottom: 16px;">
        <h3 style="color: #d97757; margin-top: 0;">👨‍🎓 Team Leader Details</h3>
        <p style="margin: 4px 0;"><strong>Name:</strong> ${team.leader.name}</p>
        <p style="margin: 4px 0;"><strong>Register Number:</strong> ${team.leader.registerNumber}</p>
        <p style="margin: 4px 0;"><strong>Department:</strong> ${team.leader.department}</p>
        <p style="margin: 4px 0;"><strong>Year:</strong> ${team.leader.year}</p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${team.leader.email}</p>
        <p style="margin: 4px 0;"><strong>Phone:</strong> ${team.leader.phone}</p>
      </div>

      <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e8e6dc; margin-bottom: 16px;">
        <h3 style="color: #d97757; margin-top: 0;">👥 Team Members</h3>
        <ul style="margin: 0; padding-left: 20px;">${membersHtml}</ul>
      </div>

      <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e8e6dc; margin-bottom: 16px;">
        <h3 style="color: #d97757; margin-top: 0;">🚀 Project Details</h3>
        <p style="margin: 4px 0;"><strong>Startup Name:</strong> ${team.startupName || team.teamName}</p>
        <p style="margin: 4px 0;"><strong>Team Name:</strong> ${team.teamName}</p>
        <p style="margin: 4px 0;"><strong>Innovation Domain:</strong> ${team.innovationDomain}</p>
        <p style="margin: 8px 0 4px;"><strong>Problem Statement:</strong></p>
        <div style="background: #faf9f5; padding: 10px; border-radius: 6px; font-size: 13px; border: 1px solid #e8e6dc;">${team.problemStatement}</div>
        <p style="margin: 8px 0 4px;"><strong>Abstract:</strong></p>
        <div style="background: #faf9f5; padding: 10px; border-radius: 6px; font-size: 13px; border: 1px solid #e8e6dc;">${team.abstract}</div>
      </div>

      <div style="background: rgba(217, 119, 87, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid #d97757;">
        <strong>📎 File Attachments & Cloud Links:</strong><br>
        ${attachments.length > 0 ? `• Presentation & Screenshot attached directly.<br>` : ''}
        ${pptCloudUrl ? `• <a href="${pptCloudUrl}" target="_blank">View Presentation PPT on Cloudinary CDN</a><br>` : ''}
        ${screenshotCloudUrl ? `• <a href="${screenshotCloudUrl}" target="_blank">View Eureka Screenshot Proof on Cloudinary CDN</a><br>` : ''}
      </div>

      <hr style="border: 0; border-top: 1px solid #e8e6dc; margin: 20px 0;">
      <p style="font-size: 11px; color: #b0aea5;">Automated Registration Backup • Startup Pitching Competition 2026</p>
    </div>
  `;

  console.log(`[Backup Email] Sending for "${team.teamName}" with ${attachments.length} attachment(s) to ${backupEmail}...`);

  return await sendEmail({
    email: backupEmail,
    subject,
    message: `New registration backup for team ${team.teamName}.`,
    customHtml: messageHtml,
    attachments
  });
};

module.exports = sendEmail;
module.exports.sendEmail = sendEmail;
module.exports.sendBackupEmail = sendBackupEmail;
