import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format } from 'date-fns';
import pt from 'date-fns/locale/pt';
import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointment';
import Notification from '../schemas/Notification';

import CancellationMail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

class AppointmentController {
  // eslint-disable-next-line class-methods-use-this
  async index(req, res) {
    const { page = 1 } = req.query;

    const appointment = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'],
      attributes: ['id', 'date', 'past', 'cancelable'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });

    return res.json(appointment);
  }

  // eslint-disable-next-line class-methods-use-this
  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { provider_id, date } = req.body;

    /**
     * Verificando se o usuário cadastrado e o mesmo da requisição.
     * Caso for não cadastra
     */
    const checkUserId = await User.findOne({
      where: { id: req.userId },
    });

    if (checkUserId) {
      return res.status(400).json({ error: 'Not create date in user' });
    }

    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    /**
     * Check if provider_id is a provider
     */

    if (!isProvider) {
      return res
        .status(401)
        .json({ error: 'You can only create appointments with providers' });
    }

    /**
     * Check for past dates
     */

    const hourStart = startOfHour(parseISO(date));

    /**
     * Checando data partir do dia pra frente anterior não será cadastrada
     */

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Pas dates are not permitted' });
    }

    /**
     * Check date availability
     * Checando se existe já uma data cadastrada
     */

    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    /**
     * Caso já exista uma data exibir essa mensagem de erro.
     */

    if (checkAvailability) {
      return res
        .status(400)
        .json({ error: 'Appointment date is not available' });
    }

    /**
     * Criando agendamento no banco de dados passando as informações (user_id/provider_id/date)
     */

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date,
    });

    /**
     * Notify appointment provider
     */

    /**
     * Procurando  usário no banco relacionado Postgress pelo ID (findByPk)
     */
    const user = await User.findByPk(req.userId);

    /**
     * Formatando a data do usuário cadastrado na variavel hourStart com format (date-fns)
     * Passando a tradução com pt do (date-fns/locale/pt)
     */
    const formattedDate = format(
      hourStart,
      "'dia' dd 'de' MMMM', às' H:mm'h'",
      { locale: pt }
    );

    /**
     * Adicionando informações no banco mongoose (content/user)
     * E passando ID do provider (barbearia)
     */
    await Notification.create({
      content: `Novo agendamento de ${user.name} para ${formattedDate}`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  // eslint-disable-next-line class-methods-use-this
  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: 'You can only cancel appointment 2 hours in advance',
      });
    }

    appointment.canceled_at = new Date();

    await appointment.save();

    await Queue.add(CancellationMail.key, {
      appointment,
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();
