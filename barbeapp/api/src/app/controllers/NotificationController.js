import User from '../models/User';
import Notification from '../schemas/Notification';

class NotificationController {
  // eslint-disable-next-line class-methods-use-this
  async index(req, res) {
    /**
     * Verificação se o usuário e provider
     */

    const checkIsProvider = await User.findOne({
      where: { id: req.userId, provider: true },
    });

    if (!checkIsProvider) {
      return res
        .status(401)
        .json({ error: 'Only provider can load notifications' });
    }

    /**
     * Pegando todas as notificações pelo usuário logado
     */
    const notifications = await Notification.find({
      user: req.userId,
    })
      .sort({ createdAt: 'desc' })
      .limit(20);

    return res.json(notifications);
  }

  // eslint-disable-next-line class-methods-use-this
  async update(req, res) {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    return res.json(notification);
  }
}

export default new NotificationController();
