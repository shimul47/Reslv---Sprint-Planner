const Ticket = require("../models/Ticket");

exports.createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;

    const ticket = await Ticket.create({
      title,
      description,
      companyId: req.user.companyId, // Force strict tenant scoping
      createdBy: req.user.id,
    });

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTickets = async (req, res) => {
  try {
    // The most important part of multi-tenancy: always query by companyId
    const tickets = await Ticket.find({
      companyId: req.user.companyId,
    }).populate("createdBy", "name email");

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
