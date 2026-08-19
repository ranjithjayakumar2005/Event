const Team = require('../models/Team');
const path = require('path');
const fs = require('fs');
const { getIsConnected } = require('../config/db');

const memoryBackupPath = path.join(__dirname, '../uploads/in_memory_teams_backup.json');

// In-Memory Fallback Storage with Auto JSON Disk Persistence
const inMemoryTeams = [];

try {
  if (fs.existsSync(memoryBackupPath)) {
    const rawData = fs.readFileSync(memoryBackupPath, 'utf-8');
    const parsedData = JSON.parse(rawData);
    if (Array.isArray(parsedData)) {
      inMemoryTeams.push(...parsedData);
      console.log(`[Memory Persistence] Restored ${parsedData.length} registration(s) from local JSON backup.`);
    }
  }
} catch (err) {
  console.warn('[Memory Persistence Warning] Could not restore backup:', err.message);
}

const saveInMemoryTeamsBackup = () => {
  try {
    fs.writeFileSync(memoryBackupPath, JSON.stringify(inMemoryTeams, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Memory Persistence Warning] Could not write backup:', err.message);
  }
};

// @desc    Register new startup team
// @route   POST /api/teams/register
// @access  Public
exports.registerTeam = async (req, res, next) => {
  try {
    const adminController = require('./adminController');
    if (adminController.getIsRegistrationOpen && !adminController.getIsRegistrationOpen()) {
      return res.status(400).json({
        success: false,
        message: 'Registration for Startup Pitching Competition 2026 is currently CLOSED by the admin.'
      });
    }

    const {
      teamName,
      startupName,
      leaderName,
      leaderRegNo,
      leaderDept,
      leaderYear,
      leaderEmail,
      leaderPhone,
      member2Name,
      member2RegNo,
      member2Dept,
      member2Year,
      member3Name,
      member3RegNo,
      member3Dept,
      member3Year,
      problemStatement,
      abstract,
      innovationDomain,
      declarationConfirmed
    } = req.body;

    // Basic Validation
    if (!declarationConfirmed || (declarationConfirmed !== 'true' && declarationConfirmed !== true)) {
      return res.status(400).json({ success: false, message: 'You must confirm that the submitted idea is original.' });
    }

    if (!teamName || !leaderName || !leaderRegNo || !leaderDept || !leaderYear || !leaderEmail || !leaderPhone || !problemStatement || !abstract || !innovationDomain) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    // Eligibility check
    if (!['2nd Year', '3rd Year'].includes(leaderYear)) {
      return res.status(400).json({ success: false, message: 'Only 2nd Year and 3rd Year students are eligible.' });
    }

    // Abstract Word Count Validation
    const wordCount = abstract.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 300) {
      return res.status(400).json({ success: false, message: `Abstract exceeds 300 words limit (Current: ${wordCount} words).` });
    }

    // File Upload Verification
    if (!req.files || !req.files.pptFile || !req.files.eurekaScreenshot) {
      return res.status(400).json({ success: false, message: 'Both PPT file and Eureka Registration Screenshot are required uploads.' });
    }

    const pptFilePath = (req.files.pptFile[0] && req.files.pptFile[0].cloudinaryUrl)
      ? req.files.pptFile[0].cloudinaryUrl
      : ('/uploads/ppt/' + req.files.pptFile[0].filename);

    const screenshotPath = (req.files.eurekaScreenshot[0] && req.files.eurekaScreenshot[0].cloudinaryUrl)
      ? req.files.eurekaScreenshot[0].cloudinaryUrl
      : ('/uploads/screenshots/' + req.files.eurekaScreenshot[0].filename);
    const formattedLeaderRegNo = leaderRegNo.trim().toUpperCase();
    const formattedLeaderEmail = leaderEmail.trim().toLowerCase();

    // Check duplicate leader register number or duplicate leader email
    if (getIsConnected()) {
      const existingTeam = await Team.findOne({
        $or: [
          { 'leader.registerNumber': formattedLeaderRegNo },
          { 'leader.email': formattedLeaderEmail }
        ]
      });

      if (existingTeam) {
        if (existingTeam.leader && existingTeam.leader.registerNumber === formattedLeaderRegNo) {
          return res.status(400).json({ success: false, message: `A team with Leader Register Number (${formattedLeaderRegNo}) has already registered!` });
        }
        if (existingTeam.leader && existingTeam.leader.email && existingTeam.leader.email.toLowerCase() === formattedLeaderEmail) {
          return res.status(400).json({ success: false, message: `A team has already registered using Leader Email (${formattedLeaderEmail})! Each Gmail / Email address can only register once.` });
        }
      }
    } else {
      const existingTeam = inMemoryTeams.find(t =>
        t.leader && (
          t.leader.registerNumber === formattedLeaderRegNo ||
          (t.leader.email && t.leader.email.toLowerCase() === formattedLeaderEmail)
        )
      );

      if (existingTeam) {
        if (existingTeam.leader && existingTeam.leader.registerNumber === formattedLeaderRegNo) {
          return res.status(400).json({ success: false, message: `A team with Leader Register Number (${formattedLeaderRegNo}) has already registered!` });
        }
        if (existingTeam.leader && existingTeam.leader.email && existingTeam.leader.email.toLowerCase() === formattedLeaderEmail) {
          return res.status(400).json({ success: false, message: `A team has already registered using Leader Email (${formattedLeaderEmail})! Each Gmail / Email address can only register once.` });
        }
      }
    }

    // Build members array
    const members = [];
    if (member2Name && member2Name.trim() !== '') {
      members.push({
        name: member2Name.trim(),
        registerNumber: member2RegNo ? member2RegNo.trim().toUpperCase() : '',
        department: member2Dept ? member2Dept.trim() : '',
        year: member2Year || ''
      });
    }
    if (member3Name && member3Name.trim() !== '') {
      members.push({
        name: member3Name.trim(),
        registerNumber: member3RegNo ? member3RegNo.trim().toUpperCase() : '',
        department: member3Dept ? member3Dept.trim() : '',
        year: member3Year || ''
      });
    }

    const teamData = {
      teamName: teamName.trim(),
      startupName: startupName ? startupName.trim() : teamName.trim(),
      leader: {
        name: leaderName.trim(),
        registerNumber: formattedLeaderRegNo,
        department: leaderDept.trim(),
        year: leaderYear,
        email: leaderEmail.trim().toLowerCase(),
        phone: leaderPhone.trim()
      },
      members,
      problemStatement: problemStatement.trim(),
      abstract: abstract.trim(),
      innovationDomain: innovationDomain,
      pptFile: pptFilePath,
      eurekaScreenshot: screenshotPath,
      status: 'Pending Verification',
      rejectionReason: '',
      submittedAt: new Date()
    };

    let newTeam;
    if (getIsConnected()) {
      newTeam = await Team.create(teamData);
    } else {
      newTeam = {
        _id: 'mem_' + Date.now() + '_' + Math.round(Math.random() * 1000),
        ...teamData
      };
      inMemoryTeams.unshift(newTeam);
      saveInMemoryTeamsBackup();
    }

    // Dispatch backup email (PPT + Screenshot) asynchronously to for12345freelancing@gmail.com
    const { sendBackupEmail, sendEmail } = require('../utils/sendEmail');
    sendBackupEmail(newTeam).then(res => {
      console.log(`[Auto Backup] Sent for team "${newTeam.teamName}":`, res.success);
    }).catch(err => {
      console.error(`[Auto Backup Error] Team "${newTeam.teamName}":`, err.message);
    });

    // Dispatch registration receipt email to team leader (Confirmation only, no QR code until approved)
    if (newTeam.leader && newTeam.leader.email) {
      sendEmail({
        email: newTeam.leader.email,
        subject: `Registration Received - Team "${newTeam.teamName}" | Startup Pitching Competition 2026`,
        message: `Dear ${newTeam.leader.name},\n\nThank you for registering your team "${newTeam.teamName}" (${newTeam.startupName || newTeam.teamName}) for the Intra-College Startup Pitching Competition 2026.\n\nYour application has been received successfully and is currently Pending Verification by the E-Cell panel.\n\n📌 MANDATORY NEXT STEP - Join Official WhatsApp Community:\nPlease join our official participant WhatsApp group to receive presentation batch timings, auditorium venue updates, and live event announcements:\nhttps://chat.whatsapp.com/CUD8nrqBTp46zWPFdKmrQW?s=qt&p=a&ilr=4\n\nOnce your submission is reviewed and approved by the admin team, you will receive an official Approval Email containing your Auditorium Entry QR Pass.`
      }).then(async (emailRes) => {
        console.log(`[Student Confirmation Email] Sent to ${newTeam.leader.email}:`, emailRes.success);
        newTeam.emailLogs = newTeam.emailLogs || [];
        newTeam.emailLogs.push({
          emailType: 'Registration Receipt',
          recipient: newTeam.leader.email,
          status: emailRes.success ? 'Sent' : 'Failed',
          provider: emailRes.provider || 'Direct',
          error: emailRes.error || '',
          sentAt: new Date()
        });
        if (getIsConnected()) await newTeam.save();
      }).catch(async (err) => {
        console.error(`[Student Confirmation Email Error]:`, err.message);
        newTeam.emailLogs = newTeam.emailLogs || [];
        newTeam.emailLogs.push({
          emailType: 'Registration Receipt',
          recipient: newTeam.leader.email,
          status: 'Failed',
          error: err.message,
          sentAt: new Date()
        });
        if (getIsConnected()) await newTeam.save();
      });
    }

    // Broadcast real-time SSE event to all connected Admin dashboards
    const { broadcastSseEvent } = require('../utils/sseHub');
    broadcastSseEvent('team_registered', {
      teamId: newTeam._id,
      teamName: newTeam.teamName,
      leaderName: newTeam.leader.name,
      department: newTeam.leader.department
    });

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully! Your application status is Pending Verification.',
      data: {
        teamId: newTeam._id,
        teamName: newTeam.teamName,
        leaderName: newTeam.leader.name,
        leaderRegNo: newTeam.leader.registerNumber,
        status: newTeam.status,
        submittedAt: newTeam.submittedAt
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Check team submission status by Leader Email or Register Number
// @route   GET /api/teams/status
// @access  Public
exports.getTeamStatus = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please enter Leader Email or Register Number to check status.' });
    }

    const searchQuery = query.trim();
    let team;

    if (getIsConnected()) {
      team = await Team.findOne({
        $or: [
          { 'leader.email': searchQuery.toLowerCase() },
          { 'leader.registerNumber': searchQuery.toUpperCase() }
        ]
      });
    } else {
      team = inMemoryTeams.find(t =>
        t.leader.email === searchQuery.toLowerCase() ||
        t.leader.registerNumber === searchQuery.toUpperCase()
      );
    }

    if (!team) {
      return res.status(404).json({ success: false, message: 'No registration found for the provided Email or Register Number.' });
    }

    res.status(200).json({
      success: true,
      data: {
        id: team._id,
        teamName: team.teamName,
        startupName: team.startupName || team.teamName,
        leaderName: team.leader ? team.leader.name : 'Leader',
        registerNumber: team.leader ? team.leader.registerNumber : '',
        department: team.leader ? team.leader.department : '',
        year: team.leader ? team.leader.year : '',
        innovationDomain: team.innovationDomain,
        status: team.status,
        checkedIn: team.checkedIn || false,
        checkedInAt: team.checkedInAt || null,
        rejectionReason: team.rejectionReason,
        submittedAt: team.submittedAt
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Download PPT Template
// @route   GET /api/teams/template
// @access  Public
exports.downloadPptTemplate = (req, res) => {
  const rootOfficialTemplatePath = path.join(__dirname, '../Official-eureka-template.pptx');
  const assetOfficialTemplatePath = path.join(__dirname, '../client/assets/Official-eureka-template.pptx');
  const assetTemplatePath = path.join(__dirname, '../client/assets/Startup_Pitch_Template.pptx');

  if (fs.existsSync(rootOfficialTemplatePath)) {
    return res.download(rootOfficialTemplatePath, 'Official-eureka-template.pptx');
  } else if (fs.existsSync(assetOfficialTemplatePath)) {
    return res.download(assetOfficialTemplatePath, 'Official-eureka-template.pptx');
  } else if (fs.existsSync(assetTemplatePath)) {
    return res.download(assetTemplatePath, 'Official-eureka-template.pptx');
  } else {
    res.status(404).json({ success: false, message: 'PPT Template file not found.' });
  }
};

module.exports.inMemoryTeams = inMemoryTeams;
module.exports.saveInMemoryTeamsBackup = saveInMemoryTeamsBackup;
