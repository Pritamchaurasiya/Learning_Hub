/**
 * Learning Hub SDK Authentication
 */

import axios, { AxiosInstance } from 'axios';
import { AuthenticationError, APIError } from './exceptions';
import { AuthTokens, LoginCredentials } from './types';

export class Auth {
  private baseURL: string;
  private apiKey?: string;
  private username?: string;
  private password?: string;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: number;
  private axiosInstance: AxiosInstance;

  constructor(config: { baseURL: string; apiKey?: string; username?: string; password?: string }) {
    this.baseURL = config.baseURL.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.username = config.username;
    this.password = config.password;
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
    });
  }

  async authenticate(): Promise<AuthTokens> {
    if (this.apiKey) {
      return this.authenticateWithApiKey();
    } else if (this.username && this.password) {
      return this.authenticateWithCredentials();
    } else {
      throw new AuthenticationError('No authentication credentials provided');
    }
  }

  private async authenticateWithApiKey(): Promise<AuthTokens> {
    this.accessToken = this.apiKey;
    return { access: this.apiKey, refresh: '' };
  }

  private async authenticateWithCredentials(): Promise<AuthTokens> {
    try {
      const response = await this.axiosInstance.post('/api/v1/auth/login/', {
        username: this.username,
        password: this.password,
      } as LoginCredentials);

      const tokens = response.data;
      this.accessToken = tokens.access;
      this.refreshToken = tokens.refresh;
      this.tokenExpiresAt = Date.now() + 3600000; // 1 hour

      return tokens;
    } catch (error: any) {
      throw new AuthenticationError(`Authentication failed: ${error.message}`);
    }
  }

  getHeaders(): Record<string, string> {
    if (!this.accessToken) {
      throw new AuthenticationError('Not authenticated');
    }

    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new AuthenticationError('No refresh token available');
    }

    try {
      const response = await this.axiosInstance.post('/api/v1/auth/refresh/', {
        refresh: this.refreshToken,
      });

      const tokens = response.data;
      this.accessToken = tokens.access;
      this.tokenExpiresAt = Date.now() + 3600000; // 1 hour

      return this.accessToken;
    } catch (error: any) {
      throw new AuthenticationError(`Token refresh failed: ${error.message}`);
    }
  }

  isTokenExpired(): boolean {
    if (!this.tokenExpiresAt) {
      return true;
    }

    return Date.now() >= this.tokenExpiresAt;
  }

  async ensureValidToken(): Promise<string> {
    if (!this.accessToken || this.isTokenExpired()) {
      if (this.refreshToken) {
        await this.refreshAccessToken();
      } else {
        await this.authenticate();
      }
    }

    return this.accessToken!;
  }
}
