import { api } from "./api.service";
import {
  CaseDocument,
  CaseDocumentVersion,
  CreateCaseDocumentData,
  CreateDocumentVersionData,
  SelectedDocumentFile,
} from "../types/case-document.types";
import { Directory, File, Paths } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";

function appendFileToFormData(formData: FormData, file: SelectedDocumentFile) {
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || "application/octet-stream",
  } as unknown as Blob);
}

export const caseDocumentsService = {
  async getByCase(caseId: string): Promise<CaseDocument[]> {
    const response = await api.get<CaseDocument[]>(
      `/cases/${caseId}/documents`,
    );

    return response.data;
  },

  async create(
    caseId: string,
    data: CreateCaseDocumentData,
    file: SelectedDocumentFile,
  ): Promise<CaseDocument> {
    const formData = new FormData();

    formData.append("name", data.name);
    formData.append("type", data.type);

    if (data.description) {
      formData.append("description", data.description);
    }

    if (data.notes) {
      formData.append("notes", data.notes);
    }

    appendFileToFormData(formData, file);

    const response = await api.post<CaseDocument>(
      `/cases/${caseId}/documents`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000,
      },
    );

    return response.data;
  },

  async getVersions(documentId: string): Promise<CaseDocumentVersion[]> {
    const response = await api.get<CaseDocumentVersion[]>(
      `/documents/${documentId}/versions`,
    );

    return response.data;
  },

  getPreviewPath(versionId: string): string {
    return `/documents/versions/${versionId}/preview`;
  },

  getDownloadPath(versionId: string): string {
    return `/documents/versions/${versionId}/download`;
  },

  async createVersion(
    documentId: string,
    data: CreateDocumentVersionData,
    file: SelectedDocumentFile,
  ): Promise<CaseDocumentVersion> {
    const formData = new FormData();

    if (data.notes) {
      formData.append("notes", data.notes);
    }

    appendFileToFormData(formData, file);

    const response = await api.post<CaseDocumentVersion>(
      `/documents/${documentId}/versions`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000,
      },
    );

    return response.data;
  },

  getDownloadUrl(versionId: string): string {
    const baseURL = api.defaults.baseURL;

    if (!baseURL) {
      throw new Error("La URL del servidor no está configurada");
    }

    return `${baseURL}/documents/versions/${versionId}/download`;
  },

  async archive(documentId: string): Promise<CaseDocument> {
    const response = await api.patch<CaseDocument>(
      `/documents/${documentId}/archive`,
    );

    return response.data;
  },

  async restore(documentId: string): Promise<CaseDocument> {
    const response = await api.patch<CaseDocument>(
      `/documents/${documentId}/restore`,
    );

    return response.data;
  },

  async remove(documentId: string): Promise<void> {
    await api.delete(`/documents/${documentId}`);
  },
};
