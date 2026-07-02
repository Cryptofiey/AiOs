import { google } from 'googleapis';
import { OAuth2Client, GoogleAuth } from 'google-auth-library';

export class WorkspaceAgent {
  private authClient: any;

  constructor(authConfig?: { accessToken?: string, credentialsPath?: string }) {
    if (authConfig?.accessToken) {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: authConfig.accessToken });
      this.authClient = oauth2Client;
    } else if (authConfig?.credentialsPath) {
      this.authClient = new google.auth.GoogleAuth({
        keyFile: authConfig.credentialsPath,
        scopes: [
          'https://www.googleapis.com/auth/tasks',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/chat.spaces',
          'https://www.googleapis.com/auth/chat.messages',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/keep',
          'https://www.googleapis.com/auth/documents'
        ],
      });
    } else {
      // Fallback to Application Default Credentials
      this.authClient = new google.auth.GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/tasks',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/chat.spaces',
          'https://www.googleapis.com/auth/chat.messages',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/keep',
          'https://www.googleapis.com/auth/documents'
        ],
      });
    }
  }

  // --- GOOGLE TASKS (Kanban orchestration) ---
  public async getTaskLists() {
    const tasks = google.tasks({ version: 'v1', auth: this.authClient });
    const res = await tasks.tasklists.list();
    return res.data.items || [];
  }

  public async getTasks(taskListId: string) {
    const tasks = google.tasks({ version: 'v1', auth: this.authClient });
    const res = await tasks.tasks.list({ tasklist: taskListId });
    return res.data.items || [];
  }
  
  public async createTask(taskListId: string, title: string, notes: string) {
    const tasks = google.tasks({ version: 'v1', auth: this.authClient });
    const res = await tasks.tasks.insert({
      tasklist: taskListId,
      requestBody: { title, notes },
    });
    return res.data;
  }

  // --- GOOGLE CHAT (AI-to-Human or AI-to-AI communication) ---
  public async listSpaces() {
    const chat = google.chat({ version: 'v1', auth: this.authClient });
    const res = await chat.spaces.list();
    return res.data.spaces || [];
  }

  public async sendMessage(spaceName: string, text: string) {
    const chat = google.chat({ version: 'v1', auth: this.authClient });
    const res = await chat.spaces.messages.create({
      parent: spaceName,
      requestBody: { text }
    });
    return res.data;
  }

  // --- GOOGLE DRIVE (Memory storage & picking) ---
  public async listFiles(query?: string) {
    const drive = google.drive({ version: 'v3', auth: this.authClient });
    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType)',
      pageSize: 10,
    });
    return res.data.files || [];
  }

  public async getFileContent(fileId: string): Promise<string> {
    const drive = google.drive({ version: 'v3', auth: this.authClient });
    const res = await drive.files.get({
      fileId,
      alt: 'media'
    }, { responseType: 'text' });
    return res.data as unknown as string;
  }

  public async updateFileContent(fileId: string, content: string): Promise<void> {
    const drive = google.drive({ version: 'v3', auth: this.authClient });
    await drive.files.update({
      fileId,
      media: {
        mimeType: 'application/json',
        body: content
      }
    });
  }

  public async createFileContent(name: string, content: string): Promise<any> {
    const drive = google.drive({ version: 'v3', auth: this.authClient });
    const res = await drive.files.create({
      requestBody: { name, mimeType: 'application/json' },
      media: {
        mimeType: 'application/json',
        body: content
      }
    });
    return res.data;
  }

  // --- GOOGLE CALENDAR (Event & Sync orchestration) ---
  public async listUpcomingEvents(calendarId: string = 'primary') {
    const calendar = google.calendar({ version: 'v3', auth: this.authClient });
    const res = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return res.data.items || [];
  }

  public async createEvent(calendarId: string, summary: string, description: string, startTime: string, endTime: string) {
    const calendar = google.calendar({ version: 'v3', auth: this.authClient });
    const res = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary,
        description,
        start: { dateTime: startTime },
        end: { dateTime: endTime }
      }
    });
    return res.data;
  }

  // --- GOOGLE DOCS (Long document parsing/generation) ---
  public async readDocument(documentId: string) {
    const docs = google.docs({ version: 'v1', auth: this.authClient });
    const res = await docs.documents.get({ documentId });
    return res.data;
  }

  // --- GOOGLE KEEP (Fast text/list scratchpad) ---
  public async listNotes() {
    const keep = google.keep({ version: 'v1', auth: this.authClient });
    const res = await keep.notes.list();
    return res.data.notes || [];
  }

  public async createNote(title: string, content: string) {
    const keep = google.keep({ version: 'v1', auth: this.authClient });
    const res = await keep.notes.create({
      requestBody: {
        title,
        body: { text: { text: content } }
      }
    });
    return res.data;
  }
}
