import User from "../models/User.js";
import Notice from "../models/Notice.js";
import Meeting from "../models/Meeting.js";
import sendMail from "../lib/mailer.js";
import {
  getMeetingEmailTemplate,
  getPlainTextTemplate,
} from "../lib/MeetMail.js";
import { generateGoogleCalendarLink } from "../lib/calender.service.js";
import Attendance from "../models/Attendance.js";
import { PERMISSIONS } from "../middleware/permissions.middleware.js";
import {
  approvalEmail,
  rejectionEmail,
  meetingScheduledEmail,
  newNoticeEmail,
  warningEmail,
} from "../lib/email-templates.js";
const getmembers = async (req, res) => {
  if (!PERMISSIONS.VIEW_MEMBERS.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  try {
    const members = await User.find({
      role: { $ne: "secretary" },
      approved: true
    }).sort({ createdAt: -1 });
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const getSubAdmins = async (req, res) => {
  if (req.user.role !== "secretary") {
    return res.status(403).json({ message: "Not authorized" });
  }
  try {
    const subAdmins = await User.find({ role: "joint_secretary" });
    res.json(subAdmins);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const deleteUser = async (req, res) => {
  if (!PERMISSIONS.DELETE_MEMBER.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const deleteSubAdmin = async (req, res) => {
  if (!PERMISSIONS.DELETE_MEMBER.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: "SubAdmin deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const changeposition = async (req, res) => {
  if (!PERMISSIONS.CHANGE_ROLE.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  try {
    const { id } = req.params;
    const { position } = req.body;
    await User.findByIdAndUpdate(id, { position });
    res.json({ message: "Position updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const changerole = async (req, res) => {
  if (!PERMISSIONS.CHANGE_ROLE.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  try {
    const { id } = req.params;
    const { role } = req.body;
    await User.findByIdAndUpdate(id, { role });
    res.json({ message: "Role updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const allowmember = async (req, res) => {
  if (!PERMISSIONS.APPROVE_MEMBER.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorised" });
  }
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.approved = true;
    await user.save();

    // Send confirmation email using centralized template
    try {
      const loginLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/login`;
      await sendMail({
        to: user.email,
        subject: "SQAC Portal — Welcome! Your Account is Now Active",
        html: approvalEmail(user, loginLink),
      });
      console.log(`Approval email sent to ${user.email}`);
    } catch (mailErr) {
      console.error("Failed to send approval email:", mailErr);
    }

    res.json({ message: "Member approved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const showstatus = async (req, res) => {
  if (req.user.role !== "secretary" && req.user.role !== "joint_secretary") {
    return res.status(403).json({ message: "Not authorised" });
  }
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ approved: user.approved });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const rejectmember = async (req, res) => {
  if (!PERMISSIONS.REJECT_MEMBER.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorised" });
  }
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send rejection email with reason using centralized template
    try {
      await sendMail({
        to: user.email,
        subject: "SQAC Portal — Application Status Update",
        html: rejectionEmail(user, rejectionReason || ''),
      });
      console.log(`Rejection email sent to ${user.email}`);
    } catch (mailErr) {
      console.error("Failed to send rejection email:", mailErr);
    }

    await User.findByIdAndDelete(id);
    res.json({ message: "Member rejected successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const getpendingmembers = async (req, res) => {
  if (!PERMISSIONS.APPROVE_MEMBER.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorised" });
  }
  try {
    const pendingMembers = await User.find({ approved: false });
    res.json(pendingMembers);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const getnotices = async (req, res) => {
  try {
    const notices = await Notice.find();
    res.json(notices);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const createnotice = async (req, res) => {
  if (!PERMISSIONS.SEND_NOTICE.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorised" });
  }
  try {
    const { title, description, domain, subdomain, image, link } = req.body;
    const author = req.user.name;
    // Map 'subdomain' from frontend to 'subDomain' for Mongoose schema
    const notice = new Notice({
      title,
      desc: description,
      domain,
      subDomain: subdomain,
      image,
      link,
      author,
    });
    await notice.save();

    // Fire-and-forget: email relevant members about the new notice
    (async () => {
      try {
        const d = domain || "Board";
        let userFilter = { approved: true };
        if (d === "Technical") userFilter.coreDomain = "Technical";
        else if (d === "Corporate") userFilter.coreDomain = "Corporate";
        else if (d !== "Board") userFilter.subDomain = d;

        const portalLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/admin/notice`;
        const recipients = await User.find(userFilter, "email name").lean();
        await Promise.allSettled(
          recipients.map((u) =>
            sendMail({
              to: u.email,
              subject: `SQAC Portal — New Notice: ${title}`,
              html: newNoticeEmail(notice, portalLink),
            })
          )
        );
      } catch (e) {
        console.error("Notice notification emails failed:", e);
      }
    })();

    res.json({ message: "Notice created successfully" });
  } catch (error) {
    console.error("CREATE NOTICE ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const deletenotice = async (req, res) => {
  if (req.user.role !== "secretary") {
    return res.status(403).json({ message: "Not authorised" });
  }
  try {
    const { id } = req.params;
    await Notice.findByIdAndDelete(id);
    res.json({ message: "Notice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const createMeet = async (req, res) => {
  if (!PERMISSIONS.SCHEDULE_MEET.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorised" });
  }
  try {
    const { title, startdate, starttime, link, description, teamScope } = req.body;
    if (!title || !startdate || !starttime || !link) {
      return res.status(400).json({ message: "Fill important fields" });
    }
    const meet = new Meeting({
      title,
      startDate: startdate,
      startTime: starttime,
      meetlink: link,
      description,
      teamScope: teamScope || "all",
      createdBy: req.userId,
    });
    await meet.save();

    // Fire-and-forget: email relevant members about the new meeting
    (async () => {
      try {
        const scope = (teamScope || "all").toLowerCase();
        let userFilter = { approved: true };
        if (scope === "technical") userFilter.coreDomain = "Technical";
        else if (scope === "corporate") userFilter.coreDomain = "Corporate";
        else if (scope !== "all") userFilter.subDomain = teamScope;

        const calendarLink = generateGoogleCalendarLink(meet);
        const recipients = await User.find(userFilter, "email name").lean();
        await Promise.allSettled(
          recipients.map((u) =>
            sendMail({
              to: u.email,
              subject: `SQAC Portal — New Meeting: ${title}`,
              html: meetingScheduledEmail(meet, calendarLink),
            })
          )
        );
      } catch (e) {
        console.error("Meeting notification emails failed:", e);
      }
    })();

    res.status(200).json({ message: "Meeting Created successfully", meet });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const deleteMeet = async (req, res) => {
  if (!PERMISSIONS.SCHEDULE_MEET.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorised" });
  }

  try {
    const { id } = req.params;
    await Meeting.findByIdAndDelete(id);
    res.json({ message: "Meeting successfully deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const editMeet = async (req, res) => {
  if (!PERMISSIONS.SCHEDULE_MEET.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorised" });
  }

  try {
    const { id } = req.params;
    const { title, startdate, starttime, link, description, teamScope } = req.body;

    const updated = await Meeting.findByIdAndUpdate(id, {
      title,
      startDate: startdate,
      startTime: starttime,
      meetlink: link,
      description,
      teamScope: teamScope || "all",
    }, { new: true });
    res.status(200).json({ message: "Meet details updated successfully", updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMeet = async (req, res) => {
  try {
    const meets = await Meeting.find().populate("createdBy", "name email");
    res.status(200).json(meets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendMeetCalenderMail = async (req, res) => {};

const sendWarning = async (req, res) => {
  if (!PERMISSIONS.ISSUE_WARNING.includes(req.user.role)) {
    return res.status(403).json({ message: "Not authorised" });
  }
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Warning reason is required" });
    }
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await sendMail({
      to: user.email,
      subject: "SQAC Portal — Official Warning Issued",
      html: warningEmail(user, reason.trim(), req.user.name),
    });

    res.json({ message: `Warning sent to ${user.name}` });
  } catch (error) {
    console.error("SEND WARNING ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const addAttendance = async (req, res) => {
  try {
    const { userID, date, clockIn, clockOut, status, meetType } = req.body;
    if (!userID || !date || !clockIn) {
      return res.status(400).json({ message: "Required fields missing" });
    }
    const attendance = new Attendance({
      userId: userID,
      date,
      clockIn,
      clockOut,
      status,
      meetType,
    });
    await attendance.save();
    res.status(200).json({ message: "Attendance added successfully", attendance });
  } catch (error) {
    console.error("ADD ATTENDANCE ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAttendance = async (req, res) => {
  try {
    const { userID } = req.params;
    const attendanceRecords = await Attendance.find({ userId: userID }).populate("userId", "name email");
    res.status(200).json(attendanceRecords);
  } catch (error) {
    console.error("GET USER ATTENDANCE ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getALlAttendace = async (req, res) => {
  try {
    const attendanceRecords = await Attendance.find().populate(
      "userId",
      "name email coreDomain subDomain role"
    ).sort({ date: -1 });
    res.status(200).json(attendanceRecords);
  } catch (error) {
    console.error("GET ALL ATTENDANCE ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const editAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, clockIn, clockOut, status, meetType } = req.body;
    const updated = await Attendance.findByIdAndUpdate(id, {
      date,
      clockIn,
      clockOut,
      status,
      meetType,
    }, { new: true });
    res.status(200).json({ message: "Attendance updated successfully", updated });
  } catch (error) {
    console.error("EDIT ATTENDANCE ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAttendanceByDomain = async (req, res) => {
  try {
    const data = await Attendance.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $group: {
          _id: {
            domain: "$user.domain",
            subdomain: "$user.subdomain",
          },
          members: {
            $push: {
              name: "$user.name",
              status: "$status",
              date: "$date",
              clockIn: "$clockIn",
              clockOut: "$clockOut",
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.domain",
          subdomains: {
            $push: {
              subdomain: "$_id.subdomain",
              members: "$members",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          domain: "$_id",
          subdomains: 1,
        },
      },
    ]);

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};



const getAttendanceByDomainSubdomain = async (req, res) => {
  try {
    const { domain, subdomain } = req.query;

    const data = await User.aggregate([
      {
        $match: {
          domain,
          subdomain
        }
      },
      {
        $lookup: {
          from: "attendances",
          localField: "_id",
          foreignField: "userId",
          as: "attendance"
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          domain: 1,
          subdomain: 1,
          attendance: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export {
  getmembers,
  getSubAdmins,
  deleteUser,
  deleteSubAdmin,
  changeposition,
  changerole,
  allowmember,
  showstatus,
  rejectmember,
  getpendingmembers,
  getnotices,
  createnotice,
  deletenotice,
  createMeet,
  deleteMeet,
  editMeet,
  getMeet,
  sendWarning,
  addAttendance,
  getAttendance,
  getALlAttendace,
  editAttendance,
  getAttendanceByDomain,
  getAttendanceByDomainSubdomain
};
