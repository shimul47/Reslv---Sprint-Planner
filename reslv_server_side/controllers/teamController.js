import User from "../models/User.js";
import Invite from "../models/Invite.js";

export const getTeamMembers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    const invites = await Invite.find({ status: "Pending" });
    const formattedUsers = users.map((user) => {
      const displayRole = Array.isArray(user.roles) ? user.roles[0] : user.role;

      return {
        id: user._id,
        name: user.name || "Unknown User",
        email: user.email,
        role: displayRole || "agent",
        status: "Active",
      };
    });

    const formattedInvites = invites.map((invite) => ({
      id: invite._id,
      name: "Pending User",
      email: invite.email,
      role: invite.role,
      status: invite.status,
    }));
    const team = [...formattedUsers, ...formattedInvites];

    res.status(200).json({ team });
  } catch (error) {
    console.error("Error fetching team data:", error);
    res.status(500).json({ message: "Failed to load team data." });
  }
};
