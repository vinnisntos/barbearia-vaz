import { google } from 'googleapis';
import type { Agendamento, Calendario } from '../portas';

export class CalendarioGoogle implements Calendario {
  private api;
  constructor(
    clienteId: string,
    segredo: string,
    refreshToken: string,
    private calendarioId: string,
  ) {
    const oauth = new google.auth.OAuth2(clienteId, segredo);
    oauth.setCredentials({ refresh_token: refreshToken });
    this.api = google.calendar({ version: 'v3', auth: oauth });
  }
  async intervalosOcupados(inicio: string, fim: string) {
    const r = await this.api.freebusy.query({
      requestBody: {
        timeMin: inicio,
        timeMax: fim,
        timeZone: 'America/Sao_Paulo',
        items: [{ id: this.calendarioId }],
      },
    });
    return (r.data.calendars?.[this.calendarioId]?.busy ?? [])
      .filter((b) => b.start && b.end)
      .map((b) => ({ inicio: b.start!, fim: b.end! }));
  }
  async criarEvento(a: Agendamento) {
    const r = await this.api.events.insert({
      calendarId: this.calendarioId,
      requestBody: {
        summary: `${a.servicosResumo} — ${a.nomeCliente}`,
        start: { dateTime: a.dataInicio, timeZone: 'America/Sao_Paulo' },
        end: { dateTime: a.dataFim, timeZone: 'America/Sao_Paulo' },
      },
    });
    if (!r.data.id) throw new Error('Google Calendar não retornou id');
    return r.data.id;
  }
  async removerEvento(id: string) {
    await this.api.events.delete({ calendarId: this.calendarioId, eventId: id });
  }
}
