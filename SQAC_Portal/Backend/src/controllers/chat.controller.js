const Message = require('../models/Message');

/**
 * GET /api/chat/group?before=<timestamp>&limit=50
 * Fetch paginated group messages (newest first).
 */
exports.getGroupMessages = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const query = { chatType: 'group' };

    if (req.query.before) {
      query.timestamp = { $lt: new Date(req.query.before) };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('sender', 'name username profilePic')
      .lean();

    res.json({ messages: messages.reverse(), count: messages.length });
  } catch (err) {
    console.error('getGroupMessages error:', err);
    res.status(500).json({ error: 'Failed to fetch group messages' });
  }
};

/**
 * GET /api/chat/direct/:userId?before=<timestamp>&limit=50
 * Fetch paginated direct conversation between logged-in user and :userId.
 */
exports.getDirectMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user.userId;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const query = {
      chatType: 'direct',
      $or: [
        { sender: myId, receiver: userId },
        { sender: userId, receiver: myId },
      ],
    };

    if (req.query.before) {
      query.timestamp = { $lt: new Date(req.query.before) };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('sender', 'name username profilePic')
      .lean();

    res.json({ messages: messages.reverse(), count: messages.length });
  } catch (err) {
    console.error('getDirectMessages error:', err);
    res.status(500).json({ error: 'Failed to fetch direct messages' });
  }
};
